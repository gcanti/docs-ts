/**
 * parser utilities
 *
 * @since 0.2.0
 */

import * as doctrine from 'doctrine'
import { sequenceS } from 'fp-ts/lib/Apply'
import * as A from 'fp-ts/lib/Array'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import { contramap, ordString } from 'fp-ts/lib/Ord'
import { pipe } from 'fp-ts/lib/pipeable'
import * as path from 'path'
import * as ast from 'ts-morph'
import {
  Class,
  makeClass,
  Constant,
  makeConstant,
  makeDocumentable,
  Documentable,
  Example,
  Export,
  makeExport,
  Function,
  makeFunction,
  Interface,
  makeInterface,
  Method,
  makeMethod,
  Module,
  ordModule,
  Property,
  makeProperty,
  TypeAlias,
  makeTypeAlias,
  makeModule
} from './domain'

/**
 * @since 0.5.0
 */
export interface Comment {
  readonly description: O.Option<string>
  readonly tags: Record<string, O.Option<string>>
}

const isNonEmptyString = (s: string) => s.length > 0

/**
 * @since 0.5.0
 */
export const parseComment = (text: string): Comment => {
  const annotation: doctrine.Annotation = doctrine.parse(text, { unwrap: true })
  const tags: Record<string, O.Option<string>> = {}
  for (const tag of annotation.tags) {
    tags[tag.title] = pipe(O.fromNullable(tag.description), O.filter(isNonEmptyString))
  }
  return {
    description: pipe(O.fromNullable(annotation.description), O.filter(isNonEmptyString)),
    tags
  }
}

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
    makeInterface(makeDocumentable(id.getName(), description, since, deprecated, examples), signature)
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
    return text.replace('export function ', 'export declare function ')
  }
  const end = body.getStart() - f.getStart() - 1
  return text.substring(0, end).replace('export function ', 'export declare function ')
}

function getFunctionDeclarationAnnotation(fd: ast.FunctionDeclaration): doctrine.Annotation {
  const overloads = fd.getOverloads()
  return overloads.length === 0 ? getAnnotation(fd.getJsDocs()) : getAnnotation(overloads[0].getJsDocs())
}

function parseFunctionDeclaration(moduleName: string, fd: ast.FunctionDeclaration): Parser<Function> {
  const annotation = getFunctionDeclarationAnnotation(fd)
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const overloads = fd.getOverloads()
  const signatures =
    overloads.length === 0
      ? [getFunctionDeclarationSignature(fd)]
      : [
          ...overloads.slice(0, overloads.length - 1).map(getFunctionDeclarationSignature),
          getFunctionDeclarationSignature(overloads[overloads.length - 1])
        ]
  const name = fd.getName()
  if (name === undefined || name.trim() === '') {
    return E.left([`Missing function name in module ${moduleName}`])
  } else {
    return ensureSinceTag(name, since, since =>
      makeFunction(makeDocumentable(name, description, since, deprecated, examples), signatures)
    )
  }
}

function parseFunctionVariableDeclaration(vd: ast.VariableDeclaration): Parser<Function> {
  const vs: any = vd.getParent().getParent()
  const annotation = getAnnotation(vs.getJsDocs())
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const name = vd.getName()
  const signature = `export declare const ${name}: ${stripImportTypes(vd.getType().getText(vd))}`
  return ensureSinceTag(name, since, since =>
    makeFunction(makeDocumentable(name, description, since, deprecated, examples), [signature])
  )
}

/**
 * @since 0.2.0
 */
export function getFunctions(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Function>> {
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

  const monoidFunc = E.getValidationMonoid(monoidFailure, A.getMonoid<Function>())
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
    makeTypeAlias(makeDocumentable(name, description, since, deprecated, examples), signature)
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

function parseConstantVariableDeclaration(vd: ast.VariableDeclaration): Parser<Constant> {
  const vs: any = vd.getParent().getParent()
  const annotation = getAnnotation(vs.getJsDocs())
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const type = stripImportTypes(vd.getType().getText(vd))
  const name = vd.getName()
  const signature = `export declare const ${name}: ${type}`
  return ensureSinceTag(name, since, since =>
    makeConstant(makeDocumentable(name, description, since, deprecated, examples), signature)
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
  const name = es.compilerNode.name.text
  const type = stripImportTypes(es.getType().getText(es))
  const signature = `export declare const ${name}: ${type}`
  return pipe(
    E.fromOption(() => [`missing ${name} documentation`])(A.head(es.getLeadingCommentRanges())),
    E.chain(commentRange => {
      const text = commentRange.getText()
      const annotation = doctrine.parse(text, { unwrap: true })
      const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
      return ensureSinceTag(name, since, since =>
        makeExport(makeDocumentable(name, description, since, deprecated, examples), signature)
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
    makeMethod(makeDocumentable(name, description, since, deprecated, examples), signatures)
  )
}

function parseProperty(pd: ast.PropertyDeclaration): Parser<Property> {
  const name = pd.getName()
  const annotation = getAnnotation(pd.getJsDocs())
  const { description, since, deprecated, examples } = getAnnotationInfo(annotation)
  const type = stripImportTypes(pd.getType().getText(pd))
  const readonly = pd.getFirstModifierByKind(ast.ts.SyntaxKind.ReadonlyKeyword) === undefined ? '' : 'readonly '
  const signature = `${readonly}${name}: ${type}`
  return ensureSinceTag(name, since, since =>
    makeProperty(makeDocumentable(name, description, since, deprecated, examples), signature)
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
        staticMethods: traverse(c.getStaticMethods(), parseMethod),
        properties: traverse(
          c
            .getProperties()
            // take public, instance properties
            .filter(p => !p.isStatic() && p.getFirstModifierByKind(ast.ts.SyntaxKind.PrivateKeyword) === undefined),
          parseProperty
        )
      }),
      E.map(({ methods, staticMethods, properties }) =>
        makeClass(
          makeDocumentable(name, description, since.value, deprecated, examples),
          signature,
          methods,
          staticMethods,
          properties
        )
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
      return ensureSinceTag(name, since, since => makeDocumentable(name, description, since, deprecated, examples))
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
          makeModule(documentation, path, interfaces, typeAliases, functions, classes, constants, exports)
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
