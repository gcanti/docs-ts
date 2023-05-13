/**
 * @since 0.9.0
 */
import * as NodePath from 'node:path'

import * as Boolean from '@effect/data/Boolean'
import * as Either from '@effect/data/Either'
import { flow, pipe } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import { not, Predicate } from '@effect/data/Predicate'
import * as ReadonlyArray from '@effect/data/ReadonlyArray'
import * as ReadonlyRecord from '@effect/data/ReadonlyRecord'
import * as String from '@effect/data/String'
import * as Order from '@effect/data/typeclass/Order'
import * as Effect from '@effect/io/Effect'
import chalk from 'chalk'
import * as doctrine from 'doctrine'
import * as RE from 'fp-ts/ReaderEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as ast from 'ts-morph'

import * as _ from './internal'
import * as Module from './Module'
import { Config } from './Service'

/**
 * @category model
 * @since 0.9.0
 */
export interface ParserEnv {
  readonly config: _.Config
  readonly path: ReadonlyArray.NonEmptyReadonlyArray<string>
  readonly sourceFile: ast.SourceFile
}

/**
 * @category model
 * @since 0.9.0
 */
export interface ParserEffect<A> extends RE.ReaderEither<ParserEnv, Array<string>, A> {}

interface Comment {
  readonly description: Option.Option<string>
  readonly tags: ReadonlyRecord.ReadonlyRecord<ReadonlyArray.NonEmptyReadonlyArray<Option.Option<string>>>
}

