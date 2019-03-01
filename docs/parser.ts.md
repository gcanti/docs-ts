---
title: parser.ts
nav_order: 4
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Class](#class)
- [Constant](#constant)
- [Documentable](#documentable)
- [Func](#func)
- [Interface](#interface)
- [Method](#method)
- [TypeAlias](#typealias)
- [File](#file)
- [Node](#node)
- [monadParser](#monadparser)
- [class\_](#class%5C_)
- [constant](#constant)
- [directory](#directory)
- [documentable](#documentable)
- [file](#file)
- [fold](#fold)
- [fromDir](#fromdir)
- [fromForest](#fromforest)
- [fromPaths](#frompaths)
- [func](#func)
- [getClasses](#getclasses)
- [getConstants](#getconstants)
- [getFunctions](#getfunctions)
- [getInterfaces](#getinterfaces)
- [getModuleDescription](#getmoduledescription)
- [getModuleName](#getmodulename)
- [getSourceFile](#getsourcefile)
- [getTypeAliases](#gettypealiases)
- [index](#index)
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

# TypeAlias

**Signature** (interface)

```ts
export interface TypeAlias extends Documentable {
  readonly signature: string
}
```

# File

**Signature** (type alias)

```ts
export type File =
  | {
      readonly type: 'Directory'
      readonly path: Array<string>
      readonly children: Array<string>
    }
  | {
      readonly type: 'File'
      readonly path: Array<string>
    }
```

# Node

**Signature** (type alias)

```ts
export type Node =
  | {
      readonly type: 'Index'
      readonly path: Array<string>
      readonly children: Array<string>
    }
  | {
      readonly type: 'Module'
      readonly path: Array<string>
      readonly description: Option<string>
      readonly interfaces: Array<Interface>
      readonly typeAliases: Array<TypeAlias>
      readonly functions: Array<Func>
      readonly classes: Array<Class>
      readonly constants: Array<Constant>
    }
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

# directory

**Signature** (function)

```ts
export function directory(path: Array<string>, children: Array<string>): File { ... }
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

# file

**Signature** (function)

```ts
export function file(path: Array<string>): File { ... }
```

# fold

**Signature** (function)

```ts
export function fold<R>(
  fa: Node,
  onIndex: (path: Array<string>, children: Array<string>) => R,
  onModule: (
    path: Array<string>,
    description: Option<string>,
    interfaces: Array<Interface>,
    typeAliases: Array<TypeAlias>,
    functions: Array<Func>,
    classes: Array<Class>,
    constants: Array<Constant>
  ) => R
): R { ... }
```

# fromDir

**Signature** (function)

```ts
export function fromDir(dir: Dir): Forest<File> { ... }
```

# fromForest

**Signature** (function)

```ts
export function fromForest(forest: Forest<File>): Parser<Forest<Node>> { ... }
```

# fromPaths

**Signature** (function)

```ts
export function fromPaths(paths: Array<string>): Dir { ... }
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

# index

**Signature** (function)

```ts
export function index(path: Array<string>, children: Array<string>): Node { ... }
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
): Node { ... }
```

# parse

**Signature** (function)

```ts
export function parse(file: File, source: string): Parser<Node> { ... }
```

# run

**Signature** (function)

```ts
export function run(pattern: string): Parser<Forest<Node>> { ... }
```

# typeAlias

**Signature** (function)

```ts
export function typeAlias(documentable: Documentable, signature: string): TypeAlias { ... }
```
