---
title: Service.ts
nav_order: 12
parent: Modules
---

## Service overview

Added in v0.9.0

---

<h2 class="text-delta">Table of contents</h2>

- [service](#service)
  - [Config](#config)
  - [Config (interface)](#config-interface)
  - [Source](#source)
  - [Source (interface)](#source-interface)

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
  readonly config: config.Config
}
```

Added in v0.9.0

## Source

**Signature**

```ts
export declare const Source: Context.Tag<Source, Source>
```

Added in v0.9.0

## Source (interface)

**Signature**

```ts
export interface Source {
  readonly path: ReadonlyArray.NonEmptyReadonlyArray<string>
  readonly sourceFile: ast.SourceFile
}
```

Added in v0.9.0
