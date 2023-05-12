/**
 * @since 0.9.0
 */
import * as NodePath from 'node:path'

import * as Context from '@effect/data/Context'
import * as Either from '@effect/data/Either'
import { flow, pipe } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import * as ReadonlyRecord from '@effect/data/ReadonlyRecord'
// import * as Effect from '@effect/io/Effect'
import * as doctrine from 'doctrine'
import * as Apply from 'fp-ts/Apply'
import * as B from 'fp-ts/boolean'
import * as M from 'fp-ts/Monoid'
import * as Ord from 'fp-ts/Ord'
import { not, Predicate } from 'fp-ts/Predicate'
import * as RE from 'fp-ts/ReaderEither'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as Semigroup from 'fp-ts/Semigroup'
import * as S from 'fp-ts/string'
import * as T from 'fp-ts/Task'
import * as TaskEither from 'fp-ts/TaskEither'
import * as ast from 'ts-morph'

import * as _ from './internal'
import { File } from './internal'
import {
  Class,
  Constant,
  Documentable,
  Example,
  Export,
  Function,
  Interface,
  Method,
  Module,
  ordModule,
  Property,
  TypeAlias
} from './Module'

/**
 * @category service
 * @since 0.9.0
 */
export interface Parser {
  readonly path: RNEA.ReadonlyNonEmptyArray<string>
  readonly sourceFile: ast.SourceFile
}

/**
 * @category service
 * @since 0.9.0
 */
export const Parser = Context.Tag<Parser>()

/**
 * @category model
 * @since 0.9.0
 */
export interface ParserEnv {
  readonly config: _.Config
  readonly path: RNEA.ReadonlyNonEmptyArray<string>
  readonly sourceFile: ast.SourceFile
}

/**
 * @category model
 * @since 0.9.0
 */
export interface ParserEffect<A> extends RE.ReaderEither<ParserEnv, string, A> {}

interface Comment {
  readonly description: Option.Option<string>
  readonly tags: ReadonlyRecord.ReadonlyRecord<RNEA.ReadonlyNonEmptyArray<Option.Option<string>>>
}

interface CommentInfo {
  readonly description: Option.Option<string>
  readonly since: Option.Option<string>
  readonly deprecated: boolean
  readonly examples: ReadonlyArray<Example>
  readonly category: Option.Option<string>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

const CommentInfo = (
  description: Option.Option<string>,
  since: Option.Option<string>,
  deprecated: boolean,
  examples: ReadonlyArray<Example>,
  category: Option.Option<string>
): CommentInfo => ({
  description,
  since,
  deprecated,
  examples,
  category
})

// -------------------------------------------------------------------------------------
// parsers
// -------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

const semigroupError = pipe(S.Semigroup, Semigroup.intercalate('\n'))

const applicativeParser = RE.getApplicativeReaderValidation(semigroupError)

const sequenceS = Apply.sequenceS(applicativeParser)

const traverse = RA.traverse(applicativeParser)

const every =
  <A>(predicates: ReadonlyArray<Predicate<A>>) =>
  (a: A): boolean =>
    predicates.every((p) => p(a))

const some =
  <A>(predicates: ReadonlyArray<Predicate<A>>) =>
  (a: A): boolean =>
    predicates.some((p) => p(a))

const ordByName = pipe(
  S.Ord,
  Ord.contramap(({ name }: { name: string }) => name)
)

const sortModules = RA.sort(ordModule)

const isNonEmptyString = (s: string) => s.length > 0

/**
 * @internal
 */
export const stripImportTypes = (s: string): string => s.replace(/import\("((?!").)*"\)./g, '')

const getJSDocText: (jsdocs: ReadonlyArray<ast.JSDoc>) => string = RA.foldRight(
  () => '',
  (_, last) => last.getText()
)

const shouldIgnore: Predicate<Comment> = some([
  (comment) => pipe(comment.tags, ReadonlyRecord.get('internal'), Option.isSome),
  (comment) => pipe(comment.tags, ReadonlyRecord.get('ignore'), Option.isSome)
])

const isVariableDeclarationList = (
  u: ast.VariableDeclarationList | ast.CatchClause
): u is ast.VariableDeclarationList => u.getKind() === ast.ts.SyntaxKind.VariableDeclarationList

const isVariableStatement = (
  u: ast.VariableStatement | ast.ForStatement | ast.ForOfStatement | ast.ForInStatement
): u is ast.VariableStatement => u.getKind() === ast.ts.SyntaxKind.VariableStatement

// -------------------------------------------------------------------------------------
// comments
// -------------------------------------------------------------------------------------

const getSinceTag = (name: string, comment: Comment): ParserEffect<Option.Option<string>> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chainEitherK((env) =>
      pipe(
        comment.tags,
        ReadonlyRecord.get('since'),
        Option.flatMap(RNEA.head),
        Option.match(
          () =>
            env.config.enforceVersion
              ? Either.left(`Missing "@since" tag in ${env.path.join('/')}#${name} documentation`)
              : Either.right(Option.none()),
          (since) => Either.right(Option.some(since))
        )
      )
    )
  )

