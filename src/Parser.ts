/**
 * @since 0.6.0
 */
import * as Apply from 'fp-ts/Apply'
import * as E from 'fp-ts/Either'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
import * as RA from 'fp-ts/ReadonlyArray'
import * as R from 'fp-ts/Reader'
import * as RE from 'fp-ts/ReaderEither'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as RR from 'fp-ts/ReadonlyRecord'
import * as S from 'fp-ts/Semigroup'
import { flow, not, pipe, Endomorphism, Predicate } from 'fp-ts/function'
import * as ast from 'typescript'
import * as doctrine from 'doctrine'
import * as Path from 'path'

import { Environment } from './Core'
import { File } from './FileSystem'
import {
  ordModule,
  Class,
  Constant,
  Documentable,
  Example,
  Export,
  Function,
  Interface,
  Method,
  Module,
  Property,
  TypeAlias
} from './Module'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.6.0
 */
export interface Parser<A> extends RE.ReaderEither<ParserEnv, string, A> {}

/**
 * @category model
 * @since 0.6.0
 */
export interface ParserEnv extends Environment {
  readonly path: RNEA.ReadonlyNonEmptyArray<string>
  readonly sourceFile: ast.SourceFile
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Ast {
  readonly project: ast.Program
  readonly addFile: (file: File) => R.Reader<ast.Program, void>
}

interface Comment {
  readonly description: O.Option<string>
  readonly tags: RR.ReadonlyRecord<string, RNEA.ReadonlyNonEmptyArray<O.Option<string>>>
}

interface CommentInfo {
  readonly description: O.Option<string>
  readonly since: O.Option<string>
  readonly deprecated: boolean
  readonly examples: ReadonlyArray<Example>
  readonly category: O.Option<string>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

const CommentInfo = (
  description: O.Option<string>,
  since: O.Option<string>,
  deprecated: boolean,
  examples: ReadonlyArray<Example>,
  category: O.Option<string>
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

const semigroupError = pipe(S.semigroupString, S.getIntercalateSemigroup('\n'))

const applicativeParser = RE.getReaderValidation(semigroupError)

const sequenceS = Apply.sequenceS(applicativeParser)

const traverse = RA.traverse(applicativeParser)

const every = <A>(predicates: ReadonlyArray<Predicate<A>>): ((a: A) => boolean) =>
  M.fold(M.getFunctionMonoid(M.monoidAll)<A>())(predicates)

const some = <A>(predicates: ReadonlyArray<Predicate<A>>): ((a: A) => boolean) =>
  M.fold(M.getFunctionMonoid(M.monoidAny)<A>())(predicates)

const ordByName = pipe(
  Ord.ordString,
  Ord.contramap(({ name }: { name: string }) => name)
)

const sortModules = RA.sort(ordModule)

const isNonEmptyString = (s: string) => s.length > 0

/**
 * @internal
 */
export const stripImportTypes: Endomorphism<string> = (s) => s.replace(/import\("((?!").)*"\)./g, '')

const getJSDocText: (jsdocs: ReadonlyArray<ast.JSDoc>) => string = RA.foldRight(
  () => '',
  (_, last) => last.getText()
)

const shouldIgnore: Predicate<Comment> = some([
  (comment) => pipe(comment.tags, RR.lookup('internal'), O.isSome),
  (comment) => pipe(comment.tags, RR.lookup('ignore'), O.isSome)
])

const isVariableDeclarationList = (
  u: ast.VariableDeclarationList | ast.CatchClause
): u is ast.VariableDeclarationList => u.kind === ast.SyntaxKind.VariableDeclarationList

const isVariableStatement = (
  u: ast.VariableStatement | ast.ForStatement | ast.ForOfStatement | ast.ForInStatement
): u is ast.VariableStatement => u.kind === ast.SyntaxKind.VariableStatement

/**
 * @internal
 */
export const addFileToProject = (file: File) => (project: ast.Program) => project.addSourceFileAtPath(file.path)

// -------------------------------------------------------------------------------------
// comments
// -------------------------------------------------------------------------------------

const getSinceTag = (name: string, comment: Comment): Parser<O.Option<string>> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chainEitherK((env) =>
      pipe(
        comment.tags,
        RR.lookup('since'),
        O.chain(RNEA.head),
        O.fold(
          () =>
            env.settings.enforceVersion
              ? E.left(`Missing @since tag in ${env.path.join('/')}#${name} documentation`)
              : E.right(O.none),
          (since) => E.right(O.some(since))
        )
      )
    )
  )

const getCategoryTag = (name: string, comment: Comment): Parser<O.Option<string>> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chainEitherK((env) =>
      pipe(
        comment.tags,
        RR.lookup('category'),
        O.chain(RNEA.head),
        E.fromPredicate(
          not(every([O.isNone, () => RR.hasOwnProperty('category', comment.tags)])),
          () => `Missing @category value in ${env.path.join('/')}#${name} documentation`
        )
      )
    )
  )

const getDescription = (name: string, comment: Comment): Parser<O.Option<string>> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chainEitherK((env) =>
      pipe(
        comment.description,
        O.fold(
          () =>
            env.settings.enforceDescriptions
              ? E.left(`Missing description in ${env.path.join('/')}#${name} documentation`)
              : E.right(O.none),
          (description) => E.right(O.some(description))
        )
      )
    )
  )

