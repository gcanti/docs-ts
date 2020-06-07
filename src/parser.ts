/**
 * parser utilities
 *
 * @since 0.2.0
 */

import * as doctrine from 'doctrine'
import * as Apply from 'fp-ts/lib/Apply'
import * as A from 'fp-ts/lib/Array'
import * as E from 'fp-ts/lib/Either'
import { flow } from 'fp-ts/lib/function'
import * as NEA from 'fp-ts/lib/NonEmptyArray'
import * as O from 'fp-ts/lib/Option'
import * as Ord from 'fp-ts/lib/Ord'
import { pipe } from 'fp-ts/lib/pipeable'
import * as RE from 'fp-ts/lib/ReaderEither'
import * as R from 'fp-ts/lib/Record'
import * as Semigroup from 'fp-ts/lib/Semigroup'
import * as P from 'path'
import * as ast from 'ts-morph'
import * as D from './domain'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.5.0
 */
export interface Env {
  path: Array<string>
  sourceFile: ast.SourceFile
}

/**
 * @category model
 * @since 0.2.0
 */
export interface File {
  path: string
  content: string
}

/**
 * @category model
 * @since 0.2.0
 */
export interface Parser<A> extends RE.ReaderEither<Env, string, A> {}

const semigroupError = Semigroup.getIntercalateSemigroup('\n')(Semigroup.semigroupString)
const applicativeParser = RE.getReaderValidation(semigroupError)
const traverse = A.array.traverse(applicativeParser)
const sequenceS = Apply.sequenceS(applicativeParser)

interface Comment {
  readonly description: O.Option<string>
  readonly tags: Record<string, NEA.NonEmptyArray<O.Option<string>>>
}

const isNonEmptyString = (s: string) => s.length > 0

/**
 * @internal
 */
export const parseComment = (text: string): Comment => {
  const annotation: doctrine.Annotation = doctrine.parse(text, { unwrap: true })
  const tags = pipe(
    annotation.tags,
    NEA.groupBy(tag => tag.title),
    R.map(NEA.map(tag => pipe(O.fromNullable(tag.description), O.filter(isNonEmptyString))))
  )
  return {
    description: pipe(O.fromNullable(annotation.description), O.filter(isNonEmptyString)),
    tags
  }
}

function getJSDocText(jsdocs: Array<ast.JSDoc>): string {
  return pipe(
    jsdocs,
    A.foldRight(
      () => '',
      (_, last) => last.getText()
    )
  )
}

/**
 * @since 0.5.0
 */
function doIgnore(comment: Comment): boolean {
  return pipe(R.lookup('internal', comment.tags), O.isSome) || pipe(R.lookup('ignore', comment.tags), O.isSome)
}

/**
 * @internal
 */
export function getCommentInfo(
  name: string,
  text: string
): Parser<{
  description: O.Option<string>
  since: string
  deprecated: boolean
  examples: Array<D.Example>
  category: O.Option<string>
}> {
  const comment = parseComment(text)
  const since = pipe(R.lookup('since', comment.tags), O.chain(NEA.head))
  if (O.isNone(since)) {
    return env => E.left(`missing @since tag in ${env.path.join('/')}#${name} documentation`)
  }
  const category = pipe(R.lookup('category', comment.tags), O.chain(NEA.head))
  if (O.isNone(category) && pipe(R.hasOwnProperty('category', comment.tags))) {
    return env => E.left(`missing @category value in ${env.path.join('/')}#${name} documentation`)
  }
  return RE.right({
    description: comment.description,
    since: since.value,
    deprecated: pipe(R.lookup('deprecated', comment.tags), O.isSome),
    examples: pipe(
      R.lookup('example', comment.tags),
      O.map(A.compact),
      O.getOrElse((): Array<string> => A.empty)
    ),
    category: category
  })
}

const sortModules = A.sort(D.ordModule)

function parseInterfaceDeclaration(id: ast.InterfaceDeclaration): Parser<D.Interface> {
  const name = id.getName()
  return pipe(
    getCommentInfo(name, getJSDocText(id.getJsDocs())),
    RE.map(info => {
      const signature = id.getText()
      return D.makeInterface(
        D.makeDocumentable(id.getName(), info.description, info.since, info.deprecated, info.examples, info.category),
        signature
      )
    })
  )
}

const byName = pipe(
  Ord.ordString,
  Ord.contramap((x: { name: string }) => x.name)
)

/**
 * @category parser
 * @since 0.2.0
 */
export const parseInterfaces: Parser<Array<D.Interface>> = pipe(
  RE.asks((env: Env) => env.sourceFile.getInterfaces().filter(id => id.isExported())),
  RE.chain(exportedInterfaceDeclarations =>
    pipe(
      traverse(exportedInterfaceDeclarations, parseInterfaceDeclaration),
      RE.map(interfaces => interfaces.sort(byName.compare))
    )
  )
)