const getCategoryTag = (name: string, comment: Comment): ParserEffect<Option.Option<string>> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chainEitherK((env) =>
      pipe(
        comment.tags,
        ReadonlyRecord.get('category'),
        Option.flatMap(RNEA.head),
        Either.liftPredicate(
          not(every([Option.isNone, () => ReadonlyRecord.has(comment.tags, 'category')])),
          () => `Missing @category value in ${env.path.join('/')}#${name} documentation`
        )
      )
    )
  )

const getDescription = (name: string, comment: Comment): ParserEffect<Option.Option<string>> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chainEitherK((env) =>
      pipe(
        comment.description,
        Option.match(
          () =>
            env.config.enforceDescriptions
              ? Either.left(`Missing description in ${env.path.join('/')}#${name} documentation`)
              : Either.right(Option.none()),
          (description) => Either.right(Option.some(description))
        )
      )
    )
  )

const getExamples = (name: string, comment: Comment, isModule: boolean): ParserEffect<ReadonlyArray<string>> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chainEitherK((env) =>
      pipe(
        comment.tags,
        ReadonlyRecord.get('example'),
        Option.map(RA.compact),
        Option.match(
          () =>
            M.concatAll(B.MonoidAll)([env.config.enforceExamples, !isModule])
              ? Either.left(`Missing examples in ${env.path.join('/')}#${name} documentation`)
              : Either.right(RA.empty),
          (examples) =>
            M.concatAll(B.MonoidAll)([env.config.enforceExamples, RA.isEmpty(examples), !isModule])
              ? Either.left(`Missing examples in ${env.path.join('/')}#${name} documentation`)
              : Either.right(examples)
        )
      )
    )
  )

/**
 * @internal
 */
export const getCommentInfo =
  (name: string, isModule = false) =>
  (text: string): ParserEffect<CommentInfo> =>
    pipe(
      RE.right<ParserEnv, string, Comment>(parseComment(text)),
      RE.bindTo('comment'),
      RE.bind('since', ({ comment }) => getSinceTag(name, comment)),
      RE.bind('category', ({ comment }) => getCategoryTag(name, comment)),
      RE.bind('description', ({ comment }) => getDescription(name, comment)),
      RE.bind('examples', ({ comment }) => getExamples(name, comment, isModule)),
      RE.bind('deprecated', ({ comment }) =>
        RE.right(pipe(comment.tags, ReadonlyRecord.get('deprecated'), Option.isSome))
      ),
      RE.map(({ category, deprecated, description, examples, since }) => {
        return CommentInfo(description, since, deprecated, examples, category)
      })
    )

/**
 * @internal
 */
