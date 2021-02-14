---
title: FileSystem.ts
nav_order: 5
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
- [utils](#utils)
  - [exists](#exists)
  - [readFile](#readfile)
  - [remove](#remove)
  - [search](#search)
  - [writeFile](#writefile)

---

# constructors

## File

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
  readonly writeFile: (path: string, content: string) => TE.TaskEither<string, void>
  readonly exists: (path: string) => TE.TaskEither<string, boolean>
  readonly remove: (pattern: string) => TE.TaskEither<string, void>
  readonly search: (pattern: string, exclude: ReadonlyArray<string>) => TE.TaskEither<string, ReadonlyArray<string>>
}
```

Added in v0.6.0

# utils

## exists

**Signature**

```ts
export declare const exists: (path: string) => TE.TaskEither<Error, boolean>
```

Added in v0.6.0

## readFile

Reads a file.

**Signature**

```ts
export declare const readFile: (path: string, encoding: string) => TE.TaskEither<Error, string>
```

Added in v0.6.0

## remove

Removes a file or directory based upon the specified pattern. The directory can have contents.
If the path does not exist, silently does nothing.

**Signature**

```ts
export declare const remove: (path: string, options: rimraf.Options) => TE.TaskEither<Error, void>
```

Added in v0.6.0

## search

Searches for files matching the specified glob pattern.

**Signature**

```ts
export declare const search: (pattern: string, options: glob.IOptions) => TE.TaskEither<Error, ReadonlyArray<string>>
```

Added in v0.6.0

## writeFile

Similar to `writeFile` (i.e. it overwrites), except that if the parent directory does not exist, it's created.

**Signature**

```ts
export declare const writeFile: (
  path: string,
  data: string,
  options: { readonly encoding?: string; readonly flag?: string; readonly mode?: number }
) => TE.TaskEither<Error, void>
```

Added in v0.6.0
