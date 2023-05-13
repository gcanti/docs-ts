/**
 * @since 0.9.0
 */
import { pipe } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import * as S from '@effect/data/String'
import * as Ord from '@effect/data/typeclass/Order'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.9.0
 */
export interface Module extends Documentable {
  readonly path: ReadonlyArray<string>
  readonly classes: ReadonlyArray<Class>
  readonly interfaces: ReadonlyArray<Interface>
  readonly functions: ReadonlyArray<Function>
  readonly typeAliases: ReadonlyArray<TypeAlias>
  readonly constants: ReadonlyArray<Constant>
  readonly exports: ReadonlyArray<Export>
}

/**
 * @category model
 * @since 0.9.0
 */
export interface Documentable {
  readonly name: string
  readonly description: Option.Option<string>
  readonly since: Option.Option<string>
  readonly deprecated: boolean
  readonly examples: ReadonlyArray<Example>
  readonly category: Option.Option<string>
}

/**
 * @category model
 * @since 0.9.0
 */
export interface Class extends Documentable {
  readonly _tag: 'Class'
  readonly signature: string
  readonly methods: ReadonlyArray<Method>
  readonly staticMethods: ReadonlyArray<Method>
  readonly properties: ReadonlyArray<Property>
}

/**
 * @category model
 * @since 0.9.0
 */
export interface Method extends Documentable {
  readonly signatures: ReadonlyArray<string>
}

/**
 * @category model
 * @since 0.9.0
 */
export interface Property extends Documentable {
  readonly signature: string
}

/**
 * @category model
 * @since 0.9.0
 */
export interface Interface extends Documentable {
  readonly _tag: 'Interface'
  readonly signature: string
}

/**
 * @category model
 * @since 0.9.0
 */
export interface Function extends Documentable {
  readonly _tag: 'Function'
  readonly signatures: ReadonlyArray<string>
}

/**
 * @category model
 * @since 0.9.0
 */
export interface TypeAlias extends Documentable {
  readonly _tag: 'TypeAlias'
  readonly signature: string
}

/**
 * @category model
 * @since 0.9.0
 */
export interface Constant extends Documentable {
  readonly _tag: 'Constant'
  readonly signature: string
}

/**
 * @category model
 * @since 0.9.0
 */
export interface Export extends Documentable {
  readonly _tag: 'Export'
  readonly signature: string
}

/**
 * @category model
 * @since 0.9.0
 */
export type Example = string

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.9.0
 */
export const createDocumentable = (
  name: string,
  description: Option.Option<string>,
  since: Option.Option<string>,
  deprecated: boolean,
  examples: ReadonlyArray<Example>,
  category: Option.Option<string>
): Documentable => ({ name, description, since, deprecated, examples, category })

/**
 * @category constructors
 * @since 0.9.0
 */
export const createModule = (
  documentable: Documentable,
  path: ReadonlyArray<string>,
  classes: ReadonlyArray<Class>,
  interfaces: ReadonlyArray<Interface>,
  functions: ReadonlyArray<Function>,
  typeAliases: ReadonlyArray<TypeAlias>,
  constants: ReadonlyArray<Constant>,
  exports: ReadonlyArray<Export>
): Module => ({
  ...documentable,
  path,
  classes,
  interfaces,
  functions,
  typeAliases,
  constants,
  exports
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createClass = (
  documentable: Documentable,
  signature: string,
  methods: ReadonlyArray<Method>,
  staticMethods: ReadonlyArray<Method>,
  properties: ReadonlyArray<Property>
): Class => ({
  _tag: 'Class',
  ...documentable,
  signature,
  methods,
  staticMethods,
  properties
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createConstant = (documentable: Documentable, signature: string): Constant => ({
  _tag: 'Constant',
  ...documentable,
  signature
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createMethod = (documentable: Documentable, signatures: ReadonlyArray<string>): Method => ({
  ...documentable,
  signatures
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createProperty = (documentable: Documentable, signature: string): Property => ({
  ...documentable,
  signature
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createInterface = (documentable: Documentable, signature: string): Interface => ({
  _tag: 'Interface',
  ...documentable,
  signature
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createFunction = (documentable: Documentable, signatures: ReadonlyArray<string>): Function => ({
  _tag: 'Function',
  ...documentable,
  signatures
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createTypeAlias = (documentable: Documentable, signature: string): TypeAlias => ({
  _tag: 'TypeAlias',
  ...documentable,
  signature
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createExport = (documentable: Documentable, signature: string): Export => ({
  _tag: 'Export',
  ...documentable,
  signature
})

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 0.9.0
 */
export const Order: Ord.Order<Module> = pipe(
  S.Order,
  Ord.contramap((module: Module) => module.path.join('/').toLowerCase())
)
