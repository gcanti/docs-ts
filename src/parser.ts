/**
 * @file parser utilities
 */

import * as doctrine from 'doctrine'
import { sequenceS } from 'fp-ts/lib/Apply'
import { array, sort } from 'fp-ts/lib/Array'
import { getArrayMonoid } from 'fp-ts/lib/Monoid'
import { fromNullable, none, Option, some } from 'fp-ts/lib/Option'
import { contramap, Ord, ordString } from 'fp-ts/lib/Ord'
import { failure, getMonad, getMonoid, success, Validation } from 'fp-ts/lib/Validation'
import * as path from 'path'
import Ast, * as ast from 'ts-simple-ast'

export type Parser<A> = Validation<Array<string>, A>

export interface File {
  path: string
  content: string
}

export type Example = string

export function example(code: string): Example {
  return code
}

export interface Documentable {
  readonly name: string
  readonly description: Option<string>
  readonly since: Option<string>
  readonly deprecated: boolean
  readonly examples: Array<Example>
}

export function documentable(
  name: string,
  description: Option<string>,
  since: Option<string>,
  deprecated: boolean,
  examples: Array<Example>
): Documentable {
  return { name, description, since, deprecated, examples }
}

export interface Interface extends Documentable {
  signature: string
}

export function interface_(documentable: Documentable, signature: string): Interface {
  return { ...documentable, signature }
}

export interface Func extends Documentable {
  readonly signatures: Array<string>
}

export function func(documentable: Documentable, signatures: Array<string>): Func {
  return { ...documentable, signatures }
}

export interface Method extends Documentable {
  readonly signatures: Array<string>
}

export function method(documentable: Documentable, signatures: Array<string>): Method {
  return { ...documentable, signatures }
}

export interface Class extends Documentable {
  readonly signature: string
  readonly methods: Array<Method>
  readonly staticMethods: Array<Method>
}

export function class_(
  documentable: Documentable,
  signature: string,
  methods: Array<Method>,
  staticMethods: Array<Method>
): Class {
  return { ...documentable, signature, methods, staticMethods }
}

export interface TypeAlias extends Documentable {
  readonly signature: string
}

export function typeAlias(documentable: Documentable, signature: string): TypeAlias {
  return { ...documentable, signature }
}

export interface Constant extends Documentable {
  readonly signature: string
}

export function constant(documentable: Documentable, signature: string): Constant {
  return { ...documentable, signature }
}

export interface Export extends Documentable {
  readonly signature: string
}

export function export_(documentable: Documentable, signature: string): Export {
  return { ...documentable, signature }
}

export interface Module {
  readonly path: Array<string>
  readonly description: Option<string>
  readonly interfaces: Array<Interface>
  readonly typeAliases: Array<TypeAlias>
  readonly functions: Array<Func>
  readonly classes: Array<Class>
  readonly constants: Array<Constant>
  readonly exports: Array<Export>
  readonly deprecated: boolean
}

export function module(
  path: Array<string>,
  description: Option<string>,
  interfaces: Array<Interface>,
  typeAliases: Array<TypeAlias>,
  functions: Array<Func>,
  classes: Array<Class>,
  constants: Array<Constant>,
  exports: Array<Export>,
  deprecated: boolean
): Module {
  return { path, description, interfaces, typeAliases, functions, classes, constants, exports, deprecated }
}

const ordModule: Ord<Module> = contramap((module: Module) => module.path.join('/').toLowerCase(), ordString)

const sortModules = sort(ordModule)

const monoidFailure = getArrayMonoid<string>()

export const monadParser = getMonad(monoidFailure)

export function run(files: Array<File>): Parser<Array<Module>> {
  return array
    .traverse(monadParser)(files, file => parse(file.path.split(path.sep), file.content))
    .map(modules => sortModules(modules.filter(module => !module.deprecated)))
}

export function getSourceFile(name: string, source: string): ast.SourceFile {
  return new Ast().createSourceFile(`${name}.ts`, source)
}

export function getModuleName(p: Array<string>): string {
  return path.parse(p[p.length - 1]).name
}

function getAnnotation(jsdocs: Array<ast.JSDoc>): doctrine.Annotation {
  const content = jsdocs.map(doc => doc.getText()).join('\n')
  return doctrine.parse(content, { unwrap: true })
}

