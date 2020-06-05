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
}

/**
 * @category model
 * @since 0.5.0
 */
export interface Interface extends Documentable {
  readonly signature: string
}

/**
 * @category model
 * @since 0.5.0
 */
export interface Function extends Documentable {
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
  readonly signature: string
}

/**
 * @category model
 * @since 0.5.0
 */
export interface Constant extends Documentable {
  readonly signature: string
}

/**
 * @category model
 * @since 0.5.0
 */
export interface Export extends Documentable {
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
  examples: Array<Example>
): Documentable {
  return { name, description, since, deprecated, examples }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeInterface(documentable: Documentable, signature: string): Interface {
  return { ...documentable, signature }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeFunction(documentable: Documentable, signatures: Array<string>): Function {
  return { ...documentable, signatures }
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
  return { ...documentable, signature, methods, staticMethods, properties }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeTypeAlias(documentable: Documentable, signature: string): TypeAlias {
  return { ...documentable, signature }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeConstant(documentable: Documentable, signature: string): Constant {
  return { ...documentable, signature }
}

/**
 * @category constructor
 * @since 0.5.0
 */
export function makeExport(documentable: Documentable, signature: string): Export {
  return { ...documentable, signature }
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
