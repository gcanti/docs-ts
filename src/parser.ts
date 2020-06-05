/**
 * parser utilities
 *
 * @since 0.2.0
 */

import * as doctrine from 'doctrine'
import { sequenceS } from 'fp-ts/lib/Apply'
import * as A from 'fp-ts/lib/Array'
import * as E from 'fp-ts/lib/Either'
import * as NEA from 'fp-ts/lib/NonEmptyArray'
import * as O from 'fp-ts/lib/Option'
import { contramap, ordString } from 'fp-ts/lib/Ord'
import { pipe } from 'fp-ts/lib/pipeable'
import * as R from 'fp-ts/lib/Record'
import * as RE from 'fp-ts/lib/ReaderEither'
import * as P from 'path'
import * as ast from 'ts-morph'
import {
  Class,
  Constant,
  Documentable,
  Example,
  Export,
  Function,
  Interface,
  makeClass,
  makeConstant,
  makeDocumentable,
  makeExport,
  makeFunction,
  makeInterface,
  makeMethod,
  makeModule,
  makeProperty,
  makeTypeAlias,
  Method,
  Module,
  ordModule,
  Property,
  TypeAlias
} from './domain'
import { getFunctionMonoid } from 'fp-ts/lib/Monoid'

interface Comment {
  readonly description: O.Option<string>
  readonly tags: Record<string, NEA.NonEmptyArray<O.Option<string>>>
}

const isNonEmptyString = (s: string) => s.length > 0

/**
 * @since 0.5.0
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

/**
 * @since 0.5.0
 */
export function getJSDocText(jsdocs: Array<ast.JSDoc>): string {
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
function isInternal(comment: Comment): boolean {
  return pipe(R.lookup('internal', comment.tags), O.isSome)
}

/**
 * @since 0.5.0
 */
export function getCommentInfo(
  name: string,
  text: string
): Parser<{
  description: O.Option<string>
  since: string
  deprecated: boolean
  examples: Array<Example>
}> {
  const comment = parseComment(text)
  const since = pipe(R.lookup('since', comment.tags), O.chain(NEA.head))
  if (O.isNone(since)) {
    return env => E.left([`missing @since tag in ${env.moduleName}/${name} documentation`])
  }
  return RE.right({
    description: comment.description,
    since: since.value,
    deprecated: pipe(R.lookup('deprecated', comment.tags), O.isSome),
    examples: pipe(
      R.lookup('example', comment.tags),
      O.map(A.compact),
      O.getOrElse((): Array<string> => A.empty)
    )
  })
}

/**
 * @since 0.2.0
 */
export interface File {
  path: string
  content: string
}

const sortModules = A.sort(ordModule)

interface Env {
  moduleName: string
}

/**
 * @since 0.2.0
 */
export type Parser<A> = RE.ReaderEither<Env, NEA.NonEmptyArray<string>, A>

const monoidFailure = NEA.getSemigroup<string>()

const monadParser = RE.getReaderValidation(monoidFailure)

const traverse = A.array.traverse(monadParser)

function parseInterfaceDeclaration(id: ast.InterfaceDeclaration): Parser<Interface> {
  const name = id.getName()
  return pipe(
    getCommentInfo(name, getJSDocText(id.getJsDocs())),
    RE.map(info => {
      const signature = id.getText()
      return makeInterface(
        makeDocumentable(id.getName(), info.description, info.since, info.deprecated, info.examples),
        signature
      )
    })
  )
}

const byName = pipe(
  ordString,
  contramap((x: { name: string }) => x.name)
)

/**
 * @since 0.2.0
 */
export function getInterfaces(sourceFile: ast.SourceFile): Parser<Array<Interface>> {
  const exportedInterfaceDeclarations = sourceFile.getInterfaces().filter(id => id.isExported())
  return pipe(
    traverse(exportedInterfaceDeclarations, parseInterfaceDeclaration),
    RE.map(interfaces => interfaces.sort(byName.compare))
  )
}

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

function parseFunctionDeclaration(fd: ast.FunctionDeclaration): Parser<Function> {
  const name = fd.getName()
  if (name === undefined || name.trim() === '') {
    return env => E.left(NEA.of(`Missing function name in module ${env.moduleName}`))
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
      return makeFunction(
        makeDocumentable(name, info.description, info.since, info.deprecated, info.examples),
        signatures
      )
    })
  )
}

function parseFunctionVariableDeclaration(vd: ast.VariableDeclaration): Parser<Function> {
  const vs: any = vd.getParent().getParent()
  const name = vd.getName()
  return pipe(
    getCommentInfo(name, getJSDocText(vs.getJsDocs())),
    RE.map(info => {
      const signature = `export declare const ${name}: ${stripImportTypes(vd.getType().getText(vd))}`
      return makeFunction(makeDocumentable(name, info.description, info.since, info.deprecated, info.examples), [
        signature
      ])
    })
  )
}

/**
 * @since 0.2.0
 */
