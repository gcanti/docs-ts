---
title: core.ts
nav_order: 2
parent: Modules
---

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

# Capabilities (interface)

**Signature**

```ts
export interface Capabilities extends MonadFileSystem, MonadLog {}
```

# Eff (interface)

capabilities

**Signature**

```ts
export interface Eff<A> extends TE.TaskEither<string, A> {}
```

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

# MonadLog (interface)

**Signature**

```ts
export interface MonadLog {
  readonly info: (message: string) => Eff<void>
  readonly log: (message: string) => Eff<void>
  readonly debug: (message: string) => Eff<void>
}
```

# main (constant)

**Signature**

```ts
export const main: AppEff<void> = ...
```
