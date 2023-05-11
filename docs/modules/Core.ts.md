---
title: Core.ts
nav_order: 2
parent: Modules
---

## Core overview

Added in v0.9.0

---

<h2 class="text-delta">Table of contents</h2>

- [main](#main)
  - [main](#main-1)
- [model](#model)
  - [Program (interface)](#program-interface)

---

# main

## main

**Signature**

```ts
export declare const main: Effect.Effect<never, Error, void>
```

Added in v0.9.0

# model

## Program (interface)

**Signature**

```ts
export interface Program<A> extends RTE.ReaderTaskEither<_.Config, Error, A> {}
```

Added in v0.9.0
