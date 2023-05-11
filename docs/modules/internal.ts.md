---
title: internal.ts
nav_order: 4
parent: Modules
---

## internal overview

Added in v0.9.0

---

<h2 class="text-delta">Table of contents</h2>

- [Config](#config)
  - [Config (interface)](#config-interface)
- [constructors](#constructors)
  - [createFile](#createfile)
- [model](#model)
  - [File (interface)](#file-interface)

---

# Config

## Config (interface)

**Signature**

```ts
export interface Config extends Schema.To<typeof ConfigSchema> {
  readonly projectName: string
}
```

Added in v0.9.0

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
