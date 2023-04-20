---
title: index.ts
nav_order: 6
parent: Modules
---

## index overview

Added in v0.2.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [exit](#exit)
  - [main](#main)

---

# utils

## exit

**Signature**

```ts
export declare const exit: (program: TE.TaskEither<string, void>) => T.Task<void>
```

Added in v0.6.0

## main

**Signature**

```ts
export declare const main: T.Task<void>
```

**Example**

```ts
assert.deepStrictEqual(1, 1)
```

Added in v0.6.0
