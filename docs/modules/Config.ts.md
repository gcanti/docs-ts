---
title: Config.ts
nav_order: 2
parent: Modules
---

## Config overview

Added in v0.6.0

---

<h2 class="text-delta">Table of contents</h2>

- [model](#model)
  - [Config (interface)](#config-interface)
- [utils](#utils)
  - [decode](#decode)

---

# model

## Config (interface)

**Signature**

```ts
export interface Config {
  readonly projectName: string
  readonly projectHomepage: string
  readonly srcDir: string
  readonly outDir: string
  readonly theme: string
  readonly enableSearch: boolean
  readonly enforceDescriptions: boolean
  readonly enforceExamples: boolean
  readonly enforceVersion: boolean
  readonly exclude: ReadonlyArray<string>
  readonly parseCompilerOptions: Record<string, unknown>
  readonly examplesCompilerOptions: Record<string, unknown>
}
```

Added in v0.6.4

# utils

## decode

**Signature**

```ts
export declare const decode: (input: unknown) => E.Either<string, Partial<Config>>
```

Added in v0.6.4
