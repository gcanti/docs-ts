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
  - [Capabilities (interface)](#capabilities-interface)
  - [EnvironmentWithConfig (interface)](#environmentwithconfig-interface)
  - [Program (interface)](#program-interface)
  - [ProgramWithConfig (interface)](#programwithconfig-interface)

---

# main

## main

**Signature**

```ts
export declare const main: Program<void>
```

Added in v0.6.0

# model

## Capabilities (interface)

**Signature**

````ts
export interface Capabilities {
  /**
   * Executes a command like:
   *
   * ```sh
   * ts-node examples/index.ts
   * ```
   *
   * where `command = ts-node` and `executable = examples/index.ts`
   */
  readonly spawn: (command: string, executable: string) => TaskEither.TaskEither<Error, void>
  readonly fileSystem: FileSystem
  readonly logger: Logger
  readonly addFile: (file: File) => (project: ast.Project) => void
}
````

Added in v0.6.0

## EnvironmentWithConfig (interface)

**Signature**

```ts
export interface EnvironmentWithConfig extends Capabilities {
  readonly config: _.Config
}
```

Added in v0.6.0

## Program (interface)

**Signature**

```ts
export interface Program<A> extends RTE.ReaderTaskEither<Capabilities, Error, A> {}
```

Added in v0.6.0

## ProgramWithConfig (interface)

**Signature**

```ts
export interface ProgramWithConfig<A> extends RTE.ReaderTaskEither<EnvironmentWithConfig, Error, A> {}
```

Added in v0.6.0
