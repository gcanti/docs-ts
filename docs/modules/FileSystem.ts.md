---
title: FileSystem.ts
nav_order: 3
parent: Modules
---

## FileSystem overview

Added in v0.6.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [File](#file)
- [instances](#instances)
  - [FileSystem](#filesystem)
- [model](#model)
  - [File (interface)](#file-interface)
  - [FileSystem (interface)](#filesystem-interface)

---

# constructors

## File

By default files are readonly (`overwrite = false`).

**Signature**

```ts
export declare const File: (path: string, content: string, overwrite?: boolean) => File
```

Added in v0.6.0

# instances

## FileSystem

**Signature**

```ts
export declare const FileSystem: FileSystem
```

Added in v0.6.0

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

Added in v0.6.0

## FileSystem (interface)

Represents operations that can be performed on a file system.

**Signature**

```ts
export interface FileSystem {
  readonly readFile: (path: string) => TE.TaskEither<string, string>
  /**
   * If the parent directory does not exist, it's created.
   */
  readonly writeFile: (path: string, content: string) => TE.TaskEither<string, void>
  readonly exists: (path: string) => TE.TaskEither<string, boolean>
  /**
   * Removes a file or directory based upon the specified pattern. The directory can have contents.
   * If the path does not exist, silently does nothing.
   */
  readonly remove: (pattern: string) => TE.TaskEither<string, void>
  /**
   * Searches for files matching the specified glob pattern.
   */
  readonly search: (pattern: string, exclude: ReadonlyArray<string>) => TE.TaskEither<string, ReadonlyArray<string>>
}
```

Added in v0.6.0