export const parseComment = (text: string): Comment => {
  const annotation: doctrine.Annotation = doctrine.parse(text, { unwrap: true })
  const tags = pipe(
    annotation.tags,
    RNEA.groupBy((tag) => tag.title),
    ReadonlyRecord.map(RNEA.map((tag) => pipe(Option.fromNullable(tag.description), Option.filter(isNonEmptyString))))
  )
  const description = pipe(Option.fromNullable(annotation.description), Option.filter(isNonEmptyString))
  return { description, tags }
}

// -------------------------------------------------------------------------------------
// interfaces
// -------------------------------------------------------------------------------------

const parseInterfaceDeclaration = (id: ast.InterfaceDeclaration): ParserEffect<Interface> =>
  pipe(
    getJSDocText(id.getJsDocs()),
    getCommentInfo(id.getName()),
    RE.map((info) =>
      Interface(
        Documentable(id.getName(), info.description, info.since, info.deprecated, info.examples, info.category),
        id.getText()
      )
    )
  )

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseInterfaces: ParserEffect<ReadonlyArray<Interface>> = pipe(
  RE.asks<ParserEnv, ReadonlyArray<ast.InterfaceDeclaration>, string>((env) =>
    pipe(
      env.sourceFile.getInterfaces(),
      RA.filter(
        every([
          (id) => id.isExported(),
          (id) => pipe(id.getJsDocs(), not(flow(getJSDocText, parseComment, shouldIgnore)))
        ])
      )
    )
  ),
  RE.flatMap(flow(traverse(parseInterfaceDeclaration), RE.map(RA.sort(ordByName))))
)

// -------------------------------------------------------------------------------------
// functions
// -------------------------------------------------------------------------------------

const getFunctionDeclarationSignature = (f: ast.FunctionDeclaration): string => {
  const text = f.getText()
  return pipe(
    Option.fromNullable(f.compilerNode.body),
    Option.match(
      () => text.replace('export function ', 'export declare function '),
      (body) => {
        const end = body.getStart() - f.getStart() - 1
        return text.substring(0, end).replace('export function ', 'export declare function ')
      }
    )
  )
}

const getFunctionDeclarationJSDocs = (fd: ast.FunctionDeclaration): ReadonlyArray<ast.JSDoc> =>
  pipe(
    fd.getOverloads(),
    RA.foldLeft(
      () => fd.getJsDocs(),
      (firstOverload) => firstOverload.getJsDocs()
    )
  )

const parseFunctionDeclaration = (fd: ast.FunctionDeclaration): ParserEffect<Function> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chain<ParserEnv, string, ParserEnv, string>((env) =>
      pipe(
        Option.fromNullable(fd.getName()),
        Option.flatMap(Option.liftPredicate((name) => name.length > 0)),
        RE.fromOption(() => `Missing function name in module ${env.path.join('/')}`)
      )
    ),
    RE.flatMap((name) =>
      pipe(
        getJSDocText(getFunctionDeclarationJSDocs(fd)),
        getCommentInfo(name),
        RE.map((info) => {
          const signatures = pipe(
            fd.getOverloads(),
            RA.foldRight(
              () => RA.of(getFunctionDeclarationSignature(fd)),
              (init, last) =>
                pipe(init.map(getFunctionDeclarationSignature), RA.append(getFunctionDeclarationSignature(last)))
            )
          )
          return Function(
            Documentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
            signatures
          )
        })
      )
    )
  )

const parseFunctionVariableDeclaration = (vd: ast.VariableDeclaration): ParserEffect<Function> => {
  const vs: any = vd.getParent().getParent()
  const name = vd.getName()
  return pipe(
    getJSDocText(vs.getJsDocs()),
    getCommentInfo(name),
    RE.map((info) => {
      const signature = `export declare const ${name}: ${stripImportTypes(vd.getType().getText(vd))}`
      return Function(
        Documentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        RA.of(signature)
      )
    })
  )
}

const getFunctionDeclarations: RE.ReaderEither<
  ParserEnv,
  string,
  {
    functions: ReadonlyArray<ast.FunctionDeclaration>
    arrows: ReadonlyArray<ast.VariableDeclaration>
  }