function getFunctionDeclarationSignature(f: ast.FunctionDeclaration): string {
  const text = f.getText()
  const body = f.compilerNode.body
  if (body === undefined) {
    return text.replace('export function ', 'export declare function ')
  }
  const end = body.getStart() - f.getStart() - 1
  return text.substring(0, end).replace('export function ', 'export declare function ')
}

function getFunctionDeclarationJSDocs(fd: ast.FunctionDeclaration): Array<ast.JSDoc> {
  const overloads = fd.getOverloads()
  return overloads.length === 0 ? fd.getJsDocs() : overloads[0].getJsDocs()
}

function parseFunctionDeclaration(fd: ast.FunctionDeclaration): Parser<D.Function> {
  const name = fd.getName()
  if (name === undefined || name.trim() === '') {
    return env => E.left(`Missing function name in module ${env.path.join('/')}`)
  }
  return pipe(
    getCommentInfo(name, getJSDocText(getFunctionDeclarationJSDocs(fd))),
    RE.map(info => {
      const overloads = fd.getOverloads()
      const signatures =
        overloads.length === 0
          ? [getFunctionDeclarationSignature(fd)]
          : [
              ...overloads.slice(0, overloads.length - 1).map(getFunctionDeclarationSignature),
              getFunctionDeclarationSignature(overloads[overloads.length - 1])
            ]
      return D.makeFunction(
        D.makeDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        signatures
      )
    })
  )
}

function parseFunctionVariableDeclaration(vd: ast.VariableDeclaration): Parser<D.Function> {
  const vs: any = vd.getParent().getParent()
  const name = vd.getName()
  return pipe(
    getCommentInfo(name, getJSDocText(vs.getJsDocs())),
    RE.map(info => {
      const signature = `export declare const ${name}: ${stripImportTypes(vd.getType().getText(vd))}`
      return D.makeFunction(
        D.makeDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        [signature]
      )
    })
  )
}

const getFunctionDeclarations = RE.asks((env: Env) => ({
  functions: env.sourceFile
    .getFunctions()
    .filter(fd => fd.isExported() && !doIgnore(parseComment(getJSDocText(getFunctionDeclarationJSDocs(fd))))),
  arrows: env.sourceFile.getVariableDeclarations().filter(vd => {
    const parent = vd.getParent()
    if (isVariableDeclarationList(parent)) {
      const vs = parent.getParent()
      if (isVariableStatement(vs)) {
        const initializer = vd.getInitializer()
        return (
          !doIgnore(parseComment(getJSDocText(vs.getJsDocs()))) &&
          initializer !== undefined &&
          vs.isExported() &&
          ast.TypeGuards.isFunctionLikeDeclaration(initializer)
        )
      }
    }
    return false
  })
}))

/**
 * @category parser
 * @since 0.2.0
 */
export const parseFunctions: Parser<Array<D.Function>> = pipe(
  getFunctionDeclarations,
  RE.chain(({ functions, arrows }) =>
    sequenceS({
      functionDeclarations: traverse(functions, parseFunctionDeclaration),
      variableDeclarations: traverse(arrows, parseFunctionVariableDeclaration)
    })
  ),
  RE.map(({ functionDeclarations, variableDeclarations }) => [...functionDeclarations, ...variableDeclarations])
)

function parseTypeAliasDeclaration(ta: ast.TypeAliasDeclaration): Parser<D.TypeAlias> {
  const name = ta.getName()
  return pipe(
    getCommentInfo(name, getJSDocText(ta.getJsDocs())),
    RE.map(info => {
      const signature = ta.getText()
      return D.makeTypeAlias(
        D.makeDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        signature
      )
    })
  )
}

/**
 * @category parser
 * @since 0.2.0
 */
export const parseTypeAliases: Parser<Array<D.TypeAlias>> = pipe(
  RE.asks((env: Env) =>
    env.sourceFile
      .getTypeAliases()
      .filter(ta => ta.isExported() && !doIgnore(parseComment(getJSDocText(ta.getJsDocs()))))
  ),
  RE.chain(typeAliaseDeclarations => traverse(typeAliaseDeclarations, ta => parseTypeAliasDeclaration(ta))),
  RE.map(typeAliases => typeAliases.sort(byName.compare))
)

/**
 * @internal
 */
export function stripImportTypes(s: string): string {
  return s.replace(/import\("((?!").)*"\)./g, '')
}