const getExamples = (name: string, comment: Comment, isModule: boolean): Parser<ReadonlyArray<string>> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chainEitherK((env) =>
      pipe(
        comment.tags,
        RR.lookup('example'),
        O.map(RA.compact),
        O.fold(
          () =>
            M.fold(M.monoidAll)([env.settings.enforceExamples, !isModule])
              ? E.left(`Missing examples in ${env.path.join('/')}#${name} documentation`)
              : E.right<never, ReadonlyArray<string>>(RA.empty),
          (examples) =>
            M.fold(M.monoidAll)([env.settings.enforceExamples, RA.isEmpty(examples), !isModule])
              ? E.left(`Missing examples in ${env.path.join('/')}#${name} documentation`)
              : E.right(examples)
        )
      )
    )
  )

/**
 * @internal
 */
export const getCommentInfo = (name: string, isModule = false) => (text: string): Parser<CommentInfo> =>
  pipe(
    RE.right<ParserEnv, string, Comment>(parseComment(text)),
    RE.bindTo('comment'),
    RE.bind('since', ({ comment }) => getSinceTag(name, comment)),
    RE.bind('category', ({ comment }) => getCategoryTag(name, comment)),
    RE.bind('description', ({ comment }) => getDescription(name, comment)),
    RE.bind('examples', ({ comment }) => getExamples(name, comment, isModule)),
    RE.bind('deprecated', ({ comment }) => RE.right(pipe(comment.tags, RR.lookup('deprecated'), O.isSome))),
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
    RR.map(RNEA.map((tag) => pipe(O.fromNullable(tag.description), O.filter(isNonEmptyString))))
  )
  const description = pipe(O.fromNullable(annotation.description), O.filter(isNonEmptyString))
  return { description, tags }
}

const getJsDocs = (id: ast.Node) => pipe(id.getChildren(), RA.filter(ast.isJSDoc))

// -------------------------------------------------------------------------------------
// interfaces
// -------------------------------------------------------------------------------------

const parseInterfaceDeclaration = (id: ast.InterfaceDeclaration): Parser<Interface> =>
  pipe(
    getJSDocText(getJsDocs(id)),
    getCommentInfo(id.name.text),
    RE.map((info) =>
      Interface(
        Documentable(id.name.text, info.description, info.since, info.deprecated, info.examples, info.category),
        id.getText()
      )
    )
  )

export const isExported = <N extends ast.Node>(node: N) =>
        pipe(
          node.modifiers,
          O.fromNullable,
          O.map(RA.foldMap(M.monoidAny)((ma) => ma.kind === ast.SyntaxKind.ExportKeyword)),
          O.getOrElse((): boolean => false)
        )

