---
title: Example.ts
nav_order: 4
parent: Modules
---

## Example overview

Added in v0.6.0

---

<h2 class="text-delta">Table of contents</h2>

- [instances](#instances)
  - [Example](#example)
- [model](#model)
  - [Example (interface)](#example-interface)
- [utils](#utils)
  - [run](#run)

---

# instances

## Example

**Signature**

```ts
export declare const Example: Example
```

Added in v0.6.0

# model

## Example (interface)

Represents a file containing examples specified in the documentation of a module
or its exports which can be "run" to determine if they pass the TypeScript type
checker.

**Signature**

```ts
export interface Example {
  readonly run: (command: string, executablePath: string) => TE.TaskEither<string, void>
}
```

Added in v0.6.0

# utils

## run

**Signature**

```ts
export declare const run: (command: string, executablePath: string) => TE.TaskEither<string, void>
```

Added in v0.6.0
