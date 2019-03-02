---
title: core.ts
nav_order: 3
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [MonadApp](#monadapp)
- [MonadFileSystem](#monadfilesystem)
- [MonadLog](#monadlog)
- [MonadProject](#monadproject)
- [main](#main)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# MonadApp

App capabilities

**Signature** (interface)

```ts
export interface MonadApp extends MonadFileSystem, MonadProject, MonadLog {}
```

# MonadFileSystem

**Signature** (interface)

```ts
export interface MonadFileSystem {
  readFile: (path: string) => IO<string>
  writeFile: (path: string, content: string) => IO<void>
  exists: (path: string) => IO<boolean>
  clean: (patterm: string) => IO<void>
}
```

# MonadLog

**Signature** (interface)

```ts
export interface MonadLog {
  log: (message: string) => IO<void>
}
```

# MonadProject

**Signature** (interface)

```ts
export interface MonadProject {
  readOptions: IO<ts.CompilerOptions>
  readProjectName: IO<string>
  readPaths: IO<Array<string>>
}
```

# main

**Signature** (function)

```ts
export function main(M: MonadApp): IO<void> { ... }
```
