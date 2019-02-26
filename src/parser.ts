import * as doctrine from 'doctrine'
import { sequenceT } from 'fp-ts/lib/Apply'
import { array } from 'fp-ts/lib/Array'
import { getArrayMonoid } from 'fp-ts/lib/Monoid'
import { fromNullable, none, Option, some } from 'fp-ts/lib/Option'
import { ordString } from 'fp-ts/lib/Ord'
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

/*

  data File = Directory {
    path :: Array string,
    children :: Array string
  } | File { path :: Array string }

*/
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

export function foldFile<R>(
  fa: File,
  onDirectory: (path: Array<string>, children: Array<string>) => R,
  onFile: (path: Array<string>) => R
): R {
  switch (fa.type) {
    case 'Directory':
      return onDirectory(fa.path, fa.children)
    case 'File':
      return onFile(fa.path)
  }
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

export function fromPattern(pattern: string): Forest<File> {
  return fromDir(fromPaths(glob.sync(pattern)))
}

export function readFileSync(path: string): Validation<Array<string>, string> {
  try {
    return success(fs.readFileSync(path, { encoding: 'utf8' }))
  } catch (e) {
    return failure([`Cannot open file ${path}: ${e}`])
  }
}

/*

  data Location = Location {
    from :: number,
    to :: number
  }

*/
export type Location = {
  readonly from: number
  readonly to: number
}

export function location(from: number, to: number): Location {
  return { from, to }
}

/*

  data Interface = Interface {
    name :: string,
    signature :: string,
    description :: Option string,
    since :: Option string,
    location :: Location,
    deprecated :: boolean
  }

*/
export type Interface = {
  readonly name: string
  readonly signature: string
  readonly description: Option<string>
  readonly since: Option<string>
  readonly location: Location
  readonly deprecated: boolean
}

export function interface_(
  name: string,
  signature: string,
  description: Option<string>,
  since: Option<string>,
  location: Location,
  deprecated: boolean
): Interface {
  return { name, signature, description, since, location, deprecated }
}

/*

  data Func = Func {
    name :: string,
    signature :: string,
    description :: Option string,
    since :: Option string,
    location :: Location,
    deprecated :: boolean,
    example :: Option string
  }

*/
export type Func = {
  readonly name: string
  readonly signature: string
  readonly description: Option<string>
  readonly since: Option<string>
  readonly location: Location
  readonly deprecated: boolean
  readonly example: Option<string>
}

export function func(
  name: string,
  signature: string,
  description: Option<string>,
  since: Option<string>,
  location: Location,
  deprecated: boolean,
  example: Option<string>
): Func {
  return { name, signature, description, since, location, deprecated, example }
}

/*

  data Method = Method {
    name :: string,
    signature :: string,
    description :: Option string,
    since :: Option string,
    location :: Location,
    deprecated :: boolean,
    example :: Option string,
  }

*/
export type Method = {
  readonly name: string
  readonly signature: string
  readonly description: Option<string>
  readonly since: Option<string>
  readonly location: Location
  readonly deprecated: boolean
  readonly example: Option<string>
}

export function method(
  name: string,
  signature: string,
  description: Option<string>,
  since: Option<string>,
  location: Location,
  deprecated: boolean,
  example: Option<string>
): Method {
  return { name, signature, description, since, location, deprecated, example }
}

/*

  data Class = Class {
    name :: string,
    signature :: string,
    description :: Option string,
    since :: Option string,
    location :: Location,
    deprecated :: boolean,
    example :: Option string,
    methods :: Array Method
  }

*/
export type Class = {
  readonly name: string
  readonly signature: string
  readonly description: Option<string>
  readonly since: Option<string>
  readonly location: Location
  readonly deprecated: boolean
  readonly example: Option<string>
  readonly methods: Array<Method>
}

export function class_(
  name: string,
  signature: string,
  description: Option<string>,
  since: Option<string>,
  location: Location,
  deprecated: boolean,
  example: Option<string>,
  methods: Array<Method>
): Class {
  return { name, signature, description, since, location, deprecated, example, methods }
}

/*
  data Node =
      Index {
        path :: Array string,
        children :: Array string
      }
    | Module {
      path :: Array string,
      interfaces :: Array Interface,
      functions :: Array Func,
      classes :: Array Class
    }
*/
export type Node =
  | {
      readonly type: 'Index'
      readonly path: Array<string>
      readonly children: Array<string>
    }
  | {
      readonly type: 'Module'
      readonly path: Array<string>
      readonly interfaces: Array<Interface>
      readonly functions: Array<Func>
      readonly classes: Array<Class>
    }

export function index(path: Array<string>, children: Array<string>): Node {
  return { type: 'Index', path, children }
}

export function module(
  path: Array<string>,
  interfaces: Array<Interface>,
  functions: Array<Func>,
  classes: Array<Class>
): Node {
  return { type: 'Module', path, interfaces, functions, classes }
}

export function fold<R>(
  fa: Node,
  onIndex: (path: Array<string>, children: Array<string>) => R,
  onModule: (path: Array<string>, interfaces: Array<Interface>, functions: Array<Func>, classes: Array<Class>) => R
): R {
  switch (fa.type) {
    case 'Index':
      return onIndex(fa.path, fa.children)
    case 'Module':
      return onModule(fa.path, fa.interfaces, fa.functions, fa.classes)
  }
}

const monoidFailure = getArrayMonoid<string>()

export const monadValidation = getMonad(monoidFailure)

export function fromForest(forest: Forest<File>): Validation<Array<string>, Forest<Node>> {
  const traverse = getTraversableComposition(array, tree).traverse(monadValidation)
  return traverse(forest, file => {
    return file.type === 'Directory'
      ? success(index(file.path, file.children))
      : monadValidation.chain(readFileSync(file.path.join('/')), source => parse(file, source))
  })
}

export function run(pattern: string): Validation<Array<string>, Forest<Node>> {
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
): { description: Option<string>; since: Option<string>; deprecated: boolean; example: Option<string> } {
  return {
    description: getDescription(annotation),
    since: getSince(annotation),
    deprecated: isDeprecated(annotation),
    example: getExample(annotation)
  }
}

function parseInterfaceDeclaration(id: ast.InterfaceDeclaration): Validation<Array<string>, Interface> {
  const annotation = getAnnotation(id.getJsDocs())
  const { description, since, deprecated } = getAnnotationInfo(annotation)
  const signature = id.getText()
  return success({
    name: id.getName(),
    signature,
    description,
    since,
    location: getLocation(id),
    deprecated
  })
}

export function getInterfaces(sourceFile: ast.SourceFile): Validation<Array<string>, Array<Interface>> {
  const exportedInterfaceDeclarations = sourceFile.getInterfaces().filter(id => id.isExported())
  return array.traverse(monadValidation)(exportedInterfaceDeclarations, parseInterfaceDeclaration)
}

function getFunctionDeclarationSignature(f: ast.FunctionDeclaration): string {
  const text = f.getText()
  const end = text.indexOf('{')
  return `${text.substring(0, end === -1 ? text.length : end).trim()}`
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

function parseFunctionDeclaration(moduleName: string, fd: ast.FunctionDeclaration): Validation<Array<string>, Func> {
  const annotation = getFunctionDeclarationAnnotation(fd)
  const { description, since, deprecated, example } = getAnnotationInfo(annotation)
  const signature = getFunctionDeclarationSignature(fd)
  const name = fd.getName()
  if (name === undefined || name.trim() === '') {
    return failure([`Missing function name in module ${moduleName}`])
  } else {
    return success({
      name,
      signature,
      description,
      since,
      location: getLocation(fd),
      deprecated,
      example
    })
  }
}

function parseVariableDeclaration(vd: ast.VariableDeclaration): Validation<Array<string>, Func> {
  const vs: any = vd.getParent().getParent()
  const annotation = getAnnotation(vs.getJsDocs())
  const { description, since, deprecated, example } = getAnnotationInfo(annotation)
  const signature = getFunctionVariableDeclarationSignature(vd)
  const name = vd.getName()
  return success({
    name,
    signature,
    description,
    since,
    location: getLocation(vd),
    deprecated,
    example
  })
}

export function getFunctions(moduleName: string, sourceFile: ast.SourceFile): Validation<Array<string>, Array<Func>> {
  const exportedFunctionDeclarations = sourceFile
    .getFunctions()
    .filter(fd => fd.isExported() && !isInternal(getFunctionDeclarationAnnotation(fd)))

  const functionDeclarations = array.traverse(monadValidation)(exportedFunctionDeclarations, fd =>
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

  const variableDeclarations = array.traverse(monadValidation)(exportedVariableDeclarations, parseVariableDeclaration)

  const monoidFunc = getMonoid(monoidFailure, getArrayMonoid<Func>())
  return monoidFunc.concat(functionDeclarations, variableDeclarations)
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

function parseMethod(md: ast.MethodDeclaration): Validation<Array<string>, Method> {
  const name = md.getName()
  const overloads = md.getOverloads()
  const annotation = overloads.length === 0 ? getAnnotation(md.getJsDocs()) : getAnnotation(overloads[0].getJsDocs())
  const { description, since, deprecated, example } = getAnnotationInfo(annotation)
  const signature = getMethodSignature(md)
  return success(method(name, signature, description, since, getLocation(md), deprecated, example))
}

function parseClass(moduleName: string, c: ast.ClassDeclaration): Validation<Array<string>, Class> {
  const name = c.getName()
  if (name === undefined) {
    return failure([`Missing class name in module ${moduleName}`])
  } else {
    const annotation = getAnnotation(c.getJsDocs())
    const { description, since, deprecated, example } = getAnnotationInfo(annotation)
    const signature = getClassDeclarationSignature(c)
    const methods = array.traverse(monadValidation)(c.getInstanceMethods(), parseMethod)
    return methods.map(methods =>
      class_(name, signature, description, since, getLocation(c), deprecated, example, methods)
    )
  }
}

export function getClasses(moduleName: string, sourceFile: ast.SourceFile): Validation<Array<string>, Array<Class>> {
  const exportedClasses = sourceFile.getClasses().filter(c => c.isExported())

  return array.traverse(monadValidation)(exportedClasses, cd => parseClass(moduleName, cd))
}

export function parse(file: File, source: string): Validation<Array<string>, Node> {
  const moduleName = getModuleName(file.path)
  const sourceFile = getSourceFile(moduleName, source)
  return sequenceT(monadValidation)(
    getInterfaces(sourceFile),
    getFunctions(moduleName, sourceFile),
    getClasses(moduleName, sourceFile)
  ).map(([interfaces, functions, classes]) => module(file.path, interfaces, functions, classes))
}
