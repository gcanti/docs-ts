/**
 * parser utilities
 *
 * @since 0.2.0
 */

import * as doctrine from 'doctrine'
import { sequenceS } from 'fp-ts/lib/Apply'
import * as A from 'fp-ts/lib/Array'
import * as O from 'fp-ts/lib/Option'
import * as E from 'fp-ts/lib/Either'
import { contramap, Ord, ordString } from 'fp-ts/lib/Ord'
import * as path from 'path'
import { pipe } from 'fp-ts/lib/pipeable'
import * as ast from 'ts-morph'

/**
 * @since 0.2.0
 */
export type Parser<A> = E.Either<Array<string>, A>

/**
 * @since 0.2.0
 */
export interface File {
  path: string
  content: string
}

/**
 * @since 0.2.0
 */
export type Example = string

/**
 * @since 0.2.0
 */
export function example(code: string): Example {
  return code
}

/**
 * @since 0.2.0
 */
export interface Documentable {
  readonly name: string
  readonly description: O.Option<string>
  readonly since: string
  readonly deprecated: boolean
  readonly examples: Array<Example>
}

/**
 * @since 0.2.0
 */
export function documentable(
  name: string,
  description: O.Option<string>,
  since: string,
  deprecated: boolean,
  examples: Array<Example>
): Documentable {
  return { name, description, since, deprecated, examples }
}

/**
 * @since 0.2.0
 */
export interface Interface extends Documentable {
  signature: string
}

/**
 * @since 0.2.0
 */
export function interface_(documentable: Documentable, signature: string): Interface {
  return { ...documentable, signature }
}

/**
 * @since 0.2.0
 */
export interface Func extends Documentable {
  readonly signatures: Array<string>
}

/**
 * @since 0.2.0
 */
export function func(documentable: Documentable, signatures: Array<string>): Func {
  return { ...documentable, signatures }
}

/**
 * @since 0.2.0
 */
export interface Method extends Documentable {
  readonly signatures: Array<string>
}

/**
 * @since 0.2.0
 */
export function method(documentable: Documentable, signatures: Array<string>): Method {
  return { ...documentable, signatures }
}

/**
 * @since 0.2.0
 */
export interface Class extends Documentable {
  readonly signature: string
  readonly methods: Array<Method>
  readonly staticMethods: Array<Method>
}

/**
 * @since 0.2.0
 */
export function class_(
  documentable: Documentable,
  signature: string,
  methods: Array<Method>,
  staticMethods: Array<Method>
): Class {
  return { ...documentable, signature, methods, staticMethods }
}

/**
 * @since 0.2.0
 */
export interface TypeAlias extends Documentable {
  readonly signature: string
}

/**
 * @since 0.2.0
 */
export function typeAlias(documentable: Documentable, signature: string): TypeAlias {
  return { ...documentable, signature }
}

/**
 * @since 0.2.0
 */
export interface Constant extends Documentable {
  readonly signature: string
}

/**
 * @since 0.2.0
 */
export function constant(documentable: Documentable, signature: string): Constant {
  return { ...documentable, signature }
}

/**
 * @since 0.2.0
 */
export interface Export extends Documentable {
  readonly signature: string
}

/**
 * @since 0.2.0
 */
export function export_(documentable: Documentable, signature: string): Export {
  return { ...documentable, signature }
}

/**
 * @since 0.2.0
 */
export interface Module extends Documentable {
  readonly path: Array<string>
  readonly interfaces: Array<Interface>
  readonly typeAliases: Array<TypeAlias>
  readonly functions: Array<Func>
  readonly classes: Array<Class>
  readonly constants: Array<Constant>
  readonly exports: Array<Export>
}

/**
 * @since 0.2.0
 */
export function module(
  documentable: Documentable,
  path: Array<string>,
  interfaces: Array<Interface>,
  typeAliases: Array<TypeAlias>,
  functions: Array<Func>,
  classes: Array<Class>,
  constants: Array<Constant>,
  exports: Array<Export>
): Module {
  return { path, interfaces, typeAliases, functions, classes, constants, exports, ...documentable }
}

const ordModule: Ord<Module> = pipe(
  ordString,
  contramap((module: Module) => module.path.join('/').toLowerCase())
)

const sortModules = A.sort(ordModule)

const monoidFailure = A.getMonoid<string>()

const monadParser = E.getValidation(monoidFailure)

const traverse = A.array.traverse(monadParser)

function getModuleName(p: Array<string>): string {
  return path.parse(p[p.length - 1]).name
}

function getAnnotation(jsdocs: Array<ast.JSDoc>): doctrine.Annotation {
  const content = pipe(
    jsdocs,
    A.foldRight(
      () => '',
      (_, last) => last.getText()
    )
  )
  return doctrine.parse(content, { unwrap: true })
}

function getDescription(annotation: doctrine.Annotation): O.Option<string> {
  return pipe(
    O.fromNullable(annotation.description),
    O.filter(s => s !== '')
  )
}

