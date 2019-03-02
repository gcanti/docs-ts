---
title: parser.ts
nav_order: 6
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Class](#class)
- [Constant](#constant)
- [Documentable](#documentable)
- [File](#file)
- [Func](#func)
- [Interface](#interface)
- [Method](#method)
- [Module](#module)
- [TypeAlias](#typealias)
- [Parser](#parser)
- [monadParser](#monadparser)
- [class\_](#class%5C_)
- [constant](#constant)
- [documentable](#documentable)
- [func](#func)
- [getClasses](#getclasses)
- [getConstants](#getconstants)
- [getFunctions](#getfunctions)
- [getInterfaces](#getinterfaces)
- [getModuleDescription](#getmoduledescription)
- [getModuleName](#getmodulename)
- [getSourceFile](#getsourcefile)
- [getTypeAliases](#gettypealiases)
- [interface\_](#interface%5C_)
- [method](#method)
- [module](#module)
- [parse](#parse)
- [run](#run)
- [typeAlias](#typealias)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Class

**Signature** (interface)

```ts
export interface Class extends Documentable {
  readonly signature: string
  readonly methods: Array<Method>
  readonly staticMethods: Array<Method>
}
```

# Constant

**Signature** (interface)

```ts
export interface Constant extends Documentable {
  readonly signature: string
}
```

# Documentable

**Signature** (interface)

```ts
export interface Documentable {
  readonly name: string
  readonly description: Option<string>
  readonly since: Option<string>
  readonly deprecated: boolean
  readonly example: Option<string>
}
```

# File

**Signature** (interface)

```ts
export interface File {
  path: string
  content: string
}
```

# Func

**Signature** (interface)

```ts
export interface Func extends Documentable {
  readonly signatures: Array<string>
}
```

# Interface

**Signature** (interface)

```ts
export interface Interface extends Documentable {
  signature: string
}
```

# Method

**Signature** (interface)

```ts
export interface Method extends Documentable {
  readonly signatures: Array<string>
}
```

# Module

**Signature** (interface)

```ts
export interface Module {
  readonly path: Array<string>
  readonly description: Option<string>
  readonly interfaces: Array<Interface>
  readonly typeAliases: Array<TypeAlias>
  readonly functions: Array<Func>
  readonly classes: Array<Class>
  readonly constants: Array<Constant>
}
```

# TypeAlias

**Signature** (interface)

```ts
export interface TypeAlias extends Documentable {
  readonly signature: string
}
```

# Parser

**Signature** (type alias)

```ts
export type Parser<A> = Validation<Array<string>, A>
```

# monadParser

**Signature** (constant)

```ts
export const monadParser = ...
```

# class\_

**Signature** (function)

```ts
export function class_(
  documentable: Documentable,
  signature: string,
  methods: Array<Method>,
  staticMethods: Array<Method>
): Class { ... }
```

# constant

**Signature** (function)

```ts
export function constant(documentable: Documentable, signature: string): Constant { ... }
```

# documentable

**Signature** (function)

```ts
export function documentable(
  name: string,
  description: Option<string>,
  since: Option<string>,
  deprecated: boolean,
  example: Option<string>
): Documentable { ... }
```

# func

**Signature** (function)

```ts
export function func(documentable: Documentable, signatures: Array<string>): Func { ... }
```

# getClasses

**Signature** (function)

```ts
export function getClasses(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Class>> { ... }
```

# getConstants

**Signature** (function)

```ts
export function getConstants(sourceFile: ast.SourceFile): Parser<Array<Constant>> { ... }
```

# getFunctions

**Signature** (function)

```ts
export function getFunctions(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Func>> { ... }
```

# getInterfaces

**Signature** (function)

```ts
export function getInterfaces(sourceFile: ast.SourceFile): Parser<Array<Interface>> { ... }
```

# getModuleDescription

**Signature** (function)

```ts
export function getModuleDescription(sourceFile: ast.SourceFile): Option<string> { ... }
```

# getModuleName

**Signature** (function)

```ts
export function getModuleName(p: Array<string>): string { ... }
```

# getSourceFile

**Signature** (function)

```ts
export function getSourceFile(name: string, source: string): ast.SourceFile { ... }
```

# getTypeAliases

**Signature** (function)

```ts
export function getTypeAliases(sourceFile: ast.SourceFile): Parser<Array<TypeAlias>> { ... }
```

# interface\_

**Signature** (function)

```ts
export function interface_(documentable: Documentable, signature: string): Interface { ... }
```

# method

**Signature** (function)

```ts
export function method(documentable: Documentable, signatures: Array<string>): Method { ... }
```

# module

**Signature** (function)

```ts
export function module(
  path: Array<string>,
  description: Option<string>,
  interfaces: Array<Interface>,
  typeAliases: Array<TypeAlias>,
  functions: Array<Func>,
  classes: Array<Class>,
  constants: Array<Constant>
): Module { ... }
```

# parse

**Signature** (function)

```ts
export function parse(path: Array<string>, source: string): Parser<Module> { ... }
```

# run

**Signature** (function)

```ts
export function run(files: Array<File>): Parser<Array<Module>> { ... }
```

# typeAlias

**Signature** (function)

```ts
export function typeAlias(documentable: Documentable, signature: string): TypeAlias { ... }
```