/**
 * @category parsers
 * @since 0.6.0
 */
export const parseInterfaces: Parser<ReadonlyArray<Interface>> = pipe(
  RE.asks<ParserEnv, string, ReadonlyArray<ast.InterfaceDeclaration>>((env) =>
    pipe(env.sourceFile.getChildren(), RA.filter(ast.isInterfaceDeclaration), RA.filter(isExported))
  ),
  RE.chain(flow(traverse(parseInterfaceDeclaration), RE.map(RA.sort(ordByName))))
)

// -------------------------------------------------------------------------------------
// functions
// -------------------------------------------------------------------------------------

const getFunctionDeclarationSignature = (f: ast.FunctionDeclaration): string => {
  const text = f.getText()
  return pipe(
    O.fromNullable(f.body),
    O.fold(
      () => text.replace('export function ', 'export declare function '),
      (body) => {
        const end = body.getStart() - f.getStart() - 1
        return text.substring(0, end).replace('export function ', 'export declare function ')
      }
    )
  )
}

const getFunctionDeclarationOverloads = (fd: ast.FunctionDeclaration): ReadonlyArray<ast.FunctionDeclaration> =>
  pipe(
    fd.parent.getChildren(),
    RA.filter(ast.isFunctionDeclaration),
    // not the best equality check. {node,fd}.id could be used instead and is internally used.
    RA.filter((node) => node.pos !== fd.pos)
  )

const getFunctionDeclarationJSDocs = (fd: ast.FunctionDeclaration): ReadonlyArray<ast.JSDoc> =>
  pipe(
    getFunctionDeclarationOverloads(fd),
    RA.foldLeft(() => getJsDocs(fd), getJsDocs)
  )

