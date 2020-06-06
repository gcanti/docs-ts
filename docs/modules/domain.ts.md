---
title: domain.ts
nav_order: 3
parent: Modules
---

## domain overview

Added in v0.5.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructor](#constructor)
  - [makeClass](#makeclass)
  - [makeConstant](#makeconstant)
  - [makeDocumentable](#makedocumentable)
  - [makeExample](#makeexample)
  - [makeExport](#makeexport)
  - [makeFunction](#makefunction)
  - [makeInterface](#makeinterface)
  - [makeMethod](#makemethod)
  - [makeModule](#makemodule)
  - [makeProperty](#makeproperty)
  - [makeTypeAlias](#maketypealias)
- [instance](#instance)
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

# constructor

## makeClass

**Signature**

```ts
export declare function makeClass(
  documentable: Documentable,
  signature: string,
  methods: Array<Method>,
  staticMethods: Array<Method>,
  properties: Array<Property>
): Class
```

Added in v0.5.0

## makeConstant

**Signature**

```ts
export declare function makeConstant(documentable: Documentable, signature: string): Constant
```

Added in v0.5.0

## makeDocumentable

**Signature**

```ts
export declare function makeDocumentable(
  name: string,
  description: O.Option<string>,
  since: string,
  deprecated: boolean,
  examples: Array<Example>,
  category: O.Option<string>
): Documentable
```

Added in v0.5.0

## makeExample

**Signature**

```ts
export declare const makeExample: (code: string) => string
```

Added in v0.5.0

## makeExport

**Signature**

```ts
export declare function makeExport(documentable: Documentable, signature: string): Export
```

Added in v0.5.0

## makeFunction

**Signature**

```ts
export declare function makeFunction(documentable: Documentable, signatures: Array<string>): Function
```

Added in v0.5.0

## makeInterface

**Signature**

```ts
export declare function makeInterface(documentable: Documentable, signature: string): Interface
```

Added in v0.5.0

## makeMethod

**Signature**

```ts
export declare function makeMethod(documentable: Documentable, signatures: Array<string>): Method
```

Added in v0.5.0

## makeModule

**Signature**

```ts
export declare function makeModule(
  documentable: Documentable,
  path: Array<string>,
  interfaces: Array<Interface>,
  typeAliases: Array<TypeAlias>,
  functions: Array<Function>,
  classes: Array<Class>,
  constants: Array<Constant>,
  exports: Array<Export>
): Module
```

Added in v0.5.0

## makeProperty

**Signature**

```ts
export declare function makeProperty(documentable: Documentable, signature: string): Property
```

Added in v0.5.0

## makeTypeAlias

**Signature**

```ts
export declare function makeTypeAlias(documentable: Documentable, signature: string): TypeAlias
```

Added in v0.5.0

# instance

## ordModule

**Signature**

```ts
export declare const ordModule: Ord<Module>
```

Added in v0.5.0

# model

## Class (interface)

**Signature**

```ts
export interface Class extends Documentable {
  readonly _tag: 'Class'
  readonly signature: string
  readonly methods: Array<Method>
  readonly staticMethods: Array<Method>
  readonly properties: Array<Property>
}
```

Added in v0.5.0

## Constant (interface)

**Signature**

```ts
export interface Constant extends Documentable {
  readonly _tag: 'Constant'
  readonly signature: string
}
```

Added in v0.5.0

## Documentable (interface)

**Signature**

```ts
export interface Documentable {
  readonly name: string
  readonly description: O.Option<string>
  readonly since: string
  readonly deprecated: boolean
  readonly examples: Array<Example>
  readonly category: O.Option<string>
}
```

Added in v0.5.0

## Example (type alias)

**Signature**

```ts
export type Example = string
```

Added in v0.5.0

## Export (interface)

**Signature**

```ts
export interface Export extends Documentable {
  readonly _tag: 'Export'
  readonly signature: string
}
```

Added in v0.5.0

## Function (interface)

**Signature**

```ts
export interface Function extends Documentable {
  readonly _tag: 'Function'
  readonly signatures: Array<string>
}
```

Added in v0.5.0

## Interface (interface)

**Signature**

```ts
export interface Interface extends Documentable {
  readonly _tag: 'Interface'
  readonly signature: string
}
```

Added in v0.5.0

## Method (interface)

**Signature**

```ts
export interface Method extends Documentable {
  readonly signatures: Array<string>
}
```

Added in v0.5.0

## Module (interface)

**Signature**

```ts
export interface Module extends Documentable {
  readonly path: Array<string>
  readonly interfaces: Array<Interface>
  readonly typeAliases: Array<TypeAlias>
  readonly functions: Array<Function>
  readonly classes: Array<Class>
  readonly constants: Array<Constant>
  readonly exports: Array<Export>
}
```

Added in v0.5.0

## Property (interface)

**Signature**

```ts
export interface Property extends Documentable {
  readonly signature: string
}
```

Added in v0.5.0

## TypeAlias (interface)

**Signature**

```ts
export interface TypeAlias extends Documentable {
  readonly _tag: 'TypeAlias'
  readonly signature: string
}
```

Added in v0.5.0
