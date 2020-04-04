---
title: parser.ts
nav_order: 5
parent: Modules
---

# parser overview

parser utilities

Added in v0.2.0

---

<h2 class="text-delta">Table of contents</h2>

- [Class (interface)](#class-interface)
- [Constant (interface)](#constant-interface)
- [Documentable (interface)](#documentable-interface)
- [Export (interface)](#export-interface)
- [File (interface)](#file-interface)
- [Func (interface)](#func-interface)
- [Interface (interface)](#interface-interface)
- [Method (interface)](#method-interface)
- [Module (interface)](#module-interface)
- [Property (interface)](#property-interface)
- [TypeAlias (interface)](#typealias-interface)
- [Example (type alias)](#example-type-alias)
- [Parser (type alias)](#parser-type-alias)
- [class\_](#class_)
- [constant](#constant)
- [documentable](#documentable)
- [example](#example)
- [export\_](#export_)
- [func](#func)
- [getClasses](#getclasses)
- [getConstants](#getconstants)
- [getExports](#getexports)
- [getFunctions](#getfunctions)
- [getInterfaces](#getinterfaces)
- [getModuleDocumentation](#getmoduledocumentation)
- [getTypeAliases](#gettypealiases)
- [interface\_](#interface_)
- [method](#method)
- [module](#module)
- [property](#property)
- [run](#run)
- [typeAlias](#typealias)

---

# Class (interface)

**Signature**

```ts
export interface Class extends Documentable {
  readonly signature: string
  readonly methods: Array<Method>
  readonly staticMethods: Array<Method>
  readonly properties: Array<Property>
}
```

Added in v0.2.0

# Constant (interface)

**Signature**

```ts
export interface Constant extends Documentable {
  readonly signature: string
}
```

Added in v0.2.0

# Documentable (interface)

**Signature**

```ts
export interface Documentable {
  readonly name: string
  readonly description: O.Option<string>
  readonly since: string
  readonly deprecated: boolean
  readonly examples: Array<Example>
}
```

Added in v0.2.0

# Export (interface)

**Signature**

```ts
export interface Export extends Documentable {
  readonly signature: string
}
```

Added in v0.2.0

# File (interface)

**Signature**

```ts
export interface File {
  path: string
  content: string
}
```

Added in v0.2.0

# Func (interface)

**Signature**

```ts
export interface Func extends Documentable {
  readonly signatures: Array<string>
}
```

Added in v0.2.0

# Interface (interface)

**Signature**

```ts
export interface Interface extends Documentable {
  signature: string
}
```

Added in v0.2.0

# Method (interface)

**Signature**

```ts
export interface Method extends Documentable {
  readonly signatures: Array<string>
}
```

Added in v0.2.0

# Module (interface)

**Signature**

```ts
export interface Module extends Documentable {
  readonly path: Array<string>
  readonly interfaces: Array<Interface>
  readonly typeAliases: Array<TypeAlias>
  readonly functions: Array<Func>
  readonly classes: Array<Class>
  readonly constants: Array<Constant>
  readonly exports: Array<Export>
}
```

Added in v0.2.0

# Property (interface)

**Signature**

```ts
export interface Property extends Documentable {
  readonly signature: string
}
```

Added in v0.4.0

# TypeAlias (interface)

**Signature**

```ts
export interface TypeAlias extends Documentable {
  readonly signature: string
}
```

Added in v0.2.0

# Example (type alias)

**Signature**

```ts
export type Example = string
```

Added in v0.2.0

# Parser (type alias)

**Signature**

```ts
export type Parser<A> = E.Either<Array<string>, A>
```

Added in v0.2.0

# class\_

**Signature**

```ts
export declare function class_(
  documentable: Documentable,
  signature: string,
  methods: Array<Method>,
  staticMethods: Array<Method>,
  properties: Array<Property>
): Class
```

Added in v0.2.0

# constant

**Signature**

```ts
export declare function constant(documentable: Documentable, signature: string): Constant
```

Added in v0.2.0

# documentable

**Signature**

```ts
export declare function documentable(
  name: string,
  description: O.Option<string>,
  since: string,
  deprecated: boolean,
  examples: Array<Example>
): Documentable
```

Added in v0.2.0

# example

**Signature**

```ts
export declare function example(code: string): Example
```

Added in v0.2.0

# export\_

**Signature**

```ts
export declare function export_(documentable: Documentable, signature: string): Export
```

Added in v0.2.0

# func

**Signature**

```ts
export declare function func(documentable: Documentable, signatures: Array<string>): Func
```

Added in v0.2.0

# getClasses

**Signature**

```ts
export declare function getClasses(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Class>>
```

Added in v0.2.0

# getConstants

**Signature**

```ts
export declare function getConstants(sourceFile: ast.SourceFile): Parser<Array<Constant>>
```

Added in v0.2.0

# getExports

**Signature**

```ts
export declare function getExports(sourceFile: ast.SourceFile): Parser<Array<Export>>
```

Added in v0.2.0

# getFunctions

**Signature**

```ts
export declare function getFunctions(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Func>>
```

Added in v0.2.0

# getInterfaces

**Signature**

```ts
export declare function getInterfaces(sourceFile: ast.SourceFile): Parser<Array<Interface>>
```

Added in v0.2.0

# getModuleDocumentation

**Signature**

```ts
export declare function getModuleDocumentation(sourceFile: ast.SourceFile, name: string): Parser<Documentable>
```

Added in v0.2.0

# getTypeAliases

**Signature**

```ts
export declare function getTypeAliases(sourceFile: ast.SourceFile): Parser<Array<TypeAlias>>
```

Added in v0.2.0

# interface\_

**Signature**

```ts
export declare function interface_(documentable: Documentable, signature: string): Interface
```

Added in v0.2.0

# method

**Signature**

```ts
export declare function method(documentable: Documentable, signatures: Array<string>): Method
```

Added in v0.2.0

# module

**Signature**

```ts
export declare function module(
  documentable: Documentable,
  path: Array<string>,
  interfaces: Array<Interface>,
  typeAliases: Array<TypeAlias>,
  functions: Array<Func>,
  classes: Array<Class>,
  constants: Array<Constant>,
  exports: Array<Export>
): Module
```

Added in v0.2.0

# property

**Signature**

```ts
export declare function property(documentable: Documentable, signature: string): Property
```

Added in v0.4.0

# run

**Signature**

```ts
export declare function run(files: Array<File>): Parser<Array<Module>>
```

Added in v0.2.0

# typeAlias

**Signature**

```ts
export declare function typeAlias(documentable: Documentable, signature: string): TypeAlias
```

Added in v0.2.0