function getDescription(annotation: doctrine.Annotation): Option<string> {
  return fromNullable(annotation.description).filter(s => s !== '')
}

function getFile(annotation: doctrine.Annotation): Option<string> {
  return fromNullable(annotation.tags.filter(tag => tag.title === 'file')[0]).mapNullable(tag => tag.description)
}

function getSince(annotation: doctrine.Annotation): Option<string> {
  return fromNullable(annotation.tags.filter(tag => tag.title === 'since')[0]).mapNullable(tag => tag.description)
}

function isDeprecated(annotation: doctrine.Annotation): boolean {
  return fromNullable(annotation.tags.filter(tag => tag.title === 'deprecated')[0]).isSome()
}

function isInternal(annotation: doctrine.Annotation): boolean {
  return fromNullable(annotation.tags.filter(tag => tag.title === 'internal')[0]).isSome()
}

function getExamples(annotation: doctrine.Annotation): Array<Example> {
  return annotation.tags.filter(tag => tag.title === 'example').map(tag => fromNullable(tag.description).getOrElse(''))
}

function getAnnotationInfo(
  annotation: doctrine.Annotation
): {
  description: Option<string>
  since: Option<string>
  deprecated: boolean
  examples: Array<Example>
} {
  return {
    description: getDescription(annotation),
    since: getSince(annotation),
    deprecated: isDeprecated(annotation),
    examples: getExamples(annotation)
  }
}

function parseInterfaceDeclaration(id: ast.InterfaceDeclaration): Parser<Interface> {
  const annotation = getAnnotation(id.getJsDocs())
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const signature = id.getText()
  return success(interface_(documentable(id.getName(), description, since, deprecated, examples), signature))
}

export function getInterfaces(sourceFile: ast.SourceFile): Parser<Array<Interface>> {
  const exportedInterfaceDeclarations = sourceFile.getInterfaces().filter(id => id.isExported())
  return array
    .traverse(monadParser)(exportedInterfaceDeclarations, parseInterfaceDeclaration)
    .map(interfaces => interfaces.sort(byName.compare))
}

function getFunctionDeclarationSignature(f: ast.FunctionDeclaration): string {
  const text = f.getText()
  const body = f.compilerNode.body
  if (body === undefined) {
    return text + ' { ... }'
  }
  const end = body.getStart() - f.getStart() - 1
  return text.substring(0, end) + ' { ... }'
}

const indexOf = (big: string, small: string) => {
  const i = big.indexOf(small)
  return i !== -1 ? some(i) : none
}

const lastIndexOf = (big: string, small: string) => {
  const i = big.lastIndexOf(small)
  return i !== -1 ? some(i) : none
}

function getFunctionVariableDeclarationSignature(vd: ast.VariableDeclaration): string {
  const text = vd.getText()
  const end = indexOf(text, ' => {').orElse(() => lastIndexOf(text, ' =>'))
  return `export const ${text.substring(0, end.getOrElse(text.length))} => ...`
}

function getFunctionDeclarationAnnotation(fd: ast.FunctionDeclaration): doctrine.Annotation {
  const overloads = fd.getOverloads()
  return overloads.length === 0 ? getAnnotation(fd.getJsDocs()) : getAnnotation(overloads[0].getJsDocs())
}

function parseFunctionDeclaration(moduleName: string, fd: ast.FunctionDeclaration): Parser<Func> {
  const annotation = getFunctionDeclarationAnnotation(fd)
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const overloads = fd.getOverloads()
  const signatures =
    overloads.length === 0
      ? [getFunctionDeclarationSignature(fd)]
      : [
          ...overloads.slice(0, overloads.length - 1).map(fd => fd.getText()),
          getFunctionDeclarationSignature(overloads[overloads.length - 1])
        ]
  const name = fd.getName()
  if (name === undefined || name.trim() === '') {
    return failure([`Missing function name in module ${moduleName}`])
  } else {
    return success(func(documentable(name, description, since, deprecated, examples), signatures))
  }
}

function parseFunctionVariableDeclaration(vd: ast.VariableDeclaration): Parser<Func> {
  const vs: any = vd.getParent().getParent()
  const annotation = getAnnotation(vs.getJsDocs())
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const signatures = [getFunctionVariableDeclarationSignature(vd)]
  const name = vd.getName()
  return success(func(documentable(name, description, since, deprecated, examples), signatures))
}

const byName = contramap((x: { name: string }) => x.name, ordString)

