/**
 * @since 0.5.0
 */
import * as O from 'fp-ts/lib/Option'
import { Ord, ordString, contramap } from 'fp-ts/lib/Ord'
import { pipe } from 'fp-ts/lib/pipeable'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.5.0
 */
export type Example = string

/**
 * @category model
 * @since 0.5.0
 */
export interface Documentable {
  readonly name: string
  readonly description: O.Option<string>
  readonly since: string
  readonly deprecated: boolean
  readonly examples: Array<Example>
  readonly category: O.Option<string>
}

/**
 * @category model
 * @since 0.5.0
 */
export interface Interface extends Documentable {
  readonly _tag: 'Interface'
  readonly signature: string
}

/**
 * @category model
 * @since 0.5.0
 */
export interface Function extends Documentable {
  readonly _tag: 'Function'
  readonly signatures: Array<string>
}

/**
 * @category model
 * @since 0.5.0
 */
export interface Method extends Documentable {
  readonly signatures: Array<string>
}

/**
 * @category model
 * @since 0.5.0
 */
export interface Property extends Documentable {
  readonly signature: string
}

/**
 * @category model
 * @since 0.5.0
 */
export interface Class extends Documentable {
  readonly _tag: 'Class'
  readonly signature: string
  readonly methods: Array<Method>
  readonly staticMethods: Array<Method>
  readonly properties: Array<Property>
}

/**
 * @category model
 * @since 0.5.0
 */
export interface TypeAlias extends Documentable {
  readonly _tag: 'TypeAlias'
  readonly signature: string
}

/**
 * @category model
 * @since 0.5.0
 */
export interface Constant extends Documentable {
  readonly _tag: 'Constant'
  readonly signature: string
}

/**
 * @category model
 * @since 0.5.0
 */
export interface Export extends Documentable {
  readonly _tag: 'Export'
  readonly signature: string
}

/**
 * @category model
 * @since 0.5.0
 */
export interface Module extends Documentable {
  readonly path: Array<string>
  readonly interfaces: Array<Interface>
  readonly typeAliases: Array<TypeAlias>
  readonly functions: Array<Function>
  readonly classes: Array<Class>
  readonly constants: Array<Constant>
  readonly exports: Array<Export>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructor
 * @since 0.5.0
 */
export const makeExample = (code: string): Example => code

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeDocumentable(
  name: string,
  description: O.Option<string>,
  since: string,
  deprecated: boolean,
  examples: Array<Example>,
  category: O.Option<string>
): Documentable {
  return { name, description, since, deprecated, examples, category }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeInterface(documentable: Documentable, signature: string): Interface {
  return { _tag: 'Interface', ...documentable, signature }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeFunction(documentable: Documentable, signatures: Array<string>): Function {
  return { _tag: 'Function', ...documentable, signatures }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeMethod(documentable: Documentable, signatures: Array<string>): Method {
  return { ...documentable, signatures }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeProperty(documentable: Documentable, signature: string): Property {
  return { ...documentable, signature }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeClass(
  documentable: Documentable,
  signature: string,
  methods: Array<Method>,
  staticMethods: Array<Method>,
  properties: Array<Property>
): Class {
  return { _tag: 'Class', ...documentable, signature, methods, staticMethods, properties }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeTypeAlias(documentable: Documentable, signature: string): TypeAlias {
  return { _tag: 'TypeAlias', ...documentable, signature }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeConstant(documentable: Documentable, signature: string): Constant {
  return { _tag: 'Constant', ...documentable, signature }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeExport(documentable: Documentable, signature: string): Export {
  return { _tag: 'Export', ...documentable, signature }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeModule(
  documentable: Documentable,
  path: Array<string>,
  interfaces: Array<Interface>,
  typeAliases: Array<TypeAlias>,
  functions: Array<Function>,
  classes: Array<Class>,
  constants: Array<Constant>,
  exports: Array<Export>
): Module {
  return { path, interfaces, typeAliases, functions, classes, constants, exports, ...documentable }
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instance
 * @since 0.5.0
 */
export const ordModule: Ord<Module> = pipe(
  ordString,
  contramap((module: Module) => module.path.join('/').toLowerCase())
)