function parseConstantVariableDeclaration(vd: ast.VariableDeclaration): Parser<D.Constant> {
  const vs: any = vd.getParent().getParent()
  const name = vd.getName()
  return pipe(
    getCommentInfo(name, getJSDocText(vs.getJsDocs())),
    RE.map(info => {
      const type = stripImportTypes(vd.getType().getText(vd))
      const signature = `export declare const ${name}: ${type}`
      return D.makeConstant(
        D.makeDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        signature
      )
    })
  )
}

const isVariableDeclarationList = (
  u: ast.VariableDeclarationList | ast.CatchClause
): u is ast.VariableDeclarationList => u.getKind() === ast.ts.SyntaxKind.VariableDeclarationList

const isVariableStatement = (
  u: ast.VariableStatement | ast.ForStatement | ast.ForOfStatement | ast.ForInStatement
): u is ast.VariableStatement => u.getKind() === ast.ts.SyntaxKind.VariableStatement

/**
 * @category parser
 * @since 0.2.0
 */
export const parseConstants: Parser<Array<D.Constant>> = pipe(
  RE.asks((env: Env) =>
    env.sourceFile.getVariableDeclarations().filter(vd => {
      const parent = vd.getParent()
      if (isVariableDeclarationList(parent)) {
        const vs = parent.getParent()
        if (isVariableStatement(vs)) {
          const initializer = vd.getInitializer()
          return (
            !doIgnore(parseComment(getJSDocText(vs.getJsDocs()))) &&
            initializer !== undefined &&
            vs.isExported() &&
            !ast.TypeGuards.isFunctionLikeDeclaration(initializer)
          )
        }
      }
      return false
    })
  ),
  RE.chain(variableDeclarations => traverse(variableDeclarations, parseConstantVariableDeclaration))
)

function parseExportSpecifier(es: ast.ExportSpecifier): Parser<D.Export> {
  const name = es.compilerNode.name.text
  const type = stripImportTypes(es.getType().getText(es))
  const signature = `export declare const ${name}: ${type}`
  return pipe(
    RE.fromOption(() => `missing ${name} documentation`)(A.head(es.getLeadingCommentRanges())),
    RE.chain(commentRange => getCommentInfo(name, commentRange.getText())),
    RE.map(info =>
      D.makeExport(
        D.makeDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        signature
      )
    )
  )
}

function parseExportDeclaration(ed: ast.ExportDeclaration): Parser<Array<D.Export>> {
  return traverse(ed.getNamedExports(), parseExportSpecifier)
}

/**
 * @category parser
 * @since 0.2.0
 */
export const parseExports: Parser<Array<D.Export>> = pipe(
  RE.asks((env: Env) => env.sourceFile.getExportDeclarations()),
  RE.chain(exportDeclarations => traverse(exportDeclarations, parseExportDeclaration)),
  RE.map(A.flatten)
)

function getTypeParameters(typeParameters: Array<ast.TypeParameterDeclaration>): string {
  return typeParameters.length === 0 ? '' : '<' + typeParameters.map(p => p.getName()).join(', ') + '>'
}

function getMethodSignature(md: ast.MethodDeclaration): string {
  const text = md.getText()
  const body = md.compilerNode.body
  if (body === undefined) {
    return text
  }
  const end = body.getStart() - md.getStart() - 1
  return text.substring(0, end)
}

function parseMethod(md: ast.MethodDeclaration): Parser<D.Method> {
  const name = md.getName()
  const overloads = md.getOverloads()
  const jsdocs = overloads.length === 0 ? md.getJsDocs() : overloads[0].getJsDocs()
  return pipe(
    getCommentInfo(name, getJSDocText(jsdocs)),
    RE.map(info => {
      const signatures =
        overloads.length === 0
          ? [getMethodSignature(md)]
          : [
              ...overloads.slice(0, overloads.length - 1).map(md => md.getText()),
              getMethodSignature(overloads[overloads.length - 1])
            ]
      return D.makeMethod(
        D.makeDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        signatures
      )
    })
  )
}

function parseProperty(className: string, pd: ast.PropertyDeclaration): Parser<D.Property> {
  const name = pd.getName()
  return pipe(
    getCommentInfo(`${className}#${name}`, getJSDocText(pd.getJsDocs())),
    RE.map(info => {
      const type = stripImportTypes(pd.getType().getText(pd))
      const readonly = pd.getFirstModifierByKind(ast.ts.SyntaxKind.ReadonlyKeyword) === undefined ? '' : 'readonly '
      const signature = `${readonly}${name}: ${type}`
      return D.makeProperty(
        D.makeDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
        signature
      )
    })
  )
}

function getConstructorDeclarationSignature(c: ast.ConstructorDeclaration): string {
  const text = c.getText()
  return pipe(
    O.fromNullable(c.compilerNode.body),
    O.fold(
      () => text,
      body => {
        const end = body.getStart() - c.getStart() - 1
        return text.substring(0, end)
      }
    )
  )
}

