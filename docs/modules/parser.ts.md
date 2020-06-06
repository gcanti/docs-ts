---
title: parser.ts
nav_order: 6
parent: Modules
---

## parser overview

parser utilities

Added in v0.2.0

---

<h2 class="text-delta">Table of contents</h2>

- [model](#model)
  - [Env (interface)](#env-interface)
  - [File (interface)](#file-interface)
  - [Parser (interface)](#parser-interface)
- [parser](#parser)
  - [parseClasses](#parseclasses)
  - [parseConstants](#parseconstants)
  - [parseExports](#parseexports)
  - [parseFunctions](#parsefunctions)
  - [parseInterfaces](#parseinterfaces)
  - [parseModule](#parsemodule)
  - [parseTypeAliases](#parsetypealiases)
- [utils](#utils)
  - [parseFiles](#parsefiles)

---

# model

## Env (interface)

**Signature**

```ts
export interface Env {
  path: Array<string>
  sourceFile: ast.SourceFile
}
```

Added in v0.5.0

## File (interface)

**Signature**

```ts
export interface File {
  path: string
  content: string
}
```

Added in v0.2.0

## Parser (interface)

**Signature**

```ts
export interface Parser<A> extends RE.ReaderEither<Env, string, A> {}
```

Added in v0.2.0

# parser

## parseClasses

**Signature**

```ts
export declare const parseClasses: Parser<D.Class[]>
```

Added in v0.2.0

## parseConstants

**Signature**

```ts
export declare const parseConstants: Parser<D.Constant[]>
```

Added in v0.2.0

## parseExports

**Signature**

```ts
export declare const parseExports: Parser<D.Export[]>
```

Added in v0.2.0

## parseFunctions

**Signature**

```ts
export declare const parseFunctions: Parser<D.Function[]>
```

Added in v0.2.0

## parseInterfaces

**Signature**

```ts
export declare const parseInterfaces: Parser<D.Interface[]>
```

Added in v0.2.0

## parseModule

**Signature**

```ts
export declare const parseModule: Parser<D.Module>
```

Added in v0.5.0

## parseTypeAliases

**Signature**

```ts
export declare const parseTypeAliases: Parser<D.TypeAlias[]>
```

Added in v0.2.0

# utils

## parseFiles

**Signature**

```ts
export declare function parseFiles(files: Array<File>): E.Either<string, Array<D.Module>>
```

Added in v0.5.0