> = RE.asks((env) => ({
  functions: pipe(
    env.sourceFile.getFunctions(),
    RA.filter(
      every([
        (fd) => fd.isExported(),
        not(flow(getFunctionDeclarationJSDocs, getJSDocText, parseComment, shouldIgnore))
      ])
    )
  ),
  arrows: pipe(
    env.sourceFile.getVariableDeclarations(),
    RA.filter(
      every([
        (vd) => isVariableDeclarationList(vd.getParent()),
        (vd) => isVariableStatement(vd.getParent().getParent() as any),
        (vd) =>
          pipe(
            vd.getInitializer(),
            every([
              flow(
                Option.fromNullable,
                Option.flatMap(Option.liftPredicate(ast.Node.isFunctionLikeDeclaration)),
                Option.isSome
              ),
              () =>
                pipe(
                  (vd.getParent().getParent() as ast.VariableStatement).getJsDocs(),
                  not(flow(getJSDocText, parseComment, shouldIgnore))
                ),
              () => (vd.getParent().getParent() as ast.VariableStatement).isExported()
            ])
          )
      ])
    )
  )
}))

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseFunctions: ParserEffect<ReadonlyArray<Function>> = pipe(
  getFunctionDeclarations,
  RE.flatMap(({ arrows, functions }) =>
    sequenceS({
      functionDeclarations: pipe(functions, traverse(parseFunctionDeclaration)),
      variableDeclarations: pipe(arrows, traverse(parseFunctionVariableDeclaration))
    })
  ),
  RE.map(({ functionDeclarations, variableDeclarations }) =>
    RA.getMonoid<Function>().concat(functionDeclarations, variableDeclarations)
  )
)

// -------------------------------------------------------------------------------------
// type aliases
// -------------------------------------------------------------------------------------

const parseTypeAliasDeclaration = (ta: ast.TypeAliasDeclaration): ParserEffect<TypeAlias> =>
  pipe(
    RE.of<ParserEnv, string, string>(ta.getName()),
    RE.flatMap((name) =>
      pipe(
        getJSDocText(ta.getJsDocs()),
        getCommentInfo(name),
        RE.map((info) =>
          TypeAlias(
            Documentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
            ta.getText()
          )
        )
      )
    )
  )

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseTypeAliases: ParserEffect<ReadonlyArray<TypeAlias>> = pipe(
  RE.asks((env: ParserEnv) =>
    pipe(
      env.sourceFile.getTypeAliases(),
      RA.filter(
        every([
          (alias) => alias.isExported(),
          (alias) => pipe(alias.getJsDocs(), not(flow(getJSDocText, parseComment, shouldIgnore)))
        ])
      )
    )
  ),
  RE.flatMap(traverse(parseTypeAliasDeclaration)),
  RE.map(RA.sort(ordByName))
)

// -------------------------------------------------------------------------------------
// constants
// -------------------------------------------------------------------------------------

const parseConstantVariableDeclaration = (vd: ast.VariableDeclaration): ParserEffect<Constant> => {
  const vs: any = vd.getParent().getParent()
  const name = vd.getName()
  return pipe(
    getJSDocText(vs.getJsDocs()),
    getCommentInfo(name),
    RE.map((info) => {
      const type = stripImportTypes(vd.getType().getText(vd))
      const signature = `export declare const ${name}: ${type}`
      return Constant(
        Documentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        signature
      )
    })
  )
}

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseConstants: ParserEffect<ReadonlyArray<Constant>> = pipe(
  RE.asks((env: ParserEnv) =>
    pipe(
      env.sourceFile.getVariableDeclarations(),
      RA.filter(
        every([
          (vd) => isVariableDeclarationList(vd.getParent()),
          (vd) => isVariableStatement(vd.getParent().getParent() as any),
          (vd) =>
            pipe(
              vd.getInitializer(),
              every([
                flow(
                  Option.fromNullable,
                  Option.flatMap(Option.liftPredicate(not(ast.Node.isFunctionLikeDeclaration))),
                  Option.isSome
                ),
                () =>
                  pipe(
                    (vd.getParent().getParent() as ast.VariableStatement).getJsDocs(),
                    not(flow(getJSDocText, parseComment, shouldIgnore))
                  ),
                () => (vd.getParent().getParent() as ast.VariableStatement).isExported()
              ])
            )
        ])
      )
    )
  ),
  RE.flatMap(traverse(parseConstantVariableDeclaration))
)