function getClassDeclarationSignature(c: ast.ClassDeclaration): string {
  const dataName = c.getName()
  const typeParameters = getTypeParameters(c.getTypeParameters())
  return pipe(
    c.getConstructors(),
    A.foldLeft(
      () => `export declare class ${dataName}${typeParameters}`,
      head => {
        const constructorSignature = getConstructorDeclarationSignature(head)
        return `export declare class ${dataName}${typeParameters} { ${constructorSignature} }`
      }
    )
  )
}

function parseClass(c: ast.ClassDeclaration): Parser<D.Class> {
  return pipe(
    O.fromNullable(c.getName()),
    O.fold(
      () => env => E.left(`Missing class name in module ${env.path.join('/')}`),
      name =>
        pipe(
          getCommentInfo(name, getJSDocText(c.getJsDocs())),
          RE.chain(info => {
            const signature = getClassDeclarationSignature(c)
            return pipe(
              Apply.sequenceS(RE.readerEither)({
                methods: traverse(c.getInstanceMethods(), parseMethod),
                staticMethods: traverse(c.getStaticMethods(), parseMethod),
                properties: traverse(
                  c
                    .getProperties()
                    // take public, instance properties
                    .filter(
                      p =>
                        !p.isStatic() &&
                        p.getFirstModifierByKind(ast.ts.SyntaxKind.PrivateKeyword) === undefined &&
                        !doIgnore(parseComment(getJSDocText(p.getJsDocs())))
                    ),
                  p => parseProperty(name, p)
                )
              }),
              RE.map(({ methods, staticMethods, properties }) =>
                D.makeClass(
                  D.makeDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category),
                  signature,
                  methods,
                  staticMethods,
                  properties
                )
              )
            )
          })
        )
    )
  )
}

const getClasses = RE.asks((env: Env) => env.sourceFile.getClasses().filter(c => c.isExported()))

/**
 * @category parser
 * @since 0.2.0
 */
export const parseClasses: Parser<Array<D.Class>> = pipe(
  getClasses,
  RE.chain(classes => traverse(classes, cd => parseClass(cd))),
  RE.map(classes => classes.sort(byName.compare))
)

function getModuleName(path: Array<string>): string {
  return P.parse(path[path.length - 1]).name
}

/**
 * @internal
 */
export const parseModuleDocumentation: Parser<D.Documentable> = env => {
  const name = getModuleName(env.path)
  const onMissingDocumentation = () => E.left(`missing documentation in ${env.path.join('/')} module`)
  return pipe(
    env.sourceFile.getStatements(),
    A.foldLeft(onMissingDocumentation, statement =>
      pipe(
        statement.getLeadingCommentRanges(),
        A.foldLeft(onMissingDocumentation, commentRange =>
          pipe(
            getCommentInfo(name, commentRange.getText())(env),
            E.fold(
              () => E.left(`missing @since tag in ${env.path.join('/')} module documentation`),
              info =>
                E.right(
                  D.makeDocumentable(name, info.description, info.since, info.deprecated, info.examples, info.category)
                )
            )
          )
        )
      )
    )
  )
}

/**
 * @category parser
 * @since 0.5.0
 */
export const parseModule: Parser<D.Module> = pipe(
  sequenceS({
    documentation: parseModuleDocumentation,
    interfaces: parseInterfaces,
    functions: parseFunctions,
    typeAliases: parseTypeAliases,
    classes: parseClasses,
    constants: parseConstants,
    exports: parseExports
  }),
  RE.chain(items => env =>
    E.right(
      D.makeModule(
        items.documentation,
        env.path,
        items.interfaces,
        items.typeAliases,
        items.functions,
        items.classes,
        items.constants,
        items.exports
      )
    )
  )
)

function parseFile(project: ast.Project): (file: File) => E.Either<string, D.Module> {
  return file => {
    const sourceFile = project.getSourceFile(file.path)!
    const path = file.path.split(P.sep)
    return parseModule({
      path,
      sourceFile
    })
  }
}

function createProject(files: Array<File>): ast.Project {
  const project = new ast.Project()
  files.forEach(file => {
    project.addSourceFileAtPath(file.path)
  })
  return project
}

/**
 * @since 0.5.0
 */
export function parseFiles(files: Array<File>): E.Either<string, Array<D.Module>> {
  const traverse = A.array.traverse(E.getValidation(semigroupError))
  return pipe(
    traverse(files, parseFile(createProject(files))),
    E.map(
      flow(
        A.filter(module => !module.deprecated),
        sortModules
      )
    )
  )
}