interface CommentInfo {
  readonly description: Option.Option<string>
  readonly since: Option.Option<string>
  readonly deprecated: boolean
  readonly examples: ReadonlyArray<Module.Example>
  readonly category: Option.Option<string>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

const CommentInfo = (
  description: Option.Option<string>,
  since: Option.Option<string>,
  deprecated: boolean,
  examples: ReadonlyArray<Module.Example>,
  category: Option.Option<string>
): CommentInfo => ({
  description,
  since,
  deprecated,
  examples,
  category
})

const applicativeParser = RE.getApplicativeReaderValidation(RA.getSemigroup<string>())

const traverse: <A, FR, B>(
  f: (a: A) => RE.ReaderEither<FR, Array<string>, B>
) => (ta: ReadonlyArray<A>) => RE.ReaderEither<FR, Array<string>, Array<B>> = RA.traverse(applicativeParser) as any

const every =
  <A>(predicates: ReadonlyArray<Predicate<A>>) =>
  (a: A): boolean =>
    predicates.every((p) => p(a))

const some =
  <A>(predicates: ReadonlyArray<Predicate<A>>) =>
  (a: A): boolean =>
    predicates.some((p) => p(a))

const byName = pipe(
  String.Order,
  Order.contramap(({ name }: { name: string }) => name)
)

const sortModules = ReadonlyArray.sort(Module.Order)

const isNonEmptyString = (s: string) => s.length > 0

/**
 * @internal
 */
export const stripImportTypes = (s: string): string => s.replace(/import\("((?!").)*"\)./g, '')

const getJSDocText: (jsdocs: ReadonlyArray<ast.JSDoc>) => string = ReadonlyArray.matchRight(
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

const missing = (what: string, path: ReadonlyArray<string>, name: string): string =>
  `Missing ${chalk.bold(what)} in ${chalk.bold(path.join('/') + '#' + name)} documentation`

const missingTag = (tag: string, path: ReadonlyArray<string>, name: string): string =>
  `Missing ${chalk.bold(tag)} tag in ${chalk.bold(path.join('/') + '#' + name)} documentation`

const getSinceTag = (name: string, comment: Comment): ParserEffect<Option.Option<string>> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chainEitherK((env) =>
      pipe(
        comment.tags,
        ReadonlyRecord.get('since'),
        Option.flatMap(ReadonlyArray.headNonEmpty),
        Option.match(
          () =>
            env.config.enforceVersion
              ? Either.left([missingTag('@since', env.path, name)])
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
        Option.flatMap(ReadonlyArray.headNonEmpty),
        Either.liftPredicate(not(every([Option.isNone, () => ReadonlyRecord.has(comment.tags, 'category')])), () => [
          missingTag('@category', env.path, name)
        ])
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
              ? Either.left([missing('description', env.path, name)])
              : Either.right(Option.none()),
          (description) => Either.right(Option.some(description))
        )
      )
    )
  )

const getExamples = (name: string, comment: Comment, isModule: boolean): ParserEffect<Array<string>> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.chainEitherK((env) =>
      pipe(
        comment.tags,
        ReadonlyRecord.get('example'),
        Option.map(ReadonlyArray.compact),
        Option.match(
          () =>
            Boolean.MonoidEvery.combineAll([env.config.enforceExamples, !isModule])
              ? Either.left([missingTag('@example', env.path, name)])
              : Either.right([]),
          (examples) =>
            Boolean.MonoidEvery.combineAll([
              env.config.enforceExamples,
              ReadonlyArray.isEmptyArray(examples),
              !isModule
            ])
              ? Either.left([missingTag('@example', env.path, name)])
              : Either.right(examples.slice())
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
      RE.Do,
      RE.bind('comment', () => RE.right(parseComment(text))),
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
    ReadonlyArray.groupBy((tag) => tag.title),
    ReadonlyRecord.map(
      ReadonlyArray.mapNonEmpty((tag) => pipe(Option.fromNullable(tag.description), Option.filter(isNonEmptyString)))
    )
  )
  const description = pipe(Option.fromNullable(annotation.description), Option.filter(isNonEmptyString))
  return { description, tags }
}

// -------------------------------------------------------------------------------------
// interfaces
// -------------------------------------------------------------------------------------

const parseInterfaceDeclaration = (id: ast.InterfaceDeclaration): ParserEffect<Module.Interface> =>
  pipe(
    getJSDocText(id.getJsDocs()),
    getCommentInfo(id.getName()),
    RE.map((info) =>
      Module.createInterface(
        Module.createDocumentable(
          id.getName(),
          info.description,
          info.since,
          info.deprecated,
          info.examples,
          info.category
        ),
        id.getText()
      )
    )
  )

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseInterfaces: ParserEffect<Array<Module.Interface>> = pipe(
  RE.asks((env: ParserEnv) =>
    pipe(
      env.sourceFile.getInterfaces(),
      ReadonlyArray.filter(
        every<ast.InterfaceDeclaration>([
          (id) => id.isExported(),
          (id) => pipe(id.getJsDocs(), not(flow(getJSDocText, parseComment, shouldIgnore)))
        ])
      )
    )
  ),
  RE.flatMap(flow(traverse(parseInterfaceDeclaration), RE.map(ReadonlyArray.sort(byName))))
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

const getFunctionDeclarationJSDocs = (fd: ast.FunctionDeclaration): Array<ast.JSDoc> =>
  pipe(
    fd.getOverloads(),
    ReadonlyArray.matchLeft(
      () => fd.getJsDocs(),
      (firstOverload) => firstOverload.getJsDocs()
    )
  )

const parseFunctionDeclaration = (fd: ast.FunctionDeclaration): ParserEffect<Module.Function> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.flatMap((env: ParserEnv) =>
      pipe(
        Option.fromNullable(fd.getName()),
        Option.flatMap(Option.liftPredicate((name) => name.length > 0)),
        RE.fromOption(() => [`Missing function name in module ${env.path.join('/')}`])
      )
    ),
    RE.flatMap((name) =>
      pipe(
        getJSDocText(getFunctionDeclarationJSDocs(fd)),
        getCommentInfo(name),
        RE.map((info) => {
          const signatures = pipe(
            fd.getOverloads(),
            ReadonlyArray.matchRight(
              () => [getFunctionDeclarationSignature(fd)],
              (init, last) =>
                pipe(
                  init.map(getFunctionDeclarationSignature),
                  ReadonlyArray.append(getFunctionDeclarationSignature(last))
                )
            )
          )
          return Module.createFunction(
            Module.createDocumentable(
              name,
              info.description,
              info.since,
              info.deprecated,
              info.examples,
              info.category
            ),
            signatures
          )
        })
      )
    )
  )

const parseFunctionVariableDeclaration = (vd: ast.VariableDeclaration): ParserEffect<Module.Function> => {
  const vs: any = vd.getParent().getParent()
  const name = vd.getName()
  return pipe(
    getJSDocText(vs.getJsDocs()),
    getCommentInfo(name),
    RE.map((info) => {
      const signature = `export declare const ${name}: ${stripImportTypes(vd.getType().getText(vd))}`
      return Module.createFunction(
        Module.createDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        [signature]
      )
    })
  )
}

const getFunctionDeclarations: RE.ReaderEither<
  ParserEnv,
  Array<string>,
  {
    functions: ReadonlyArray<ast.FunctionDeclaration>
    arrows: ReadonlyArray<ast.VariableDeclaration>
  }
> = RE.asks((env) => ({
  functions: pipe(
    env.sourceFile.getFunctions(),
    ReadonlyArray.filter(
      every<ast.FunctionDeclaration>([
        (fd) => fd.isExported(),
        not(flow(getFunctionDeclarationJSDocs, getJSDocText, parseComment, shouldIgnore))
      ])
    )
  ),
  arrows: pipe(
    env.sourceFile.getVariableDeclarations(),
    ReadonlyArray.filter(
      every<ast.VariableDeclaration>([
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
export const parseFunctions: ParserEffect<Array<Module.Function>> = pipe(
  RE.Do,
  RE.bind('getFunctionDeclarations', () => getFunctionDeclarations),
  RE.bind('functionDeclarations', ({ getFunctionDeclarations }) =>
    pipe(getFunctionDeclarations.functions, traverse(parseFunctionDeclaration))
  ),
  RE.bind('variableDeclarations', ({ getFunctionDeclarations }) =>
    pipe(getFunctionDeclarations.arrows, traverse(parseFunctionVariableDeclaration))
  ),
  RE.map(({ functionDeclarations, variableDeclarations }) => functionDeclarations.concat(variableDeclarations))
)

// -------------------------------------------------------------------------------------
// type aliases
// -------------------------------------------------------------------------------------

const parseTypeAliasDeclaration = (ta: ast.TypeAliasDeclaration): ParserEffect<Module.TypeAlias> =>
  pipe(
    RE.of<ParserEnv, Array<string>, string>(ta.getName()),
    RE.flatMap((name) =>
      pipe(
        getJSDocText(ta.getJsDocs()),
        getCommentInfo(name),
        RE.map((info) =>
          Module.createTypeAlias(
            Module.createDocumentable(
              name,
              info.description,
              info.since,
              info.deprecated,
              info.examples,
              info.category
            ),
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
export const parseTypeAliases: ParserEffect<Array<Module.TypeAlias>> = pipe(
  RE.asks((env: ParserEnv) =>
    pipe(
      env.sourceFile.getTypeAliases(),
      ReadonlyArray.filter(
        every<ast.TypeAliasDeclaration>([
          (alias) => alias.isExported(),
          (alias) => pipe(alias.getJsDocs(), not(flow(getJSDocText, parseComment, shouldIgnore)))
        ])
      )
    )
  ),
  RE.flatMap(traverse(parseTypeAliasDeclaration)),
  RE.map(ReadonlyArray.sort(byName))
)

// -------------------------------------------------------------------------------------
// constants
// -------------------------------------------------------------------------------------

const parseConstantVariableDeclaration = (vd: ast.VariableDeclaration): ParserEffect<Module.Constant> => {
  const vs: any = vd.getParent().getParent()
  const name = vd.getName()
  return pipe(
    getJSDocText(vs.getJsDocs()),
    getCommentInfo(name),
    RE.map((info) => {
      const type = stripImportTypes(vd.getType().getText(vd))
      const signature = `export declare const ${name}: ${type}`
      return Module.createConstant(
        Module.createDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        signature
      )
    })
  )
}

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseConstants: ParserEffect<Array<Module.Constant>> = pipe(
  RE.asks((env: ParserEnv) =>
    pipe(
      env.sourceFile.getVariableDeclarations(),
      ReadonlyArray.filter(
        every<ast.VariableDeclaration>([
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

const parseExportSpecifier = (es: ast.ExportSpecifier): ParserEffect<Module.Export> =>
  pipe(
    RE.ask<ParserEnv>(),
    RE.flatMap((env) =>
      pipe(
        RE.of<ParserEnv, Array<string>, string>(es.compilerNode.name.text),
        RE.bindTo('name'),
        RE.bind('type', () => RE.of(stripImportTypes(es.getType().getText(es)))),
        RE.bind('signature', ({ name, type }) => RE.of(`export declare const ${name}: ${type}`)),
        RE.flatMap(({ name, signature }) =>
          pipe(
            es.getLeadingCommentRanges(),
            ReadonlyArray.head,
            RE.fromOption(() => [`Missing ${name} documentation in ${env.path.join('/')}`]),
            RE.flatMap((commentRange) => pipe(commentRange.getText(), getCommentInfo(name))),
            RE.map((info) =>
              Module.createExport(
                Module.createDocumentable(
                  name,
                  info.description,
                  info.since,
                  info.deprecated,
                  info.examples,
                  info.category
                ),
                signature
              )
            )
          )
        )
      )
    )
  )

const parseExportDeclaration = (ed: ast.ExportDeclaration): ParserEffect<Array<Module.Export>> =>
  pipe(ed.getNamedExports(), traverse(parseExportSpecifier))

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseExports: ParserEffect<Array<Module.Export>> = pipe(
  RE.asks((env: ParserEnv) => env.sourceFile.getExportDeclarations()),
  RE.flatMap(traverse(parseExportDeclaration)),
  RE.map(ReadonlyArray.flatten)
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

const parseMethod = (md: ast.MethodDeclaration): ParserEffect<Option.Option<Module.Method>> =>
  pipe(
    RE.of<ParserEnv, Array<string>, string>(md.getName()),
    RE.bindTo('name'),
    RE.bind('overloads', () => RE.of(md.getOverloads())),
    RE.bind('jsdocs', ({ overloads }) =>
      RE.of(
        pipe(
          overloads,
          ReadonlyArray.matchLeft(
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
                ReadonlyArray.matchRight(
                  () => [getMethodSignature(md)],
                  (init, last) =>
                    pipe(
                      init.map((md) => md.getText()),
                      ReadonlyArray.append(getMethodSignature(last))
                    )
                )
              )
              return Option.some(
                Module.createMethod(
                  Module.createDocumentable(
                    name,
                    info.description,
                    info.since,
                    info.deprecated,
                    info.examples,
                    info.category
                  ),
                  signatures
                )
              )
            })
          )
    )
  )

const parseProperty =
  (classname: string) =>
  (pd: ast.PropertyDeclaration): ParserEffect<Module.Property> => {
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
        return Module.createProperty(
          Module.createDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
          signature
        )
      })
    )
  }

const parseProperties = (name: string, c: ast.ClassDeclaration): ParserEffect<Array<Module.Property>> =>
  pipe(
    c.getProperties(),
    // take public, instance properties
    ReadonlyArray.filter(
      every<ast.PropertyDeclaration>([
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
    RE.flatMap((env) =>
      pipe(
        Option.fromNullable(c.getName()),
        RE.fromOption(() => [`Missing class name in module ${env.path.join('/')}`])
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
        ReadonlyArray.matchLeft(
          () => `export declare class ${name}${typeParameters}`,
          (head) => `export declare class ${name}${typeParameters} { ${getConstructorDeclarationSignature(head)} }`
        )
      )
    )
  )

const parseClass = (c: ast.ClassDeclaration): ParserEffect<Module.Class> =>
  pipe(
    getClassName(c),
    RE.bindTo('name'),
    RE.bind('info', ({ name }) => getClassCommentInfo(name, c)),
    RE.bind('signature', ({ name }) => getClassDeclarationSignature(name, c)),
    RE.bind('methods', () => pipe(c.getInstanceMethods(), traverse(parseMethod), RE.map(ReadonlyArray.compact))),
    RE.bind('staticMethods', () => pipe(c.getStaticMethods(), traverse(parseMethod), RE.map(ReadonlyArray.compact))),
    RE.bind('properties', ({ name }) => parseProperties(name, c)),
    RE.map(({ methods, staticMethods, properties, info, name, signature }) =>
      Module.createClass(
        Module.createDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        signature,
        methods,
        staticMethods,
        properties
      )
    )
  )

const getClasses: ParserEffect<Array<ast.ClassDeclaration>> = RE.asks((env: ParserEnv) =>
  pipe(
    env.sourceFile.getClasses(),
    ReadonlyArray.filter((c) => c.isExported())
  )
)

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseClasses: ParserEffect<Array<Module.Class>> = pipe(
  getClasses,
  RE.flatMap(traverse(parseClass)),
  RE.map(ReadonlyArray.sort(byName))
)

// -------------------------------------------------------------------------------------
// modules
// -------------------------------------------------------------------------------------

const getModuleName = (path: ReadonlyArray.NonEmptyReadonlyArray<string>): string =>
  NodePath.parse(ReadonlyArray.lastNonEmpty(path)).name

/**
 * @internal
 */
export const parseModuleDocumentation: ParserEffect<Module.Documentable> = pipe(
  RE.ask<ParserEnv>(),
  RE.chainEitherK((env) => {
    const name = getModuleName(env.path)
    // if any of the settings enforcing documentation are set to `true`, then
    // a module should have associated documentation
    const isDocumentationRequired = Boolean.MonoidSome.combineAll([
      env.config.enforceDescriptions,
      env.config.enforceVersion
    ])
    const onMissingDocumentation = () =>
      isDocumentationRequired
        ? Either.left([`Missing documentation in ${env.path.join('/')} module`])
        : Either.right(Module.createDocumentable(name, Option.none(), Option.none(), false, [], Option.none()))
    return pipe(
      env.sourceFile.getStatements(),
      ReadonlyArray.matchLeft(onMissingDocumentation, (statement) =>
        pipe(
          statement.getLeadingCommentRanges(),
          ReadonlyArray.matchLeft(onMissingDocumentation, (commentRange) =>
            pipe(
              getCommentInfo(name, true)(commentRange.getText())(env),
              // TODO
              (e): Either.Either<Array<string>, CommentInfo> =>
                e._tag === 'Left' ? Either.left(e.left) : Either.right(e.right),
              Either.map((info) =>
                Module.createDocumentable(
                  name,
                  info.description,
                  info.since,
                  info.deprecated,
                  info.examples,
                  info.category
                )
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
export const parseModule: ParserEffect<Module.Module> = pipe(
  RE.ask<ParserEnv>(),
  RE.flatMap((env) =>
    pipe(
      RE.Do,
      RE.bind('documentation', () => parseModuleDocumentation),
      RE.bind('interfaces', () => parseInterfaces),
      RE.bind('functions', () => parseFunctions),
      RE.bind('typeAliases', () => parseTypeAliases),
      RE.bind('classes', () => parseClasses),
      RE.bind('constants', () => parseConstants),
      RE.bind('exports', () => parseExports),
      RE.map(({ documentation, classes, interfaces, functions, typeAliases, constants, exports }) =>
        Module.createModule(documentation, env.path, classes, interfaces, functions, typeAliases, constants, exports)
      )
    )
  )
)

/**
 * @internal
 */
export const parseFile =
  (project: ast.Project) =>
  (file: _.File): Effect.Effect<Config, Array<string>, Module.Module> =>
    pipe(
      Config,
      Effect.flatMap(({ config }) => {
        const path = file.path.split(NodePath.sep) as any as ReadonlyArray.NonEmptyReadonlyArray<string>
        const sourceFile = project.getSourceFile(file.path)
        if (sourceFile !== undefined) {
          const x = parseModule({ config, path, sourceFile })
          // TODO
          return x._tag === 'Left' ? Either.left(x.left) : Either.right(x.right)
        }
        return Either.left([`Unable to locate file: ${file.path}`])
      })
    )

const createProject = (files: ReadonlyArray<_.File>) =>
  pipe(
    Config,
    Effect.map(({ config }) => {
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
      return project
    })
  )

/**
 * @category parsers
 * @since 0.9.0
 */
export const parseFiles = (files: ReadonlyArray<_.File>) =>
  pipe(
    createProject(files),
    Effect.flatMap((project) =>
      pipe(
        files,
        Effect.validateAll(parseFile(project)),
        Effect.map(
          flow(
            ReadonlyArray.filter((module) => !module.deprecated),
            sortModules
          )
        )
      )
    )
  )
