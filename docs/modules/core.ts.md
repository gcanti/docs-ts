---
title: core.ts
nav_order: 2
parent: Modules
---

---

<h2 class="text-delta">Table of contents</h2>

- [App (interface)](#app-interface)
- [MonadApp (interface)](#monadapp-interface)
- [MonadFileSystem (interface)](#monadfilesystem-interface)
- [MonadLog (interface)](#monadlog-interface)
- [main (function)](#main-function)

---

# App (interface)

**Signature**

```ts
export interface App<A> extends TE.TaskEither<string, A> {}
```

# MonadApp (interface)

App capabilities

**Signature**

```ts
export interface MonadApp extends MonadFileSystem, MonadLog {}
```

# MonadFileSystem (interface)

**Signature**

```ts
export interface MonadFileSystem {
  getFilenames: (pattern: string) => App<Array<string>>
  readFile: (path: string) => App<string>
  writeFile: (path: string, content: string) => App<void>
  existsFile: (path: string) => App<boolean>
  clean: (pattern: string) => App<void>
}
```

# MonadLog (interface)

**Signature**

```ts
export interface MonadLog {
  log: (message: string) => App<void>
}
```

# main (function)

**Signature**

```ts
export function main(M: MonadApp): App<void> { ... }
```
