---
title: core.ts
nav_order: 2
parent: Modules
---

---

<h2 class="text-delta">Table of contents</h2>

- [MonadApp (interface)](#monadapp-interface)
- [MonadFileSystem (interface)](#monadfilesystem-interface)
- [MonadLog (interface)](#monadlog-interface)
- [MonadProcess (interface)](#monadprocess-interface)
- [main (function)](#main-function)

---

# MonadApp (interface)

App capabilities

**Signature**

```ts
export interface MonadApp extends MonadFileSystem, MonadLog, MonadProcess {}
```

# MonadFileSystem (interface)

**Signature**

```ts
export interface MonadFileSystem {
  getFilenames: (pattern: string) => Task<Array<string>>
  readFile: (path: string) => TaskEither<string, string>
  writeFile: (path: string, content: string) => TaskEither<string, void>
  existsFile: (path: string) => Task<boolean>
  clean: (pattern: string) => Task<void>
}
```

# MonadLog (interface)

**Signature**

```ts
export interface MonadLog {
  log: (message: string) => Task<void>
}
```

# MonadProcess (interface)

**Signature**

```ts
export interface MonadProcess {
  exit: (code: 0 | 1) => Task<void>
}
```

# main (function)

**Signature**

```ts
export function main(M: MonadApp): Task<void> { ... }
```