// -------------------------------------------------------------------------------------
// exports
// -------------------------------------------------------------------------------------

const parseExportSpecifier = (es: ast.ExportSpecifier): ParserEffect<Export> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.flatMap((env) =>
      pipe(
        RE.of<ParserEnv, string, string>(es.compilerNode.name.text),
        RE.bindTo('name'),
        RE.bind('type', () => RE.of(stripImportTypes(es.getType().getText(es)))),
        RE.bind('signature', ({ name, type }) => RE.of(`export declare const ${name}: ${type}`)),
        RE.flatMap(({ name, signature }) =>
          pipe(
            es.getLeadingCommentRanges(),
            RA.head,
            RE.fromOption(() => `Missing ${name} documentation in ${env.path.join('/')}`),
            RE.flatMap((commentRange) => pipe(commentRange.getText(), getCommentInfo(name))),
            RE.map((info) =>
              Export(
                Documentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
                signature
              )
            )
          )
        )
      )
    )
  )

const parseExportDeclaration = (ed: ast.ExportDeclaration): ParserEffect<ReadonlyArray<Export>> =>
  pipe(ed.getNamedExports(), traverse(parseExportSpecifier))

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseExports: ParserEffect<ReadonlyArray<Export>> = pipe(
  RE.asks((env: ParserEnv) => env.sourceFile.getExportDeclarations()),
  RE.flatMap(traverse(parseExportDeclaration)),
  RE.map(RA.flatten)
)

// -------------------------------------------------------------------------------------
// classes
// -------------------------------------------------------------------------------------

const getTypeParameters = (tps: ReadonlyArray<ast.TypeParameterDeclaration>): string =>
  tps.length === 0 ? '' : `<${tps.map((p) => p.getName()).join(', ')}>`

const getMethodSignature = (md: ast.MethodDeclaration): string =>
  pipe(
    Option.fromNullable(md.compilerNode.body),
    Option.match(
      () => md.getText(),
      (body) => {
        const end = body.getStart() - md.getStart() - 1
        return md.getText().substring(0, end)
      }
    )
  )

const parseMethod = (md: ast.MethodDeclaration): ParserEffect<Option.Option<Method>> =>
  pipe(
    RE.of<ParserEnv, string, string>(md.getName()),
    RE.bindTo('name'),
    RE.bind('overloads', () => RE.of(md.getOverloads())),
    RE.bind('jsdocs', ({ overloads }) =>
      RE.of(
        pipe(
          overloads,
          RA.foldLeft(
            () => md.getJsDocs(),
            (x) => x.getJsDocs()
          )
        )
      )
    ),
    RE.flatMap(({ jsdocs, overloads, name }) =>
      shouldIgnore(parseComment(getJSDocText(jsdocs)))
        ? RE.right(Option.none())
        : pipe(
            getJSDocText(jsdocs),
            getCommentInfo(name),
            RE.map((info) => {
              const signatures = pipe(
                overloads,
                RA.foldRight(
                  () => RA.of(getMethodSignature(md)),
                  (init, last) =>
                    pipe(
                      init.map((md) => md.getText()),
                      RA.append(getMethodSignature(last))
                    )
                )
              )
              return Option.some(
                Method(
                  Documentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
                  signatures
                )
              )
            })
          )
    )
  )

