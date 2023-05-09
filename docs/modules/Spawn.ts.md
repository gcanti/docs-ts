---
title: Spawn.ts
nav_order: 11
parent: Modules
---

## Spawn overview

Added in v0.6.0

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
export declare const spawn: (command: string, executable: string) => TE.TaskEither<string, void>
```

Added in v0.6.0
