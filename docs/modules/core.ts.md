---
title: Core.ts
nav_order: 2
parent: Modules
---

## Core overview

Added in v0.6.0

---

<h2 class="text-delta">Table of contents</h2>

- [model](#model)
  - [Capabilities (interface)](#capabilities-interface)
  - [Effect (interface)](#effect-interface)
  - [Environment (interface)](#environment-interface)
  - [Program (interface)](#program-interface)
- [program](#program)
  - [main](#main)

---

# model

## Capabilities (interface)

**Signature**

```ts
export interface Capabilities extends FS.FileSystem, L.Logger {}
```

Added in v0.6.0

## Effect (interface)

**Signature**

```ts
export interface Effect<A> extends RTE.ReaderTaskEither<Capabilities, string, A> {}
```

Added in v0.6.0

## Environment (interface)

**Signature**

```ts
export interface Environment {
  readonly capabilities: Capabilities
  readonly settings: Config.Settings
}
```

Added in v0.6.0

## Program (interface)

**Signature**

```ts
export interface Program<A> extends RTE.ReaderTaskEither<Environment, string, A> {}
```

Added in v0.6.0

# program

## main

**Signature**

```ts
export declare const main: Effect<void>
```

Added in v0.6.0
