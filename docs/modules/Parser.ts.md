---
title: Parser.ts
nav_order: 9
parent: Modules
---

## Parser overview

Added in v0.6.0

---

<h2 class="text-delta">Table of contents</h2>

- [model](#model)
  - [Env (interface)](#env-interface)
  - [Parser (interface)](#parser-interface)
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

## Env (interface)

**Signature**

```ts
export interface Env extends Settings {
  readonly path: RNEA.ReadonlyNonEmptyArray<string>
  readonly sourceFile: ast.SourceFile
}
```

Added in v0.6.0

## Parser (interface)

**Signature**

```ts
export interface Parser<A> extends RE.ReaderEither<Env, string, A> {}
```

Added in v0.6.0

# parsers

## parseClasses

**Signature**

```ts
export declare const parseClasses: Parser<any>
```

Added in v0.6.0

## parseConstants

**Signature**

```ts
export declare const parseConstants: Parser<any>
```

Added in v0.6.0

## parseExports

**Signature**

```ts
export declare const parseExports: Parser<any>
```

Added in v0.6.0

## parseFiles

**Signature**

```ts
export declare const parseFiles: (files: any) => any
```

Added in v0.6.0

## parseFunctions

**Signature**

```ts
export declare const parseFunctions: Parser<any>
```

Added in v0.6.0

## parseInterfaces

**Signature**

```ts
export declare const parseInterfaces: Parser<any>
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
export declare const parseTypeAliases: Parser<any>
```

Added in v0.6.0
