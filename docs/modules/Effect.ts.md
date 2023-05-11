---
title: Effect.ts
nav_order: 4
parent: Modules
---

## Effect overview

Added in v0.8.1

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Config (interface)](#config-interface)
  - [ConfigSchema](#configschema)
  - [readFile](#readfile)
  - [toTaskEither](#totaskeither)

---

# utils

## Config (interface)

Represents the content of the configuration file `docs-ts.json`

**Signature**

```ts
export interface Config extends Schema.To<typeof ConfigSchema> {}
```

Added in v0.8.1

## ConfigSchema

Represents the content of the configuration file `docs-ts.json`

**Signature**

```ts
export declare const ConfigSchema: Schema.Schema<
  {
    readonly projectName: string
    readonly projectHomepage: string
    readonly srcDir: string
    readonly outDir: string
    readonly theme: string
    readonly enableSearch: boolean
    readonly enforceDescriptions: boolean
    readonly enforceExamples: boolean
    readonly enforceVersion: boolean
    readonly exclude: readonly string[]
    readonly parseCompilerOptions: { readonly [x: string]: unknown }
    readonly examplesCompilerOptions: { readonly [x: string]: unknown }
  },
  {
    readonly projectName: string
    readonly projectHomepage: string
    readonly srcDir: string
    readonly outDir: string
    readonly theme: string
    readonly enableSearch: boolean
    readonly enforceDescriptions: boolean
    readonly enforceExamples: boolean
    readonly enforceVersion: boolean
    readonly exclude: readonly string[]
    readonly parseCompilerOptions: { readonly [x: string]: unknown }
    readonly examplesCompilerOptions: { readonly [x: string]: unknown }
  }
>
```

Added in v0.8.1

## readFile

**Signature**

```ts
export declare const readFile: (path: string) => Effect.Effect<never, Error, string>
```

Added in v0.8.1

## toTaskEither

**Signature**

```ts
export declare const toTaskEither: <E, A>(eff: Effect.Effect<never, E, A>) => TaskEither.TaskEither<E, A>
```

Added in v0.8.1
