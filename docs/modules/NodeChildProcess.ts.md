---
title: NodeChildProcess.ts
nav_order: 9
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
ts-node docs/examples/index.ts
```

where `command = ts-node` and `executable = docs/examples/index.ts`

**Signature**

```ts
export declare const spawn: (command: string, executable: string) => Either.Either<Error, void>
```

Added in v0.9.0
