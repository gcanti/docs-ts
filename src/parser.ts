import * as doctrine from 'doctrine'
import { sequenceT } from 'fp-ts/lib/Apply'
import { array } from 'fp-ts/lib/Array'
import { getArrayMonoid } from 'fp-ts/lib/Monoid'
import { fromNullable, none, Option, some } from 'fp-ts/lib/Option'
import { ordString, contramap } from 'fp-ts/lib/Ord'
import { isEmpty } from 'fp-ts/lib/Record'
import { getTraversableComposition } from 'fp-ts/lib/Traversable2v'
import { Forest, Tree, tree } from 'fp-ts/lib/Tree'
import { failure, getMonad, success, Validation, getMonoid } from 'fp-ts/lib/Validation'
import * as fs from 'fs'
import * as glob from 'glob'
import Ast, * as ast from 'ts-simple-ast'
import * as path from 'path'

interface Dir {
  [key: string]: Dir
}

export function fromPaths(paths: Array<string>): Dir {
  const dir: Dir = {}
  let current: Dir = dir
  for (const path of paths) {
    const names = path.split('/')
    for (const name of names) {
      if (current.hasOwnProperty(name)) {
        current = current[name]
      } else {
        current = current[name] = {}
      }
    }
    current = dir
  }
  return dir
}

export type File =
  | {
      readonly type: 'Directory'
      readonly path: Array<string>
      readonly children: Array<string>
    }
  | {
      readonly type: 'File'
      readonly path: Array<string>
    }

export function directory(path: Array<string>, children: Array<string>): File {
  return { type: 'Directory', path, children }
}

export function file(path: Array<string>): File {
  return { type: 'File', path }
}

export function fromDir(dir: Dir): Forest<File> {
  function toForest(path: Array<string>, dir: Dir): Forest<File> {
    return Object.keys(dir)
      .sort(ordString.compare)
      .map(name => toTree(path, name, dir[name]))
  }
  function toTree(parent: Array<string>, name: string, dir: Dir): Tree<File> {
    const path = [...parent, name]
    return isEmpty(dir) ? new Tree(file(path), []) : new Tree(directory(path, Object.keys(dir)), toForest(path, dir))
  }
  return toForest([], dir)
}

function fromPattern(pattern: string): Forest<File> {
  return fromDir(fromPaths(glob.sync(pattern)))
}

type Parser<A> = Validation<Array<string>, A>

function readFileSync(path: string): Parser<string> {
  try {
    return success(fs.readFileSync(path, { encoding: 'utf8' }))
  } catch (e) {
    return failure([`Cannot open file ${path}: ${e}`])
  }
}

export interface Location {
  readonly from: number
  readonly to: number
}

export function location(from: number, to: number): Location {
  return { from, to }
}

export interface Documentable {
  readonly name: string
  readonly description: Option<string>
  readonly since: Option<string>
  readonly location: Location
  readonly deprecated: boolean
  readonly example: Option<string>
}

