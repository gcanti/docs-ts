---
title: parser.ts
nav_order: 5
parent: Modules
---

# Overview

parser utilities

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
- [TypeAlias (interface)](#typealias-interface)
- [Example (type alias)](#example-type-alias)
- [Parser (type alias)](#parser-type-alias)
- [class\_ (function)](#class_-function)
- [constant (function)](#constant-function)
- [documentable (function)](#documentable-function)
- [example (function)](#example-function)
- [export\_ (function)](#export_-function)
- [func (function)](#func-function)
- [getClasses (function)](#getclasses-function)
- [getConstants (function)](#getconstants-function)
- [getExports (function)](#getexports-function)
- [getFunctions (function)](#getfunctions-function)
- [getInterfaces (function)](#getinterfaces-function)
- [getModuleInfo (function)](#getmoduleinfo-function)
- [getTypeAliases (function)](#gettypealiases-function)
- [interface\_ (function)](#interface_-function)
- [method (function)](#method-function)
- [module (function)](#module-function)
- [run (function)](#run-function)
- [typeAlias (function)](#typealias-function)

---

# Class (interface)

**Signature**

```ts
export interface Class extends Documentable {
  readonly signature: string
  readonly methods: Array<Method>
  readonly staticMethods: Array<Method>
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
export interface Module {
  readonly path: Array<string>
  readonly description: O.Option<string>
  readonly interfaces: Array<Interface>
  readonly typeAliases: Array<TypeAlias>
  readonly functions: Array<Func>
  readonly classes: Array<Class>
  readonly constants: Array<Constant>
  readonly exports: Array<Export>
  readonly deprecated: boolean
}
```

Added in v0.2.0

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

# class\_ (function)

**Signature**

```ts
export function class_(
  documentable: Documentable,
  signature: string,
  methods: Array<Method>,
  staticMethods: Array<Method>
): Class { ... }
```

Added in v0.2.0

# constant (function)

**Signature**

```ts
export function constant(documentable: Documentable, signature: string): Constant { ... }
```

Added in v0.2.0

# documentable (function)

**Signature**

```ts
export function documentable(
  name: string,
  description: O.Option<string>,
  since: string,
  deprecated: boolean,
  examples: Array<Example>
): Documentable { ... }
```

Added in v0.2.0

# example (function)

**Signature**

```ts
export function example(code: string): Example { ... }
```

Added in v0.2.0

# export\_ (function)

**Signature**

```ts
export function export_(documentable: Documentable, signature: string): Export { ... }
```

Added in v0.2.0

# func (function)

**Signature**

```ts
export function func(documentable: Documentable, signatures: Array<string>): Func { ... }
```

Added in v0.2.0

# getClasses (function)

**Signature**

```ts
export function getClasses(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Class>> { ... }
```

Added in v0.2.0

# getConstants (function)

**Signature**

```ts
export function getConstants(sourceFile: ast.SourceFile): Parser<Array<Constant>> { ... }
```

Added in v0.2.0

# getExports (function)

**Signature**

```ts
export function getExports(sourceFile: ast.SourceFile): Parser<Array<Export>> { ... }
```

Added in v0.2.0

# getFunctions (function)

**Signature**

```ts
export function getFunctions(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Func>> { ... }
```

Added in v0.2.0

# getInterfaces (function)

**Signature**

```ts
export function getInterfaces(sourceFile: ast.SourceFile): Parser<Array<Interface>> { ... }
```

Added in v0.2.0

# getModuleInfo (function)

**Signature**

```ts
export function getModuleInfo(sourceFile: ast.SourceFile): { description: O.Option<string>; deprecated: boolean } { ... }
```

Added in v0.2.0

# getTypeAliases (function)

**Signature**

```ts
export function getTypeAliases(sourceFile: ast.SourceFile): Parser<Array<TypeAlias>> { ... }
```

Added in v0.2.0

# interface\_ (function)

**Signature**

```ts
export function interface_(documentable: Documentable, signature: string): Interface { ... }
```

Added in v0.2.0

# method (function)

**Signature**

```ts
export function method(documentable: Documentable, signatures: Array<string>): Method { ... }
```

Added in v0.2.0

# module (function)

**Signature**

```ts
export function module(
  path: Array<string>,
  description: O.Option<string>,
  interfaces: Array<Interface>,
  typeAliases: Array<TypeAlias>,
  functions: Array<Func>,
  classes: Array<Class>,
  constants: Array<Constant>,
  exports: Array<Export>,
  deprecated: boolean
): Module { ... }
```

Added in v0.2.0

# run (function)

**Signature**

```ts
export function run(files: Array<File>): Parser<Array<Module>> { ... }
```

Added in v0.2.0

# typeAlias (function)

**Signature**

```ts
export function typeAlias(documentable: Documentable, signature: string): TypeAlias { ... }
```

Added in v0.2.0