const parseProperty =
  (classname: string) =>
  (pd: ast.PropertyDeclaration): ParserEffect<Property> => {
    const name = pd.getName()
    return pipe(
      getJSDocText(pd.getJsDocs()),
      getCommentInfo(`${classname}#${name}`),
      RE.map((info) => {
        const type = stripImportTypes(pd.getType().getText(pd))
        const readonly = pipe(
          Option.fromNullable(pd.getFirstModifierByKind(ast.ts.SyntaxKind.ReadonlyKeyword)),
          Option.match(
            () => '',
            () => 'readonly '
          )
        )
        const signature = `${readonly}${name}: ${type}`
        return Property(
          Documentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
          signature
        )
      })
    )
  }

const parseProperties = (name: string, c: ast.ClassDeclaration): ParserEffect<ReadonlyArray<Property>> =>
  pipe(
    c.getProperties(),
    // take public, instance properties
    RA.filter(
      every([
        (prop) => !prop.isStatic(),
        (prop) =>
          pipe(prop.getFirstModifierByKind(ast.ts.SyntaxKind.PrivateKeyword), Option.fromNullable, Option.isNone),
        (prop) => pipe(prop.getJsDocs(), not(flow(getJSDocText, parseComment, shouldIgnore)))
      ])
    ),
    traverse(parseProperty(name))
  )

/**
 * @internal
 */
export const getConstructorDeclarationSignature = (c: ast.ConstructorDeclaration): string =>
  pipe(
    Option.fromNullable(c.compilerNode.body),
    Option.match(
      () => c.getText(),
      (body) => {
        const end = body.getStart() - c.getStart() - 1
        return c.getText().substring(0, end)
      }
    )
  )

const getClassName = (c: ast.ClassDeclaration): ParserEffect<string> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chain<ParserEnv, string, ParserEnv, string>((env) =>
      pipe(
        Option.fromNullable(c.getName()),
        RE.fromOption(() => `Missing class name in module ${env.path.join('/')}`)
      )
    )
  )

const getClassCommentInfo = (name: string, c: ast.ClassDeclaration): ParserEffect<CommentInfo> =>
  pipe(c.getJsDocs(), getJSDocText, getCommentInfo(name))

const getClassDeclarationSignature = (name: string, c: ast.ClassDeclaration): ParserEffect<string> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.map(() => getTypeParameters(c.getTypeParameters())),
    RE.map((typeParameters) =>
      pipe(
        c.getConstructors(),
        RA.foldLeft(
          () => `export declare class ${name}${typeParameters}`,
          (head) => `export declare class ${name}${typeParameters} { ${getConstructorDeclarationSignature(head)} }`
        )
      )
    )
  )

const parseClass = (c: ast.ClassDeclaration): ParserEffect<Class> =>
  pipe(
    getClassName(c),
    RE.bindTo('name'),
    RE.bind('info', ({ name }) => getClassCommentInfo(name, c)),
    RE.bind('signature', ({ name }) => getClassDeclarationSignature(name, c)),
    RE.bind('methods', () => pipe(c.getInstanceMethods(), traverse(parseMethod), RE.map(RA.compact))),
    RE.bind('staticMethods', () => pipe(c.getStaticMethods(), traverse(parseMethod), RE.map(RA.compact))),
    RE.bind('properties', ({ name }) => parseProperties(name, c)),
    RE.map(({ methods, staticMethods, properties, info, name, signature }) =>
      Class(
        Documentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        signature,
        methods,
        staticMethods,
        properties
      )
    )
  )

const getClasses: ParserEffect<ReadonlyArray<ast.ClassDeclaration>> = RE.asks((env: ParserEnv) =>
  pipe(
    env.sourceFile.getClasses(),
    RA.filter((c) => c.isExported())
  )
)

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseClasses: ParserEffect<ReadonlyArray<Class>> = pipe(
  getClasses,
  RE.flatMap(traverse(parseClass)),
  RE.map(RA.sort(ordByName))
)

// -------------------------------------------------------------------------------------
// modules
// -------------------------------------------------------------------------------------

const getModuleName = (path: RNEA.ReadonlyNonEmptyArray<string>): string => NodePath.parse(RNEA.last(path)).name

/**
 * @internal
 */