export function getFunctions(sourceFile: ast.SourceFile): Parser<Array<Function>> {
  const exportedFunctionDeclarations = sourceFile
    .getFunctions()
    .filter(fd => fd.isExported() && !isInternal(parseComment(getJSDocText(fd.getJsDocs()))))

  const functionDeclarations = traverse(exportedFunctionDeclarations, fd => parseFunctionDeclaration(fd))

  const exportedVariableDeclarations = sourceFile.getVariableDeclarations().filter(vd => {
    const parent = vd.getParent()
    if (isVariableDeclarationList(parent)) {
      const vs = parent.getParent()
      if (isVariableStatement(vs)) {
        const initializer = vd.getInitializer()
        return (
          !isInternal(parseComment(getJSDocText(vs.getJsDocs()))) &&
          initializer !== undefined &&
          vs.isExported() &&
          ast.TypeGuards.isFunctionLikeDeclaration(initializer)
        )
      }
    }
    return false
  })

  const variableDeclarations = traverse(exportedVariableDeclarations, parseFunctionVariableDeclaration)

  const monoidFunc = getFunctionMonoid(E.getValidationMonoid(monoidFailure, A.getMonoid<Function>()))<Env>()
  return monoidFunc.concat(functionDeclarations, variableDeclarations)
}

function parseTypeAliasDeclaration(ta: ast.TypeAliasDeclaration): Parser<TypeAlias> {
  const name = ta.getName()
  return pipe(
    getCommentInfo(name, getJSDocText(ta.getJsDocs())),
    RE.map(info => {
      const signature = ta.getText()
      return makeTypeAlias(
        makeDocumentable(name, info.description, info.since, info.deprecated, info.examples),
        signature
      )
    })
  )
}

/**
 * @since 0.2.0
 */
export function getTypeAliases(sourceFile: ast.SourceFile): Parser<Array<TypeAlias>> {
  const exportedTypeAliasDeclarations = sourceFile
    .getTypeAliases()
    .filter(ta => ta.isExported() && !isInternal(parseComment(getJSDocText(ta.getJsDocs()))))

  return pipe(
    traverse(exportedTypeAliasDeclarations, ta => parseTypeAliasDeclaration(ta)),
    RE.map(typeAliases => typeAliases.sort(byName.compare))
  )
}

/**
 * @internal
 */
export function stripImportTypes(s: string): string {
  return s.replace(/import\("((?!").)*"\)./g, '')
}

