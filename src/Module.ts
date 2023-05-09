/**
 * @since 0.6.0
 */
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
import * as S from 'fp-ts/string'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.6.0
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
 * @since 0.6.0
 */
export interface Documentable {
  readonly name: string
  readonly description: O.Option<string>
  readonly since: O.Option<string>
  readonly deprecated: boolean
  readonly examples: ReadonlyArray<Example>
  readonly category: O.Option<string>
}

/**
 * @category model
 * @since 0.6.0
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
 * @since 0.6.0
 */
export interface Method extends Documentable {
  readonly signatures: ReadonlyArray<string>
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Property extends Documentable {
  readonly signature: string
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Interface extends Documentable {
  readonly _tag: 'Interface'
  readonly signature: string
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Function extends Documentable {
  readonly _tag: 'Function'
  readonly signatures: ReadonlyArray<string>
}

/**
 * @category model
 * @since 0.6.0
 */
export interface TypeAlias extends Documentable {
  readonly _tag: 'TypeAlias'
  readonly signature: string
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Constant extends Documentable {
  readonly _tag: 'Constant'
  readonly signature: string
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Export extends Documentable {
  readonly _tag: 'Export'
  readonly signature: string
}

/**
 * @category model
 * @since 0.6.0
 */
export type Example = string

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.6.0
 */
export const Documentable = (
  name: string,
  description: O.Option<string>,
  since: O.Option<string>,
  deprecated: boolean,
  examples: ReadonlyArray<Example>,
  category: O.Option<string>
): Documentable => ({ name, description, since, deprecated, examples, category })

/**
 * @category constructors
 * @since 0.6.0
 */
export const Module = (
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
 * @since 0.6.0
 */
export const Class = (
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
 * @since 0.6.0
 */
export const Constant = (documentable: Documentable, signature: string): Constant => ({
  _tag: 'Constant',
  ...documentable,
  signature
})

/**
 * @category constructors
 * @since 0.6.0
 */
export const Method = (documentable: Documentable, signatures: ReadonlyArray<string>): Method => ({
  ...documentable,
  signatures
})

/**
 * @category constructors
 * @since 0.6.0
 */
export const Property = (documentable: Documentable, signature: string): Property => ({
  ...documentable,
  signature
})

/**
 * @category constructors
 * @since 0.6.0
 */
export const Interface = (documentable: Documentable, signature: string): Interface => ({
  _tag: 'Interface',
  ...documentable,
  signature
})

/**
 * @category constructors
 * @since 0.6.0
 */
export const Function = (documentable: Documentable, signatures: ReadonlyArray<string>): Function => ({
  _tag: 'Function',
  ...documentable,
  signatures
})

/**
 * @category constructors
 * @since 0.6.0
 */
export const TypeAlias = (documentable: Documentable, signature: string): TypeAlias => ({
  _tag: 'TypeAlias',
  ...documentable,
  signature
})

/**
 * @category constructors
 * @since 0.6.0
 */
export const Export = (documentable: Documentable, signature: string): Export => ({
  _tag: 'Export',
  ...documentable,
  signature
})

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 0.6.0
 */
export const ordModule: Ord.Ord<Module> = pipe(
  S.Ord,
  Ord.contramap((module: Module) => module.path.join('/').toLowerCase())
)
