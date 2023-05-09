---
title: Run.ts
nav_order: 11
parent: Modules
---

## Run overview

Added in v0.6.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [run](#run)

---

# utils

## run

Executes a command like:

```
ts-node examples/index.ts
```

where `command = ts-node` and `executable = examples/index.ts`

**Signature**

```ts
export declare const run: (command: string, executable: string) => TE.TaskEither<string, void>
```

Added in v0.6.0
