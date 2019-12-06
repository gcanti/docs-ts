---
title: core.ts
nav_order: 2
parent: Modules
---

# core overview

Added in v0.2.0

---

<h2 class="text-delta">Table of contents</h2>

- [AppEff (interface)](#appeff-interface)
- [Capabilities (interface)](#capabilities-interface)
- [Eff (interface)](#eff-interface)
- [MonadFileSystem (interface)](#monadfilesystem-interface)
- [MonadLog (interface)](#monadlog-interface)
- [main (constant)](#main-constant)

---

# AppEff (interface)

App effect

**Signature**

```ts
export interface AppEff<A> extends RTE.ReaderTaskEither<Capabilities, string, A> {}
```

Added in v0.2.0

# Capabilities (interface)

**Signature**

```ts
export interface Capabilities extends MonadFileSystem, MonadLog {}
```

Added in v0.2.0

# Eff (interface)

capabilities

**Signature**

```ts
export interface Eff<A> extends TE.TaskEither<string, A> {}
```

Added in v0.2.0

# MonadFileSystem (interface)

**Signature**

```ts
export interface MonadFileSystem {
  readonly getFilenames: (pattern: string) => Eff<Array<string>>
  readonly readFile: (path: string) => Eff<string>
  readonly writeFile: (path: string, content: string) => Eff<void>
  readonly existsFile: (path: string) => Eff<boolean>
  readonly clean: (pattern: string) => Eff<void>
}
```

Added in v0.2.0

# MonadLog (interface)

**Signature**

```ts
export interface MonadLog {
  readonly info: (message: string) => Eff<void>
  readonly log: (message: string) => Eff<void>
  readonly debug: (message: string) => Eff<void>
}
```

Added in v0.2.0

# main (constant)

**Signature**

```ts
export const main: AppEff<void> = ...
```

Added in v0.2.0
