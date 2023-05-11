---
title: Spawn.ts
nav_order: 9
parent: Modules
---

## Spawn overview

Added in v0.8.0

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
export declare const spawn: (command: string, executable: string) => TE.TaskEither<Error, void>
```

Added in v0.6.0
