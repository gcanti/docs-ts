---
title: Core.ts
nav_order: 2
parent: Modules
---

## Core overview

Added in v0.6.0

---

<h2 class="text-delta">Table of contents</h2>

- [main](#main)
  - [main](#main-1)
- [model](#model)
  - [EnvironmentWithConfig (interface)](#environmentwithconfig-interface)
  - [ProgramWithConfig (interface)](#programwithconfig-interface)

---

# main

## main

**Signature**

```ts
export declare const main: TaskEither.TaskEither<Error, void>
```

Added in v0.6.0

# model

## EnvironmentWithConfig (interface)

**Signature**

```ts
export interface EnvironmentWithConfig {
  readonly config: _.Config
}
```

Added in v0.6.0

## ProgramWithConfig (interface)

**Signature**

```ts
export interface ProgramWithConfig<A> extends RTE.ReaderTaskEither<EnvironmentWithConfig, Error, A> {}
```

Added in v0.6.0