function getSince(annotation: doctrine.Annotation): O.Option<string> {
  return pipe(
    O.fromNullable(annotation.tags.filter(tag => tag.title === 'since')[0]),
    O.mapNullable(tag => tag.description)
  )
}

function isDeprecated(annotation: doctrine.Annotation): boolean {
  return pipe(O.fromNullable(annotation.tags.filter(tag => tag.title === 'deprecated')[0]), O.isSome)
}

function isInternal(annotation: doctrine.Annotation): boolean {
  return pipe(O.fromNullable(annotation.tags.filter(tag => tag.title === 'internal')[0]), O.isSome)
}

function getExamples(annotation: doctrine.Annotation): Array<Example> {
  return annotation.tags
    .filter(tag => tag.title === 'example')
    .map(tag =>
      pipe(
        O.fromNullable(tag.description),
        O.getOrElse(() => '')
      )
    )
}

function getAnnotationInfo(
  annotation: doctrine.Annotation
): {
  description: O.Option<string>
  since: O.Option<string>
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

function ensureSinceTag<A>(name: string, since: O.Option<string>, f: (since: string) => A): Parser<A> {
  return pipe(
    since,
    O.fold(
      () => E.left([`missing @since tag in ${name} documentation`]),
      since => E.right(f(since))
    )
  )
}

function parseInterfaceDeclaration(id: ast.InterfaceDeclaration): Parser<Interface> {
  const annotation = getAnnotation(id.getJsDocs())
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const signature = id.getText()
  return ensureSinceTag(id.getName(), since, since =>
    interface_(documentable(id.getName(), description, since, deprecated, examples), signature)
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
    E.map(interfaces => interfaces.sort(byName.compare))
  )
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
  return i !== -1 ? O.some(i) : O.none
}

const lastIndexOf = (big: string, small: string) => {
  const i = big.lastIndexOf(small)
  return i !== -1 ? O.some(i) : O.none
}

function getFunctionVariableDeclarationSignature(vd: ast.VariableDeclaration): string {
  const text = vd.getText()
  const end = pipe(
    indexOf(text, ' => {'),
    O.alt(() => lastIndexOf(text, ' =>'))
  )
  return `export const ${text.substring(
    0,
    pipe(
      end,
      O.getOrElse(() => text.length)
    )
  )} => ...`
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
    return E.left([`Missing function name in module ${moduleName}`])
  } else {
    return ensureSinceTag(name, since, since =>
      func(documentable(name, description, since, deprecated, examples), signatures)
    )
  }
}

function parseFunctionVariableDeclaration(vd: ast.VariableDeclaration): Parser<Func> {
  const vs: any = vd.getParent().getParent()
  const annotation = getAnnotation(vs.getJsDocs())
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const signatures = [getFunctionVariableDeclarationSignature(vd)]
  const name = vd.getName()
  return ensureSinceTag(name, since, since =>
    func(documentable(name, description, since, deprecated, examples), signatures)
  )
}

/**
 * @since 0.2.0
 */
