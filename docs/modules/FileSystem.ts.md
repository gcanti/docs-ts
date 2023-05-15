---
title: FileSystem.ts
nav_order: 5
parent: Modules
---

## FileSystem overview

Added in v0.9.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [createFile](#createfile)
- [model](#model)
  - [File (interface)](#file-interface)

---

# constructors

## createFile

By default files are readonly (`overwrite = false`).

**Signature**

```ts
export declare const createFile: (path: string, content: string, overwrite?: boolean) => File
```

Added in v0.9.0

# model

## File (interface)

Represents a file which can be optionally overwriteable.

**Signature**

```ts
export interface File {
  readonly path: string
  readonly content: string
  readonly overwrite: boolean
}
```

Added in v0.9.0