export const parseModuleDocumentation: ParserEffect<Documentable> = pipe(
  RE.ask<ParserEnv>(),
  RE.chainEitherK((env) => {
    const name = getModuleName(env.path)
    // if any of the settings enforcing documentation are set to `true`, then
    // a module should have associated documentation
    const isDocumentationRequired = M.concatAll(B.MonoidAny)([
      env.config.enforceDescriptions,
      env.config.enforceVersion
    ])
    const onMissingDocumentation = () =>
      isDocumentationRequired
        ? Either.left(`Missing documentation in ${env.path.join('/')} module`)
        : Either.right(Documentable(name, Option.none(), Option.none(), false, RA.empty, Option.none()))
    return pipe(
      env.sourceFile.getStatements(),
      RA.foldLeft(onMissingDocumentation, (statement) =>
        pipe(
          statement.getLeadingCommentRanges(),
          RA.foldLeft(onMissingDocumentation, (commentRange) =>
            pipe(
              getCommentInfo(name, true)(commentRange.getText())(env),
              // TODO
              (e): Either.Either<string, CommentInfo> =>
                e._tag === 'Left' ? Either.left(e.left) : Either.right(e.right),
              Either.map((info) =>
                Documentable(name, info.description, info.since, info.deprecated, info.examples, info.category)
              )
            )
          )
        )
      )
    )
  })
)

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseModule: ParserEffect<Module> = pipe(
  RE.ask<ParserEnv>(),
  RE.flatMap((env) =>
    pipe(
      parseModuleDocumentation,
      RE.bindTo('documentation'),
      RE.bind('interfaces', () => parseInterfaces),
      RE.bind('functions', () => parseFunctions),
      RE.bind('typeAliases', () => parseTypeAliases),
      RE.bind('classes', () => parseClasses),
      RE.bind('constants', () => parseConstants),
      RE.bind('exports', () => parseExports),
      RE.map(({ documentation, classes, interfaces, functions, typeAliases, constants, exports }) =>
        Module(documentation, env.path, classes, interfaces, functions, typeAliases, constants, exports)
      )
    )
  )
)

// -------------------------------------------------------------------------------------
// files
// -------------------------------------------------------------------------------------

/**
 * @internal
 */
export const parseFile =
  (project: ast.Project) =>
  (file: File): RTE.ReaderTaskEither<_.Config, string, Module> =>
    pipe(
      RTE.ask<_.Config>(),
      RTE.flatMap((config) =>
        pipe(
          RTE.right<_.Config, string, RNEA.ReadonlyNonEmptyArray<string>>(file.path.split(NodePath.sep) as any),
          RTE.bindTo('path'),
          RTE.bind(
            'sourceFile',
            (): RTE.ReaderTaskEither<_.Config, string, ast.SourceFile> =>
              pipe(
                Option.fromNullable(project.getSourceFile(file.path)),
                RTE.fromOption(() => `Unable to locate file: ${file.path}`)
              )
          ),
          RTE.chainEitherK((menv) => parseModule({ config, ...menv }))
        )
      )
    )

const createProject =
  (files: ReadonlyArray<File>): RTE.ReaderTaskEither<_.Config, string, ast.Project> =>
  (config) => {
    const options: ast.ProjectOptions = {
      compilerOptions: {
        strict: true,
        ...config.parseCompilerOptions
      }
    }
    const project = new ast.Project(options)
    for (const file of files) {
      project.addSourceFileAtPath(file.path)
    }
    return TaskEither.of(project)
  }

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseFiles = (files: ReadonlyArray<File>): RTE.ReaderTaskEither<_.Config, string, ReadonlyArray<Module>> =>
  pipe(
    createProject(files),
    RTE.flatMap((project) =>
      pipe(
        files,
        RA.traverse(RTE.getApplicativeReaderTaskValidation(T.ApplyPar, semigroupError))(parseFile(project)),
        RTE.map(
          flow(
            RA.filter((module) => !module.deprecated),
            sortModules
          )
        )
      )
    )
  )
