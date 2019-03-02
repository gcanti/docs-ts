---
title: core.ts
nav_order: 3
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [MonadApp (interface)](#monadapp-interface)
- [MonadFileSystem (interface)](#monadfilesystem-interface)
- [MonadLog (interface)](#monadlog-interface)
- [MonadProject (interface)](#monadproject-interface)
- [main (function)](#main-function)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# MonadApp (interface)

App capabilities

**Signature**

```ts
export interface MonadApp extends MonadFileSystem, MonadProject, MonadLog {}
```

# MonadFileSystem (interface)

**Signature**

```ts
export interface MonadFileSystem {
  readFile: (path: string) => IO<string>
  writeFile: (path: string, content: string) => IO<void>
  exists: (path: string) => IO<boolean>
  clean: (patterm: string) => IO<void>
}
```

# MonadLog (interface)

**Signature**

```ts
export interface MonadLog {
  log: (message: string) => IO<void>
}
```

# MonadProject (interface)

**Signature**

```ts
export interface MonadProject {
  readOptions: IO<ts.CompilerOptions>
  readProjectName: IO<string>
  readPaths: IO<Array<string>>
}
```

# main (function)

**Signature**

```ts
export function main(M: MonadApp): IO<void> { ... }
```