function parseConstantVariableDeclaration(vd: ast.VariableDeclaration): Parser<Constant> {
  const vs: any = vd.getParent().getParent()
  const name = vd.getName()
  return pipe(
    getCommentInfo(name, getJSDocText(vs.getJsDocs())),
    RE.map(info => {
      const type = stripImportTypes(vd.getType().getText(vd))
      const signature = `export declare const ${name}: ${type}`
      return makeConstant(
        makeDocumentable(name, info.description, info.since, info.deprecated, info.examples),
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
 * @since 0.2.0
 */
export function getConstants(sourceFile: ast.SourceFile): Parser<Array<Constant>> {
  const exportedVariableDeclarations = sourceFile.getVariableDeclarations().filter(vd => {
    const parent = vd.getParent()
    if (isVariableDeclarationList(parent)) {
      const vs = parent.getParent()
      if (isVariableStatement(vs)) {
        const initializer = vd.getInitializer()
        return (
          !isInternal(parseComment(getJSDocText(vs.getJsDocs()))) &&
          initializer !== undefined &&
          vs.isExported() &&
          !ast.TypeGuards.isFunctionLikeDeclaration(initializer)
        )
      }
    }
    return false
  })

  return traverse(exportedVariableDeclarations, parseConstantVariableDeclaration)
}

function parseExportSpecifier(es: ast.ExportSpecifier): Parser<Export> {
  const name = es.compilerNode.name.text
  const type = stripImportTypes(es.getType().getText(es))
  const signature = `export declare const ${name}: ${type}`
  return pipe(
    RE.fromOption(() => NEA.of(`missing ${name} documentation`))(A.head(es.getLeadingCommentRanges())),
    RE.chain(commentRange => getCommentInfo(name, commentRange.getText())),
    RE.map(info =>
      makeExport(makeDocumentable(name, info.description, info.since, info.deprecated, info.examples), signature)
    )
  )
}

function parseExportDeclaration(ed: ast.ExportDeclaration): Parser<Array<Export>> {
  return traverse(ed.getNamedExports(), parseExportSpecifier)
}

/**
 * @since 0.2.0
 */
export function getExports(sourceFile: ast.SourceFile): Parser<Array<Export>> {
  const exportDeclarations = sourceFile.getExportDeclarations()
  return pipe(traverse(exportDeclarations, parseExportDeclaration), RE.map(A.flatten))
}

function getTypeParameters(typeParameters: Array<ast.TypeParameterDeclaration>): string {
  return typeParameters.length === 0 ? '' : '<' + typeParameters.map(p => p.getName()).join(', ') + '>'
}

function getConstructorDeclarationSignature(c: ast.ConstructorDeclaration): string {
  const text = c.getText()
  const body = c.compilerNode.body
  if (body === undefined) {
    return text
  }
  const end = body.getStart() - c.getStart() - 1
  return text.substring(0, end)
}

function getClassDeclarationSignature(c: ast.ClassDeclaration): string {
  const dataName = c.getName()
  const typeParameters = getTypeParameters(c.getTypeParameters())
  const constructors = c.getConstructors()
  if (constructors.length > 0) {
    const constructorSignature = getConstructorDeclarationSignature(constructors[0])
    return `export declare class ${dataName}${typeParameters} { ${constructorSignature} }`
  } else {
    return `export declare class ${dataName}${typeParameters}`
  }
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

function parseMethod(md: ast.MethodDeclaration): Parser<Method> {
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
      return makeMethod(
        makeDocumentable(name, info.description, info.since, info.deprecated, info.examples),
        signatures
      )
    })
  )
}

function parseProperty(pd: ast.PropertyDeclaration): Parser<Property> {
  const name = pd.getName()
  return pipe(
    getCommentInfo(name, getJSDocText(pd.getJsDocs())),
    RE.map(info => {
      const type = stripImportTypes(pd.getType().getText(pd))
      const readonly = pd.getFirstModifierByKind(ast.ts.SyntaxKind.ReadonlyKeyword) === undefined ? '' : 'readonly '
      const signature = `${readonly}${name}: ${type}`
      return makeProperty(
        makeDocumentable(name, info.description, info.since, info.deprecated, info.examples),
        signature
      )
    })
  )
}

function parseClass(c: ast.ClassDeclaration): Parser<Class> {
  const name = c.getName()
  if (name === undefined) {
    return env => E.left([`Missing class name in module ${env.moduleName}`])
  } else {
    return pipe(
      getCommentInfo(name, getJSDocText(c.getJsDocs())),
      RE.chain(info => {
        const signature = getClassDeclarationSignature(c)
        return pipe(
          sequenceS(RE.readerEither)({
            methods: traverse(c.getInstanceMethods(), parseMethod),
            staticMethods: traverse(c.getStaticMethods(), parseMethod),
            properties: traverse(
              c
                .getProperties()
                // take public, instance properties
                .filter(p => !p.isStatic() && p.getFirstModifierByKind(ast.ts.SyntaxKind.PrivateKeyword) === undefined),
              parseProperty
            )
          }),
          RE.map(({ methods, staticMethods, properties }) =>
            makeClass(
              makeDocumentable(name, info.description, info.since, info.deprecated, info.examples),
              signature,
              methods,
              staticMethods,
              properties
            )
          )
        )
      })
    )
  }
}

/**
 * @since 0.2.0
 */
export function getClasses(sourceFile: ast.SourceFile): Parser<Array<Class>> {
  const exportedClasses = sourceFile.getClasses().filter(c => c.isExported())

  return pipe(
    traverse(exportedClasses, cd => parseClass(cd)),
    RE.map(classes => classes.sort(byName.compare))
  )
}

/**
 * @since 0.2.0
 */
export function getModuleDocumentation(sourceFile: ast.SourceFile): Parser<Documentable> {
  return env => {
    const x = sourceFile.getStatements()
    if (x.length > 0) {
      const comments = x[0].getLeadingCommentRanges()
      if (comments.length > 0) {
        const e = getCommentInfo(env.moduleName, comments[0].getText())(env)
        if (E.isLeft(e)) {
          return E.left([`missing @since tag in ${env.moduleName} module documentation`])
        }
        const info = e.right
        return E.right(makeDocumentable(env.moduleName, info.description, info.since, info.deprecated, info.examples))
      }
    }
    return E.left([`missing documentation in ${env.moduleName} module`])
  }
}

function parseModule(path: Array<string>, sourceFile: ast.SourceFile): Parser<Module> {
  return pipe(
    sequenceS(monadParser)({
      interfaces: getInterfaces(sourceFile),
      functions: getFunctions(sourceFile),
      typeAliases: getTypeAliases(sourceFile),
      classes: getClasses(sourceFile),
      constants: getConstants(sourceFile),
      exports: getExports(sourceFile)
    }),
    RE.chain(({ interfaces, functions, typeAliases, classes, constants, exports }) => {
      return pipe(
        getModuleDocumentation(sourceFile),
        RE.map(documentation =>
          makeModule(documentation, path, interfaces, typeAliases, functions, classes, constants, exports)
        )
      )
    })
  )
}

function getModuleName(path: Array<string>): string {
  return P.parse(path[path.length - 1]).name
}

/**
 * @since 0.5.0
 */
export function parseFiles(files: Array<File>): E.Either<NEA.NonEmptyArray<string>, Array<Module>> {
  const project = new ast.Project()
  files.forEach(file => {
    project.addSourceFileAtPath(file.path)
  })
  return pipe(
    A.array.traverse(E.getValidation(monoidFailure))(files, file => {
      const sourceFile = project.getSourceFile(file.path)!
      const path = file.path.split(P.sep)
      const moduleName = getModuleName(path)
      const env: Env = {
        moduleName
      }
      return parseModule(path, sourceFile)(env)
    }),
    E.map(modules => sortModules(modules.filter(module => !module.deprecated)))
  )
}