export function documentable(
  name: string,
  description: Option<string>,
  since: Option<string>,
  location: Location,
  deprecated: boolean,
  example: Option<string>
): Documentable {
  return { name, description, since, location, deprecated, example }
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

export type Node =
  | {
      readonly type: 'Index'
      readonly path: Array<string>
      readonly children: Array<string>
    }
  | {
      readonly type: 'Module'
      readonly path: Array<string>
      readonly description: Option<string>
      readonly interfaces: Array<Interface>
      readonly typeAliases: Array<TypeAlias>
      readonly functions: Array<Func>
      readonly classes: Array<Class>
      readonly constants: Array<Constant>
    }

export function index(path: Array<string>, children: Array<string>): Node {
  return { type: 'Index', path, children }
}

export function module(
  path: Array<string>,
  description: Option<string>,
  interfaces: Array<Interface>,
  typeAliases: Array<TypeAlias>,
  functions: Array<Func>,
  classes: Array<Class>,
  constants: Array<Constant>
): Node {
  return { type: 'Module', path, description, interfaces, typeAliases, functions, classes, constants }
}

export function fold<R>(
  fa: Node,
  onIndex: (path: Array<string>, children: Array<string>) => R,
  onModule: (
    path: Array<string>,
    description: Option<string>,
    interfaces: Array<Interface>,
    typeAliases: Array<TypeAlias>,
    functions: Array<Func>,
    classes: Array<Class>,
    constants: Array<Constant>
  ) => R
): R {
  switch (fa.type) {
    case 'Index':
      return onIndex(fa.path, fa.children)
    case 'Module':
      return onModule(fa.path, fa.description, fa.interfaces, fa.typeAliases, fa.functions, fa.classes, fa.constants)
  }
}

const monoidFailure = getArrayMonoid<string>()

export const monadParser = getMonad(monoidFailure)

export function fromForest(forest: Forest<File>): Parser<Forest<Node>> {
  const traverse = getTraversableComposition(array, tree).traverse(monadParser)
  return traverse(forest, file => {
    return file.type === 'Directory'
      ? success(index(file.path, file.children))
      : monadParser.chain(readFileSync(file.path.join('/')), source => parse(file, source))
  })
}

export function run(pattern: string): Parser<Forest<Node>> {
  return fromForest(fromPattern(pattern))
}

export function getSourceFile(name: string, source: string): ast.SourceFile {
  return new Ast().createSourceFile(`${name}.ts`, source)
}

export function getModuleName(p: Array<string>): string {
  return path.parse(p[p.length - 1]).name
}

function getLocation(node: ast.Node): Location {
  return {
    from: node.getStartLineNumber(),
    to: node.getEndLineNumber()
  }
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

function getExample(annotation: doctrine.Annotation): Option<string> {
  return fromNullable(annotation.tags.filter(tag => tag.title === 'example')[0]).mapNullable(tag => tag.description)
}

function getAnnotationInfo(
  annotation: doctrine.Annotation
): {
  description: Option<string>
  since: Option<string>
  deprecated: boolean
  example: Option<string>
} {
  return {
    description: getDescription(annotation),
    since: getSince(annotation),
    deprecated: isDeprecated(annotation),
    example: getExample(annotation)
  }
}

function parseInterfaceDeclaration(id: ast.InterfaceDeclaration): Parser<Interface> {
  const annotation = getAnnotation(id.getJsDocs())
  const { description, since, deprecated, example } = getAnnotationInfo(annotation)
  const signature = id.getText()
  return success(
    interface_(documentable(id.getName(), description, since, getLocation(id), deprecated, example), signature)
  )
}

export function getInterfaces(sourceFile: ast.SourceFile): Parser<Array<Interface>> {
  const exportedInterfaceDeclarations = sourceFile.getInterfaces().filter(id => id.isExported())
  return array
    .traverse(monadParser)(exportedInterfaceDeclarations, parseInterfaceDeclaration)
    .map(interfaces => interfaces.sort(byName.compare))
}

function getFunctionDeclarationSignature(f: ast.FunctionDeclaration): string {
  const text = f.getText()
  const end = text.indexOf('{')
  return `${text.substring(0, end === -1 ? text.length : end).trim()} { ... }`
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
  const { description, since, deprecated, example } = getAnnotationInfo(annotation)
  const overloads = fd.getOverloads()
  const signature = getFunctionDeclarationSignature(fd)
  const signatures = overloads.length === 0 ? [signature] : [...overloads.map(fd => fd.getText()), signature]
  const name = fd.getName()
  if (name === undefined || name.trim() === '') {
    return failure([`Missing function name in module ${moduleName}`])
  } else {
    return success(func(documentable(name, description, since, getLocation(fd), deprecated, example), signatures))
  }
}

function parseFunctionVariableDeclaration(vd: ast.VariableDeclaration): Parser<Func> {
  const vs: any = vd.getParent().getParent()
  const annotation = getAnnotation(vs.getJsDocs())
  const { description, since, deprecated, example } = getAnnotationInfo(annotation)
  const signatures = [getFunctionVariableDeclarationSignature(vd)]
  const name = vd.getName()
  return success(func(documentable(name, description, since, getLocation(vd), deprecated, example), signatures))
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
  const { description, since, deprecated, example } = getAnnotationInfo(annotation)
  const signature = ta.getText()
  const name = ta.getName()
  return success(typeAlias(documentable(name, description, since, getLocation(ta), deprecated, example), signature))
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
  const { description, since, deprecated, example } = getAnnotationInfo(annotation)
  const signature = getConstantVariableDeclarationSignature(vd)
  const name = vd.getName()
  return success(constant(documentable(name, description, since, getLocation(vd), deprecated, example), signature))
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

function getTypeParameters(typeParameters: Array<ast.TypeParameterDeclaration>): string {
  return typeParameters.length === 0 ? '' : '<' + typeParameters.map(p => p.getName()).join(', ') + '>'
}

function getClassDeclarationSignature(c: ast.ClassDeclaration): string {
  const dataName = c.getName()
  const typeParameters = getTypeParameters(c.getTypeParameters())
  const constructors = c.getConstructors()
  if (constructors.length > 0) {
    return `export class ${dataName}${typeParameters} {\n  ${c.getConstructors()[0].getText()}\n  ... \n}`
  } else {
    return `export class ${dataName}${typeParameters} { ... }`
  }
}

function getMethodSignature(md: ast.MethodDeclaration): string {
  const text = md.getText()
  const end = text.indexOf('{')
  return `${text.substring(0, end).trim()} { ... }`
}

function parseMethod(md: ast.MethodDeclaration): Parser<Method> {
  const name = md.getName()
  const overloads = md.getOverloads()
  const annotation = overloads.length === 0 ? getAnnotation(md.getJsDocs()) : getAnnotation(overloads[0].getJsDocs())
  const { description, since, deprecated, example } = getAnnotationInfo(annotation)
  const signature = getMethodSignature(md)
  const signatures = overloads.length === 0 ? [signature] : [...overloads.map(md => md.getText()), signature]
  return success(method(documentable(name, description, since, getLocation(md), deprecated, example), signatures))
}

function parseClass(moduleName: string, c: ast.ClassDeclaration): Parser<Class> {
  const name = c.getName()
  if (name === undefined) {
    return failure([`Missing class name in module ${moduleName}`])
  } else {
    const annotation = getAnnotation(c.getJsDocs())
    const { description, since, deprecated, example } = getAnnotationInfo(annotation)
    const signature = getClassDeclarationSignature(c)
    const methods = array.traverse(monadParser)(c.getInstanceMethods(), parseMethod)
    const staticMethods = array.traverse(monadParser)(c.getStaticMethods(), parseMethod)
    return monadParser.ap(
      methods.map(methods => (staticMethods: Array<Method>) =>
        class_(
          documentable(name, description, since, getLocation(c), deprecated, example),
          signature,
          methods,
          staticMethods
        )
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

export function getModuleDescription(sourceFile: ast.SourceFile): Option<string> {
  const x = sourceFile.getStatements()
  if (x.length > 0) {
    const comments = x[0].getLeadingCommentRanges()
    if (comments.length > 0) {
      const text = comments[0].getText()
      const annotation = doctrine.parse(text, { unwrap: true })
      return getFile(annotation)
    }
    return none
  } else {
    return none
  }
}

export function parse(file: File, source: string): Parser<Node> {
  const moduleName = getModuleName(file.path)
  const sourceFile = getSourceFile(moduleName, source)
  return sequenceT(monadParser)(
    getInterfaces(sourceFile),
    getFunctions(moduleName, sourceFile),
    getTypeAliases(sourceFile),
    getClasses(moduleName, sourceFile),
    getConstants(sourceFile)
  ).map(([interfaces, functions, typeAliases, classes, constants]) =>
    module(file.path, getModuleDescription(sourceFile), interfaces, typeAliases, functions, classes, constants)
  )
}
