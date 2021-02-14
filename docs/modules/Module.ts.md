---
title: Module.ts
nav_order: 9
parent: Modules
---

## Module overview

Added in v0.6.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Class](#class)
  - [Constant](#constant)
  - [Documentable](#documentable)
  - [Export](#export)
  - [Function](#function)
  - [Interface](#interface)
  - [Method](#method)
  - [Module](#module)
  - [Property](#property)
  - [TypeAlias](#typealias)
- [instances](#instances)
  - [ordModule](#ordmodule)
- [model](#model)
  - [Class (interface)](#class-interface)
  - [Constant (interface)](#constant-interface)
  - [Documentable (interface)](#documentable-interface)
  - [Example (type alias)](#example-type-alias)
  - [Export (interface)](#export-interface)
  - [Function (interface)](#function-interface)
  - [Interface (interface)](#interface-interface)
  - [Method (interface)](#method-interface)
  - [Module (interface)](#module-interface)
  - [Property (interface)](#property-interface)
  - [TypeAlias (interface)](#typealias-interface)

---

# constructors

## Class

**Signature**

```ts
export declare const Class: (
  documentable: Documentable,
  signature: string,
  methods: ReadonlyArray<Method>,
  staticMethods: ReadonlyArray<Method>,
  properties: ReadonlyArray<Property>
) => Class
```

Added in v0.6.0

## Constant

**Signature**

```ts
export declare const Constant: (documentable: Documentable, signature: string) => Constant
```

Added in v0.6.0

## Documentable

**Signature**

```ts
export declare const Documentable: (
  name: string,
  description: O.Option<string>,
  since: O.Option<string>,
  deprecated: boolean,
  examples: ReadonlyArray<Example>,
  category: O.Option<string>
) => Documentable
```

Added in v0.6.0

## Export

**Signature**

```ts
export declare const Export: (documentable: Documentable, signature: string) => Export
```

Added in v0.6.0

## Function

**Signature**

```ts
export declare const Function: (documentable: Documentable, signatures: ReadonlyArray<string>) => Function
```

Added in v0.6.0

## Interface

**Signature**

```ts
export declare const Interface: (documentable: Documentable, signature: string) => Interface
```

Added in v0.6.0

## Method

**Signature**

```ts
export declare const Method: (documentable: Documentable, signatures: ReadonlyArray<string>) => Method
```

Added in v0.6.0

## Module

**Signature**

```ts
export declare const Module: (
  documentable: Documentable,
  path: ReadonlyArray<string>,
  classes: ReadonlyArray<Class>,
  interfaces: ReadonlyArray<Interface>,
  functions: ReadonlyArray<Function>,
  typeAliases: ReadonlyArray<TypeAlias>,
  constants: ReadonlyArray<Constant>,
  exports: ReadonlyArray<Export>
) => Module
```

Added in v0.6.0

## Property

**Signature**

```ts
export declare const Property: (documentable: Documentable, signature: string) => Property
```

Added in v0.6.0

## TypeAlias

**Signature**

```ts
export declare const TypeAlias: (documentable: Documentable, signature: string) => TypeAlias
```

Added in v0.6.0

# instances

## ordModule

**Signature**

```ts
export declare const ordModule: Ord.Ord<Module>
```

Added in v0.6.0

# model

## Class (interface)

**Signature**

```ts
export interface Class extends Documentable {
  readonly _tag: 'Class'
  readonly signature: string
  readonly methods: ReadonlyArray<Method>
  readonly staticMethods: ReadonlyArray<Method>
  readonly properties: ReadonlyArray<Property>
}
```

Added in v0.6.0

## Constant (interface)

**Signature**

```ts
export interface Constant extends Documentable {
  readonly _tag: 'Constant'
  readonly signature: string
}
```

Added in v0.6.0

## Documentable (interface)

**Signature**

```ts
export interface Documentable {
  readonly name: string
  readonly description: O.Option<string>
  readonly since: O.Option<string>
  readonly deprecated: boolean
  readonly examples: ReadonlyArray<Example>
  readonly category: O.Option<string>
}
```

Added in v0.6.0

## Example (type alias)

**Signature**

```ts
export type Example = string
```

Added in v0.6.0

## Export (interface)

**Signature**

```ts
export interface Export extends Documentable {
  readonly _tag: 'Export'
  readonly signature: string
}
```

Added in v0.6.0

## Function (interface)

**Signature**

```ts
export interface Function extends Documentable {
  readonly _tag: 'Function'
  readonly signatures: ReadonlyArray<string>
}
```

Added in v0.6.0

## Interface (interface)

**Signature**

```ts
export interface Interface extends Documentable {
  readonly _tag: 'Interface'
  readonly signature: string
}
```

Added in v0.6.0

## Method (interface)

**Signature**

```ts
export interface Method extends Documentable {
  readonly signatures: ReadonlyArray<string>
}
```

Added in v0.6.0

## Module (interface)

**Signature**

```ts
export interface Module extends Documentable {
  readonly path: ReadonlyArray<string>
  readonly classes: ReadonlyArray<Class>
  readonly interfaces: ReadonlyArray<Interface>
  readonly functions: ReadonlyArray<Function>
  readonly typeAliases: ReadonlyArray<TypeAlias>
  readonly constants: ReadonlyArray<Constant>
  readonly exports: ReadonlyArray<Export>
}
```

Added in v0.6.0

## Property (interface)

**Signature**

```ts
export interface Property extends Documentable {
  readonly signature: string
}
```

Added in v0.6.0

## TypeAlias (interface)

**Signature**

```ts
export interface TypeAlias extends Documentable {
  readonly _tag: 'TypeAlias'
  readonly signature: string
}
```

Added in v0.6.0
