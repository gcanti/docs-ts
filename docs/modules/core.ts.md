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
export interface App<A> extends TaskEither<string, A> {}
```

# MonadApp (interface)

App capabilities

**Signature**

```ts
export interface MonadApp extends MonadFileSystem, MonadLog, MonadTask2<'TaskEither'> {}
```

# MonadFileSystem (interface)

**Signature**

```ts
export interface MonadFileSystem {
  getFilenames: (pattern: string) => Task<Array<string>>
  readFile: (path: string) => App<string>
  writeFile: (path: string, content: string) => App<void>
  existsFile: (path: string) => Task<boolean>
  clean: (pattern: string) => Task<void>
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