export function getFunctions(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Func>> {
  const exportedFunctionDeclarations = sourceFile
    .getFunctions()
    .filter(fd => fd.isExported() && !isInternal(getFunctionDeclarationAnnotation(fd)))

  const functionDeclarations = array.traverse(monadParser)(exportedFunctionDeclarations, fd =>
    parseFunctionDeclaration(moduleName, fd)
  )

  const exportedVariableDeclarations = sourceFile.getVariableDeclarations().filter(vd => {
    const vs: ast.VariableStatement = vd.getParent().getParent()
    const annotation = getAnnotation(vs.getJsDocs())
    const initializer = vd.getInitializer()
    return (
      !isInternal(annotation) &&
      initializer !== undefined &&
      vs.isExported() &&
      ast.TypeGuards.isFunctionLikeDeclaration(initializer)
    )
  })

  const variableDeclarations = array.traverse(monadParser)(
    exportedVariableDeclarations,
    parseFunctionVariableDeclaration
  )

  const monoidFunc = getMonoid(monoidFailure, getArrayMonoid<Func>())
  return monoidFunc.concat(functionDeclarations, variableDeclarations).map(funcs => funcs.sort(byName.compare))
}

function getTypeAliasesAnnotation(ta: ast.TypeAliasDeclaration): doctrine.Annotation {
  return getAnnotation(ta.getJsDocs())
}

function parseTypeAliasDeclaration(ta: ast.TypeAliasDeclaration): Parser<TypeAlias> {
  const annotation = getTypeAliasesAnnotation(ta)
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const signature = ta.getText()
  const name = ta.getName()
  return success(typeAlias(documentable(name, description, since, deprecated, examples), signature))
}

export function getTypeAliases(sourceFile: ast.SourceFile): Parser<Array<TypeAlias>> {
  const exportedTypeAliasDeclarations = sourceFile
    .getTypeAliases()
    .filter(ta => ta.isExported() && !isInternal(getTypeAliasesAnnotation(ta)))

  return array
    .traverse(monadParser)(exportedTypeAliasDeclarations, ta => parseTypeAliasDeclaration(ta))
    .map(typeAliases => typeAliases.sort(byName.compare))
}

function getConstantVariableDeclarationSignature(vd: ast.VariableDeclaration): string {
  const text = vd.getText()
  const end = text.indexOf(' = ')
  return `export const ${text.substring(0, end)} = ...`
}

function parseConstantVariableDeclaration(vd: ast.VariableDeclaration): Parser<Constant> {
  const vs: any = vd.getParent().getParent()
  const annotation = getAnnotation(vs.getJsDocs())
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const signature = getConstantVariableDeclarationSignature(vd)
  const name = vd.getName()
  return success(constant(documentable(name, description, since, deprecated, examples), signature))
}

export function getConstants(sourceFile: ast.SourceFile): Parser<Array<Constant>> {
  const exportedVariableDeclarations = sourceFile.getVariableDeclarations().filter(vd => {
    const vs: ast.VariableStatement = vd.getParent().getParent()
    const annotation = getAnnotation(vs.getJsDocs())
    const initializer = vd.getInitializer()
    return (
      !isInternal(annotation) &&
      initializer !== undefined &&
      vs.isExported() &&
      !ast.TypeGuards.isFunctionLikeDeclaration(initializer)
    )
  })

  return array
    .traverse(monadParser)(exportedVariableDeclarations, parseConstantVariableDeclaration)
    .map(constants => constants.sort(byName.compare))
}

function parseExportDeclaration(ed: ast.ExportDeclaration): Parser<Export> {
  const signature = ed.getText()
  const specifier = ed.getNamedExports()[0]
  const name = specifier.compilerNode.name.text
  const comments = ed.getLeadingCommentRanges()
  if (comments.length > 0) {
    const text = comments[0].getText()
    const annotation = doctrine.parse(text, { unwrap: true })
    const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
    return success(export_(documentable(name, description, since, deprecated, examples), signature))
  } else {
    return success(export_(documentable(name, none, none, false, []), signature))
  }
}

export function getExports(sourceFile: ast.SourceFile): Parser<Array<Export>> {
  const exportDeclarations = sourceFile.getExportDeclarations().filter(ed => ed.getNamedExports().length === 1)
  return array
    .traverse(monadParser)(exportDeclarations, parseExportDeclaration)
    .map(exports => exports.sort(byName.compare))
}

function getTypeParameters(typeParameters: Array<ast.TypeParameterDeclaration>): string {
  return typeParameters.length === 0 ? '' : '<' + typeParameters.map(p => p.getName()).join(', ') + '>'
}

function getConstructorDeclarationSignature(c: ast.ConstructorDeclaration): string {
  const text = c.getText()
  const body = c.compilerNode.body
  if (body === undefined) {
    return text + ' { ... }'
  }
  const end = body.getStart() - c.getStart() - 1
  return text.substring(0, end) + ' { ... }'
}

function getClassDeclarationSignature(c: ast.ClassDeclaration): string {
  const dataName = c.getName()
  const typeParameters = getTypeParameters(c.getTypeParameters())
  const constructors = c.getConstructors()
  if (constructors.length > 0) {
    const constructorSignature = getConstructorDeclarationSignature(constructors[0])
    return `export class ${dataName}${typeParameters} {\n  ${constructorSignature}\n  ... \n}`
  } else {
    return `export class ${dataName}${typeParameters} { ... }`
  }
}

function getMethodSignature(md: ast.MethodDeclaration): string {
  const text = md.getText()
  const body = md.compilerNode.body
  if (body === undefined) {
    return text + ' { ... }'
  }
  const end = body.getStart() - md.getStart() - 1
  return text.substring(0, end) + ' { ... }'
}

function parseMethod(md: ast.MethodDeclaration): Parser<Method> {
  const name = md.getName()
  const overloads = md.getOverloads()
  const annotation = overloads.length === 0 ? getAnnotation(md.getJsDocs()) : getAnnotation(overloads[0].getJsDocs())
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const signatures =
    overloads.length === 0
      ? [getMethodSignature(md)]
      : [
          ...overloads.slice(0, overloads.length - 1).map(md => md.getText()),
          getMethodSignature(overloads[overloads.length - 1])
        ]
  return success(method(documentable(name, description, since, deprecated, examples), signatures))
}

function parseClass(moduleName: string, c: ast.ClassDeclaration): Parser<Class> {
  const name = c.getName()
  if (name === undefined) {
    return failure([`Missing class name in module ${moduleName}`])
  } else {
    const annotation = getAnnotation(c.getJsDocs())
    const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
    const signature = getClassDeclarationSignature(c)
    const methods = array.traverse(monadParser)(c.getInstanceMethods(), parseMethod)
    const staticMethods = array.traverse(monadParser)(c.getStaticMethods(), parseMethod)
    return monadParser.ap(
      methods.map(methods => (staticMethods: Array<Method>) =>
        class_(documentable(name, description, since, deprecated, examples), signature, methods, staticMethods)
      ),
      staticMethods
    )
  }
}

export function getClasses(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Class>> {
  const exportedClasses = sourceFile.getClasses().filter(c => c.isExported())

  return array
    .traverse(monadParser)(exportedClasses, cd => parseClass(moduleName, cd))
    .map(classes => classes.sort(byName.compare))
}

export function getModuleInfo(sourceFile: ast.SourceFile): { description: Option<string>; deprecated: boolean } {
  const x = sourceFile.getStatements()
  if (x.length > 0) {
    const comments = x[0].getLeadingCommentRanges()
    if (comments.length > 0) {
      const text = comments[0].getText()
      const annotation = doctrine.parse(text, { unwrap: true })
      const description = getFile(annotation)
      return {
        description,
        deprecated: isDeprecated(annotation)
      }
    }
  }
  return {
    description: none,
    deprecated: false
  }
}

export function parse(path: Array<string>, source: string): Parser<Module> {
  const moduleName = getModuleName(path)
  const sourceFile = getSourceFile(moduleName, source)
  return sequenceS(monadParser)({
    interfaces: getInterfaces(sourceFile),
    functions: getFunctions(moduleName, sourceFile),
    typeAliases: getTypeAliases(sourceFile),
    classes: getClasses(moduleName, sourceFile),
    constants: getConstants(sourceFile),
    exports: getExports(sourceFile)
  }).map(({ interfaces, functions, typeAliases, classes, constants, exports }) => {
    const { description, deprecated } = getModuleInfo(sourceFile)
    return module(path, description, interfaces, typeAliases, functions, classes, constants, exports, deprecated)
  })
}
