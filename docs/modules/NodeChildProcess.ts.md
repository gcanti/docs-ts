---
title: NodeChildProcess.ts
nav_order: 7
parent: Modules
---

## NodeChildProcess overview

Added in v0.9.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [spawn](#spawn)

---

# utils

## spawn

Executes a command like:

```sh
ts-node examples/index.ts
```

where `command = ts-node` and `executable = examples/index.ts`

**Signature**

```ts
export declare const spawn: (command: string, executable: string) => Either.Either<Error, void>
```

Added in v0.9.0
