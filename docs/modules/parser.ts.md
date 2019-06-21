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
- [monadParser (constant)](#monadparser-constant)
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
- [getModuleName (function)](#getmodulename-function)
- [getSourceFile (function)](#getsourcefile-function)
- [getTypeAliases (function)](#gettypealiases-function)
- [interface\_ (function)](#interface_-function)
- [method (function)](#method-function)
- [module (function)](#module-function)
- [parse (function)](#parse-function)
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

# Constant (interface)

**Signature**

```ts
export interface Constant extends Documentable {
  readonly signature: string
}
```

# Documentable (interface)

**Signature**

```ts
export interface Documentable {
  readonly name: string
  readonly description: O.Option<string>
  readonly since: O.Option<string>
  readonly deprecated: boolean
  readonly examples: Array<Example>
}
```

# Export (interface)

**Signature**

```ts
export interface Export extends Documentable {
  readonly signature: string
}
```

# File (interface)

**Signature**

```ts
export interface File {
  path: string
  content: string
}
```

# Func (interface)

**Signature**

```ts
export interface Func extends Documentable {
  readonly signatures: Array<string>
}
```

# Interface (interface)

**Signature**

```ts
export interface Interface extends Documentable {
  signature: string
}
```

# Method (interface)

**Signature**

```ts
export interface Method extends Documentable {
  readonly signatures: Array<string>
}
```

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

# TypeAlias (interface)

**Signature**

```ts
export interface TypeAlias extends Documentable {
  readonly signature: string
}
```

# Example (type alias)

**Signature**

```ts
export type Example = string
```

# Parser (type alias)

**Signature**

```ts
export type Parser<A> = E.Either<Array<string>, A>
```

# monadParser (constant)

**Signature**

```ts
export const monadParser = ...
```

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

# constant (function)

**Signature**

```ts
export function constant(documentable: Documentable, signature: string): Constant { ... }
```

# documentable (function)

**Signature**

```ts
export function documentable(
  name: string,
  description: O.Option<string>,
  since: O.Option<string>,
  deprecated: boolean,
  examples: Array<Example>
): Documentable { ... }
```

# example (function)

**Signature**

```ts
export function example(code: string): Example { ... }
```

# export\_ (function)

**Signature**

```ts
export function export_(documentable: Documentable, signature: string): Export { ... }
```

# func (function)

**Signature**

```ts
export function func(documentable: Documentable, signatures: Array<string>): Func { ... }
```

# getClasses (function)

**Signature**

```ts
export function getClasses(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Class>> { ... }
```

# getConstants (function)

**Signature**

```ts
export function getConstants(sourceFile: ast.SourceFile): Parser<Array<Constant>> { ... }
```

# getExports (function)

**Signature**

```ts
export function getExports(sourceFile: ast.SourceFile): Parser<Array<Export>> { ... }
```

# getFunctions (function)

**Signature**

```ts
export function getFunctions(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Func>> { ... }
```

# getInterfaces (function)

**Signature**

```ts
export function getInterfaces(sourceFile: ast.SourceFile): Parser<Array<Interface>> { ... }
```

# getModuleInfo (function)

**Signature**

```ts
export function getModuleInfo(sourceFile: ast.SourceFile): { description: O.Option<string>; deprecated: boolean } { ... }
```

# getModuleName (function)

**Signature**

```ts
export function getModuleName(p: Array<string>): string { ... }
```

# getSourceFile (function)

**Signature**

```ts
export function getSourceFile(name: string, source: string): ast.SourceFile { ... }
```

# getTypeAliases (function)

**Signature**

```ts
export function getTypeAliases(sourceFile: ast.SourceFile): Parser<Array<TypeAlias>> { ... }
```

# interface\_ (function)

**Signature**

```ts
export function interface_(documentable: Documentable, signature: string): Interface { ... }
```

# method (function)

**Signature**

```ts
export function method(documentable: Documentable, signatures: Array<string>): Method { ... }
```

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

# parse (function)

**Signature**

```ts
export function parse(path: Array<string>, source: string): Parser<Module> { ... }
```

# run (function)

**Signature**

```ts
export function run(files: Array<File>): Parser<Array<Module>> { ... }
```

# typeAlias (function)

**Signature**

```ts
export function typeAlias(documentable: Documentable, signature: string): TypeAlias { ... }
```
