---
title: Parser.ts
nav_order: 7
parent: Modules
---

## Parser overview

Added in v0.9.0

---

<h2 class="text-delta">Table of contents</h2>

- [model](#model)
  - [ParserEffect (interface)](#parsereffect-interface)
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

## ParserEffect (interface)

**Signature**

```ts
export interface ParserEffect<A> extends RE.ReaderEither<ParserEnv, Array<string>, A> {}
```

Added in v0.9.0

## ParserEnv (interface)

**Signature**

```ts
export interface ParserEnv {
  readonly config: _.Config
  readonly path: RNEA.ReadonlyNonEmptyArray<string>
  readonly sourceFile: ast.SourceFile
}
```

Added in v0.9.0

# parsers

## parseClasses

**Signature**

```ts
export declare const parseClasses: ParserEffect<Module.Class[]>
```

Added in v0.9.0

## parseConstants

**Signature**

```ts
export declare const parseConstants: ParserEffect<Module.Constant[]>
```

Added in v0.9.0

## parseExports

**Signature**

```ts
export declare const parseExports: ParserEffect<Module.Export[]>
```

Added in v0.9.0

## parseFiles

**Signature**

```ts
export declare const parseFiles: (files: ReadonlyArray<_.File>) => Effect.Effect<Config, string[][], Module.Module[]>
```

Added in v0.9.0

## parseFunctions

**Signature**

```ts
export declare const parseFunctions: ParserEffect<Module.Function[]>
```

Added in v0.9.0

## parseInterfaces

**Signature**

```ts
export declare const parseInterfaces: ParserEffect<Module.Interface[]>
```

Added in v0.9.0

## parseModule

**Signature**

```ts
export declare const parseModule: ParserEffect<Module.Module>
```

Added in v0.9.0

## parseTypeAliases

**Signature**

```ts
export declare const parseTypeAliases: ParserEffect<Module.TypeAlias[]>
```

Added in v0.9.0