const parseFunctionDeclaration = (fd: ast.FunctionDeclaration): Parser<Function> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chain<ParserEnv, string, ParserEnv, string>((env) =>
      pipe(
        O.fromNullable(fd.name),
        O.map((name) => name.getText()),
        O.chain(O.fromPredicate((name) => name.length > 0)),
        RE.fromOption(() => `Missing function name in module ${env.path.join('/')}`)
      )
    ),
    RE.chain((name) =>
      pipe(
        getJSDocText(getFunctionDeclarationJSDocs(fd)),
        getCommentInfo(name),
        RE.map((info) => {
          const signatures = pipe(
            getFunctionDeclarationOverloads(fd),
            RA.foldRight(
              () => RA.of(getFunctionDeclarationSignature(fd)),
              (init, last) => RA.snoc(init.map(getFunctionDeclarationSignature), getFunctionDeclarationSignature(last))
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

const parseFunctionVariableDeclaration = (vd: ast.VariableDeclaration): Parser<Function> => {
  const vs = vd.parent.parent
  const name = vd.name.getText()
  return pipe(
    getJSDocText(getJsDocs(vs)),
    getCommentInfo(name),
    RE.map((info) => {
      const signature = `export declare const ${name}: ${stripImportTypes(vd.type?.getText(vd as any) as string)}`
      return Function(
        Documentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        RA.of(signature)
      )
    })
  )
}

const getFunctions = (sourceFile: ast.SourceFile) =>
  pipe(sourceFile.getChildren(), RA.filter(ast.isFunctionDeclaration))

const getVariableDeclarations = (soureceFile: ast.SourceFile) =>
  pipe(soureceFile.getChildren(), RA.filter(ast.isVariableDeclaration))

const getFunctionDeclarations: RE.ReaderEither<
  ParserEnv,
  string,
  {
    functions: ReadonlyArray<ast.FunctionDeclaration>
    arrows: ReadonlyArray<ast.VariableDeclaration>
  }
> = RE.asks((env) => ({
  functions: pipe(
    getFunctions(env.sourceFile),
    RA.filter(every([isExported, not(flow(getFunctionDeclarationJSDocs, getJSDocText, parseComment, shouldIgnore))]))
  ),
  arrows: pipe(
    getVariableDeclarations(env.sourceFile),
    RA.filter(
      every([
        (vd) => isVariableDeclarationList(vd.parent),
        (vd) => isVariableStatement(vd.parent.parent as any),
        (vd) =>
          pipe(
            vd.initializer,
            every([
              flow(O.fromNullable, O.chain(O.fromPredicate(ast.isFunctionLike)), O.isSome),
              () =>
                pipe(
                  getJsDocs(vd.parent.parent as ast.VariableStatement),
                  not(flow(getJSDocText, parseComment, shouldIgnore))
                ),
              () => isExported(vd.parent.parent as ast.VariableStatement)
            ])
          )
      ])
    )
  )
}))

/**
 * @category parsers
 * @since 0.6.0
 */
export const parseFunctions: Parser<ReadonlyArray<Function>> = pipe(
  getFunctionDeclarations,
  RE.chain(({ arrows, functions }) =>
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

const parseTypeAliasDeclaration = (ta: ast.TypeAliasDeclaration): Parser<TypeAlias> =>
  pipe(
    RE.of<ParserEnv, string, string>(ta.name.text),
    RE.chain((name) =>
      pipe(
        getJSDocText(getJsDocs(ta)),
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

const children = <R extends ast.Node>(node: R) => RA.fromArray(node.getChildren())

const getTypeAliases = (sourceFile: ast.SourceFile) => pipe(sourceFile, children, RA.filter(ast.isTypeAliasDeclaration))

/**
 * @category parsers
 * @since 0.6.0
 */
export const parseTypeAliases: Parser<ReadonlyArray<TypeAlias>> = pipe(
  RE.asks((env: ParserEnv) =>
    pipe(
      getTypeAliases(env.sourceFile),
      RA.filter(every([isExported, flow(getJsDocs, not(flow(getJSDocText, parseComment, shouldIgnore)))]))
    )
  ),
  RE.chain(traverse(parseTypeAliasDeclaration)),
  RE.map(RA.sort(ordByName))
)

// -------------------------------------------------------------------------------------
// constants
// -------------------------------------------------------------------------------------

const parseConstantVariableDeclaration = (vd: ast.VariableDeclaration): Parser<Constant> => {
  const vs: any = vd.parent.parent
  const name = vd.name.getText()
  return pipe(
    getJSDocText(getJsDocs(vs)),
    getCommentInfo(name),
    RE.map((info) => {
      const type = stripImportTypes(vd.type?.getText(vd as any) as string)
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
 * @since 0.6.0
 */
export const parseConstants: Parser<ReadonlyArray<Constant>> = pipe(
  RE.asks((env: ParserEnv) =>
    pipe(
      getVariableDeclarations(env.sourceFile),
      RA.filter(
        every([
          (vd) => isVariableDeclarationList(vd.parent),
          (vd) => isVariableStatement(vd.parent.parent as any),
          (vd) =>
            pipe(
              vd.initializer,
              every([
                flow(O.fromNullable, O.chain(O.fromPredicate(not(ast.isFunctionLike))), O.isSome),
                () =>
                  pipe(
                    getJsDocs(vd.parent.parent as ast.VariableStatement),
                    not(flow(getJSDocText, parseComment, shouldIgnore))
                  ),
                () => isExported(vd.parent.parent as ast.VariableStatement)
              ])
            )
        ])
      )
    )
  ),
  RE.chain(traverse(parseConstantVariableDeclaration))
)

// -------------------------------------------------------------------------------------
// exports
// -------------------------------------------------------------------------------------

const parseExportSpecifier = (es: ast.ExportSpecifier): Parser<Export> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chain((env) =>
      pipe(
        RE.of<ParserEnv, string, string>(es.compilerNode.name.text),
        RE.bindTo('name'),
        RE.bind('type', () => RE.of(stripImportTypes(es.getType().getText(es)))),
        RE.bind('signature', ({ name, type }) => RE.of(`export declare const ${name}: ${type}`)),
        RE.chain(({ name, signature }) =>
          pipe(
            es.getLeadingCommentRanges(),
            RA.head,
            RE.fromOption(() => `Missing ${name} documentation in ${env.path.join('/')}`),
            RE.chain((commentRange) => pipe(commentRange.getText(), getCommentInfo(name))),
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

const parseExportDeclaration = (ed: ast.ExportDeclaration): Parser<ReadonlyArray<Export>> =>
  pipe(
    ed,
    children,
    RA.filter(ast.isNamedExports),
    RA.chain((node) => node.elements),
    traverse(parseExportSpecifier)
  )

const getExportDeclarations = (sourceFile: ast.SourceFile) =>
  pipe(sourceFile, children, RA.filter(ast.isExportDeclaration))

/**
 * @category parsers
 * @since 0.6.0
 */
export const parseExports: Parser<ReadonlyArray<Export>> = pipe(
  RE.asks((env: ParserEnv) => getExportDeclarations(env.sourceFile)),
  RE.chain(traverse(parseExportDeclaration)),
  RE.map(RA.flatten)
)

// -------------------------------------------------------------------------------------
// classes
// -------------------------------------------------------------------------------------

const getTypeParameters = (tps: ReadonlyArray<ast.TypeParameterDeclaration>): string =>
  tps.length === 0 ? '' : `<${tps.map((p) => p.name.text).join(', ')}>`

const getMethodSignature = (md: ast.MethodDeclaration): string =>
  pipe(
    O.fromNullable(md.body),
    O.fold(
      () => md.getText(),
      (body) => {
        const end = body.getStart() - md.getStart() - 1
        return md.getText().substring(0, end)
      }
    )
  )

const parseMethod = (md: ast.MethodDeclaration): Parser<O.Option<Method>> =>
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
    RE.chain(({ jsdocs, overloads, name }) =>
      shouldIgnore(parseComment(getJSDocText(jsdocs)))
        ? RE.right(O.none)
        : pipe(
            getJSDocText(jsdocs),
            getCommentInfo(name),
            RE.map((info) => {
              const signatures = pipe(
                overloads,
                RA.foldRight(
                  () => RA.of(getMethodSignature(md)),
                  (init, last) =>
                    RA.snoc(
                      init.map((md) => md.getText()),
                      getMethodSignature(last)
                    )
                )
              )
              return O.some(
                Method(
                  Documentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
                  signatures
                )
              )
            })
          )
    )
  )

const parseProperty = (classname: string) => (pd: ast.PropertyDeclaration): Parser<Property> => {
  const name = pd.getName()
  return pipe(
    getJSDocText(pd.getJsDocs()),
    getCommentInfo(`${classname}#${name}`),
    RE.map((info) => {
      const type = stripImportTypes(pd.getType().getText(pd))
      const readonly = pipe(
        O.fromNullable(pd.getFirstModifierByKind(ast.ts.SyntaxKind.ReadonlyKeyword)),
        O.fold(
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

const parseProperties = (name: string, c: ast.ClassDeclaration): Parser<ReadonlyArray<Property>> =>
  pipe(
    c.getProperties(),
    // take public, instance properties
    RA.filter(
      every([
        (prop) => !prop.isStatic(),
        (prop) => pipe(prop.getFirstModifierByKind(ast.ts.SyntaxKind.PrivateKeyword), O.fromNullable, O.isNone),
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
    O.fromNullable(c.compilerNode.body),
    O.fold(
      () => c.getText(),
      (body) => {
        const end = body.getStart() - c.getStart() - 1
        return c.getText().substring(0, end)
      }
    )
  )

const getClassName = (c: ast.ClassDeclaration): Parser<string> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chain<ParserEnv, string, ParserEnv, string>((env) =>
      pipe(
        O.fromNullable(c.name?.text),
        RE.fromOption(() => `Missing class name in module ${env.path.join('/')}`)
      )
    )
  )

const getClassCommentInfo = (name: string, c: ast.ClassDeclaration): Parser<CommentInfo> =>
  pipe(c, getJsDocs, getJSDocText, getCommentInfo(name))

const getClassDeclarationSignature = (name: string, c: ast.ClassDeclaration): Parser<string> =>
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

const parseClass = (c: ast.ClassDeclaration): Parser<Class> =>
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

const getClasses: Parser<ReadonlyArray<ast.ClassDeclaration>> = RE.asks((env: ParserEnv) =>
  pipe(
    env.sourceFile.getClasses(),
    RA.filter((c) => c.isExported())
  )
)

/**
 * @category parsers
 * @since 0.6.0
 */
export const parseClasses: Parser<ReadonlyArray<Class>> = pipe(
  getClasses,
  RE.chain(traverse(parseClass)),
  RE.map(RA.sort(ordByName))
)

// -------------------------------------------------------------------------------------
// modules
// -------------------------------------------------------------------------------------

const getModuleName = (path: RNEA.ReadonlyNonEmptyArray<string>): string => Path.parse(RNEA.last(path)).name

/**
 * @internal
 */
export const parseModuleDocumentation: Parser<Documentable> = pipe(
  RE.ask<ParserEnv>(),
  RE.chainEitherK((env) => {
    const name = getModuleName(env.path)
    // If any of the settings enforcing documentation are set to `true`, then
    // a module should have associated documentation
    const isDocumentationRequired = M.fold(M.monoidAny)([env.settings.enforceDescriptions, env.settings.enforceVersion])
    const onMissingDocumentation = () =>
      isDocumentationRequired
        ? E.left(`Missing documentation in ${env.path.join('/')} module`)
        : E.right(Documentable(name, O.none, O.none, false, RA.empty, O.none))
    return pipe(
      env.sourceFile.getStatements(),
      RA.foldLeft(onMissingDocumentation, (statement) =>
        pipe(
          statement.getLeadingCommentRanges(),
          RA.foldLeft(onMissingDocumentation, (commentRange) =>
            pipe(
              getCommentInfo(name, true)(commentRange.getText())(env),
              E.map((info) =>
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
 * @since 0.6.0
 */
export const parseModule: Parser<Module> = pipe(
  RE.ask<ParserEnv>(),
  RE.chain((env) =>
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
export const parseFile = (project: ast.Program) => (file: File): RTE.ReaderTaskEither<Environment, string, Module> =>
  pipe(
    RTE.ask<Environment>(),
    RTE.chain((env) =>
      pipe(
        RTE.right<Environment, string, RNEA.ReadonlyNonEmptyArray<string>>(file.path.split(Path.sep) as any),
        RTE.bindTo('path'),
        RTE.bind(
          'sourceFile',
          (): RTE.ReaderTaskEither<Environment, string, ast.SourceFile> =>
            pipe(
              O.fromNullable(project.getSourceFile(file.path)),
              RTE.fromOption(() => `Unable to locate file: ${file.path}`)
            )
        ),
        RTE.chainEitherK((menv) => parseModule({ ...env, ...menv }))
      )
    )
  )

const createProject = (files: ReadonlyArray<File>): RTE.ReaderTaskEither<Environment, string, ast.Program> =>
  pipe(
    RTE.ask<Environment>(),
    RTE.chainFirst(({ ast }) =>
      RTE.of(
        pipe(
          files,
          RA.map((file) => ast.addFile(file)(ast.project))
        )
      )
    ),
    RTE.map(({ ast }) => ast.project)
  )

/**
 * @category parsers
 * @since 0.6.0
 */
export const parseFiles = (
  files: ReadonlyArray<File>
): RTE.ReaderTaskEither<Environment, string, ReadonlyArray<Module>> =>
  pipe(
    createProject(files),
    RTE.chain((project) => pipe(files, RA.traverse(RTE.getReaderTaskValidation(semigroupError))(parseFile(project)))),
    RTE.map(
      flow(
        RA.filter((module) => !module.deprecated),
        sortModules
      )
    )
  )
