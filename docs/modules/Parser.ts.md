---
title: Parser.ts
nav_order: 10
parent: Modules
---

## Parser overview

Added in v0.6.0

---

<h2 class="text-delta">Table of contents</h2>

- [model](#model)
  - [Ast (interface)](#ast-interface)
  - [Parser (interface)](#parser-interface)
  - [ParserEnv (interface)](#parserenv-interface)
- [parsers](#parsers)
  - [parseClasses](#parseclasses)
  - [parseConstants](#parseconstants)
  - [parseExports](#parseexports)
  - [parseFiles](#parsefiles)
  - [parseFunctions](#parsefunctions)
  - [parseInterfaces](#parseinterfaces)
  - [parseModule](#parsemodule)
  - [parseTypeAliases](#parsetypealiases)

---

# model

## Ast (interface)

**Signature**

```ts
export interface Ast {
  readonly project: ast.Project
  readonly addFile: (file: File) => R.Reader<ast.Project, void>
}
```

Added in v0.6.0

## Parser (interface)

**Signature**

```ts
export interface Parser<A> extends RE.ReaderEither<ParserEnv, string, A> {}
```

Added in v0.6.0

## ParserEnv (interface)

**Signature**

```ts
export interface ParserEnv extends Environment {
  readonly path: RNEA.ReadonlyNonEmptyArray<string>
  readonly sourceFile: ast.SourceFile
}
```

Added in v0.6.0

# parsers

## parseClasses

**Signature**

```ts
export declare const parseClasses: Parser<readonly Class[]>
```

Added in v0.6.0

## parseConstants

**Signature**

```ts
export declare const parseConstants: Parser<readonly Constant[]>
```

Added in v0.6.0

## parseExports

**Signature**

```ts
export declare const parseExports: Parser<readonly Export[]>
```

Added in v0.6.0

## parseFiles

**Signature**

```ts
export declare const parseFiles: (
  files: ReadonlyArray<File>
) => RTE.ReaderTaskEither<Environment, string, ReadonlyArray<Module>>
```

Added in v0.6.0

## parseFunctions

**Signature**

```ts
export declare const parseFunctions: Parser<readonly Function[]>
```

Added in v0.6.0

## parseInterfaces

**Signature**

```ts
export declare const parseInterfaces: Parser<readonly Interface[]>
```

Added in v0.6.0

## parseModule

**Signature**

```ts
export declare const parseModule: Parser<Module>
```

Added in v0.6.0

## parseTypeAliases

**Signature**

```ts
export declare const parseTypeAliases: Parser<readonly TypeAlias[]>
```

Added in v0.6.0
