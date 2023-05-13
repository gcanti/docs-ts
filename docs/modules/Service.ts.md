---
title: Service.ts
nav_order: 8
parent: Modules
---

## Service overview

Added in v0.9.0

---

<h2 class="text-delta">Table of contents</h2>

- [service](#service)
  - [Config](#config)
  - [Config (interface)](#config-interface)
  - [Parser](#parser)
  - [Parser (interface)](#parser-interface)

---

# service

## Config

**Signature**

```ts
export declare const Config: Context.Tag<Config, Config>
```

Added in v0.9.0

## Config (interface)

**Signature**

```ts
export interface Config {
  readonly config: _.Config
}
```

Added in v0.9.0

## Parser

**Signature**

```ts
export declare const Parser: Context.Tag<Parser, Parser>
```

Added in v0.9.0

## Parser (interface)

**Signature**

```ts
export interface Parser {
  readonly path: ReadonlyArray.NonEmptyReadonlyArray<string>
  readonly sourceFile: ast.SourceFile
}
```

Added in v0.9.0