export function getFunctions(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Func>> {
  const exportedFunctionDeclarations = sourceFile
    .getFunctions()
    .filter(fd => fd.isExported() && !isInternal(getFunctionDeclarationAnnotation(fd)))

  const functionDeclarations = traverse(exportedFunctionDeclarations, fd => parseFunctionDeclaration(moduleName, fd))

  const exportedVariableDeclarations = sourceFile.getVariableDeclarations().filter(vd => {
    const parent = vd.getParent()
    if (isVariableDeclarationList(parent)) {
      const vs = parent.getParent()
      if (isVariableStatement(vs)) {
        const annotation = getAnnotation(vs.getJsDocs())
        const initializer = vd.getInitializer()
        return (
          !isInternal(annotation) &&
          initializer !== undefined &&
          vs.isExported() &&
          ast.TypeGuards.isFunctionLikeDeclaration(initializer)
        )
      }
    }
    return false
  })

  const variableDeclarations = traverse(exportedVariableDeclarations, parseFunctionVariableDeclaration)

  const monoidFunc = E.getValidationMonoid(monoidFailure, A.getMonoid<Func>())
  return monoidFunc.concat(functionDeclarations, variableDeclarations)
}

function getTypeAliasesAnnotation(ta: ast.TypeAliasDeclaration): doctrine.Annotation {
  return getAnnotation(ta.getJsDocs())
}

function parseTypeAliasDeclaration(ta: ast.TypeAliasDeclaration): Parser<TypeAlias> {
  const annotation = getTypeAliasesAnnotation(ta)
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const signature = ta.getText()
  const name = ta.getName()
  return ensureSinceTag(name, since, since =>
    typeAlias(documentable(name, description, since, deprecated, examples), signature)
  )
}

/**
 * @since 0.2.0
 */
export function getTypeAliases(sourceFile: ast.SourceFile): Parser<Array<TypeAlias>> {
  const exportedTypeAliasDeclarations = sourceFile
    .getTypeAliases()
    .filter(ta => ta.isExported() && !isInternal(getTypeAliasesAnnotation(ta)))

  return pipe(
    traverse(exportedTypeAliasDeclarations, ta => parseTypeAliasDeclaration(ta)),
    E.map(typeAliases => typeAliases.sort(byName.compare))
  )
}

/**
 * @internal
 */
export function stripImportTypes(s: string): string {
  return s.replace(/import\("((?!").)*"\)./g, '')
}

function getConstantVariableDeclarationSignature(vd: ast.VariableDeclaration): string {
  const text = vd.getText()
  const lt = text.indexOf('<')
  let end = text.indexOf(' = ')
  if (lt !== -1 && lt < end) {
    // default type parameters
    const gt = text.indexOf('>', lt)
    end = text.indexOf(' = ', gt)
  }
  let s = text.substring(0, end)
  if (s.indexOf(':') === -1) {
    s += ': ' + stripImportTypes(vd.getType().getText(vd))
  }
  return `export const ${s} = ...`
}

function parseConstantVariableDeclaration(vd: ast.VariableDeclaration): Parser<Constant> {
  const vs: any = vd.getParent().getParent()
  const annotation = getAnnotation(vs.getJsDocs())
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const signature = getConstantVariableDeclarationSignature(vd)
  const name = vd.getName()
  return ensureSinceTag(name, since, since =>
    constant(documentable(name, description, since, deprecated, examples), signature)
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
        const annotation = getAnnotation(vs.getJsDocs())
        const initializer = vd.getInitializer()
        return (
          !isInternal(annotation) &&
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
  const signature = stripImportTypes(es.getType().getText(es))
  const name = es.compilerNode.name.text
  return pipe(
    E.fromOption(() => [`missing ${name} documentation`])(A.head(es.getLeadingCommentRanges())),
    E.chain(commentRange => {
      const text = commentRange.getText()
      const annotation = doctrine.parse(text, { unwrap: true })
      const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
      return ensureSinceTag(name, since, since =>
        export_(documentable(name, description, since, deprecated, examples), signature)
      )
    })
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
  return pipe(traverse(exportDeclarations, parseExportDeclaration), E.map(A.flatten))
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
  return ensureSinceTag(name, since, since =>
    method(documentable(name, description, since, deprecated, examples), signatures)
  )
}

function parseClass(moduleName: string, c: ast.ClassDeclaration): Parser<Class> {
  const name = c.getName()
  if (name === undefined) {
    return E.left([`Missing class name in module ${moduleName}`])
  } else {
    const annotation = getAnnotation(c.getJsDocs())
    const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
    const signature = getClassDeclarationSignature(c)
    if (O.isNone(since)) {
      return E.left([`missing @since tag in ${name} documentation`])
    }
    return pipe(
      sequenceS(E.either)({
        methods: traverse(c.getInstanceMethods(), parseMethod),
        staticMethods: traverse(c.getStaticMethods(), parseMethod)
      }),
      E.map(({ methods, staticMethods }) =>
        class_(documentable(name, description, since.value, deprecated, examples), signature, methods, staticMethods)
      )
    )
  }
}

/**
 * @since 0.2.0
 */
export function getClasses(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Class>> {
  const exportedClasses = sourceFile.getClasses().filter(c => c.isExported())

  return pipe(
    traverse(exportedClasses, cd => parseClass(moduleName, cd)),
    E.map(classes => classes.sort(byName.compare))
  )
}

/**
 * @since 0.2.0
 */
export function getModuleDocumentation(sourceFile: ast.SourceFile, name: string): Parser<Documentable> {
  const x = sourceFile.getStatements()
  if (x.length > 0) {
    const comments = x[0].getLeadingCommentRanges()
    if (comments.length > 0) {
      const text = comments[0].getText()
      const annotation = doctrine.parse(text, { unwrap: true })
      const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
      return ensureSinceTag(name, since, since => documentable(name, description, since, deprecated, examples))
    }
  }
  return E.left([`missing documentation in ${name} module`])
}

function parseModule(path: Array<string>, sourceFile: ast.SourceFile): Parser<Module> {
  const moduleName = getModuleName(path)
  return pipe(
    sequenceS(monadParser)({
      interfaces: getInterfaces(sourceFile),
      functions: getFunctions(moduleName, sourceFile),
      typeAliases: getTypeAliases(sourceFile),
      classes: getClasses(moduleName, sourceFile),
      constants: getConstants(sourceFile),
      exports: getExports(sourceFile)
    }),
    E.chain(({ interfaces, functions, typeAliases, classes, constants, exports }) => {
      return pipe(
        getModuleDocumentation(sourceFile, moduleName),
        E.map(documentation =>
          module(documentation, path, interfaces, typeAliases, functions, classes, constants, exports)
        )
      )
    })
  )
}

/**
 * @since 0.2.0
 */
export function run(files: Array<File>): Parser<Array<Module>> {
  const project = new ast.Project()
  files.forEach(file => {
    project.addSourceFileAtPath(file.path)
  })
  return pipe(
    traverse(files, file => {
      const sourceFile = project.getSourceFile(file.path)!
      return parseModule(file.path.split(path.sep), sourceFile)
    }),
    E.map(modules => sortModules(modules.filter(module => !module.deprecated)))
  )
}
