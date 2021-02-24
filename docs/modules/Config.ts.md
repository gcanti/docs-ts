---
title: Config.ts
nav_order: 2
parent: Modules
---

## Config overview

Added in v0.6.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [updateEnforceDescriptions](#updateenforcedescriptions)
  - [updateEnforceExamples](#updateenforceexamples)
  - [updateEnforceVersion](#updateenforceversion)
  - [updateExclusions](#updateexclusions)
  - [updateOutDir](#updateoutdir)
  - [updateProjectHomepage](#updateprojecthomepage)
  - [updateSearchEnabled](#updatesearchenabled)
  - [updateSourceDir](#updatesourcedir)
  - [updateTheme](#updatetheme)
- [constructors](#constructors)
  - [build](#build)
- [destructors](#destructors)
  - [resolveSettings](#resolvesettings)
- [model](#model)
  - [Config (interface)](#config-interface)
  - [ConfigBuilder (interface)](#configbuilder-interface)
  - [Settings (interface)](#settings-interface)
- [utils](#utils)
  - [decode](#decode)

---

# combinators

## updateEnforceDescriptions

**Signature**

```ts
export declare const updateEnforceDescriptions: (enforceDescriptions: boolean) => (wa: ConfigBuilder) => ConfigBuilder
```

Added in v0.6.0

## updateEnforceExamples

**Signature**

```ts
export declare const updateEnforceExamples: (enforceExamples: boolean) => (wa: ConfigBuilder) => ConfigBuilder
```

Added in v0.6.0

## updateEnforceVersion

**Signature**

```ts
export declare const updateEnforceVersion: (enforceVersion: boolean) => (wa: ConfigBuilder) => ConfigBuilder
```

Added in v0.6.0

## updateExclusions

**Signature**

```ts
export declare const updateExclusions: (exclude: ReadonlyArray<string>) => (wa: ConfigBuilder) => ConfigBuilder
```

Added in v0.6.0

## updateOutDir

**Signature**

```ts
export declare const updateOutDir: (outDir: string) => (wa: ConfigBuilder) => ConfigBuilder
```

Added in v0.6.0

## updateProjectHomepage

**Signature**

```ts
export declare const updateProjectHomepage: (projectHomepage: string) => (wa: ConfigBuilder) => ConfigBuilder
```

Added in v0.6.4

## updateSearchEnabled

**Signature**

```ts
export declare const updateSearchEnabled: (enableSearch: boolean) => (wa: ConfigBuilder) => ConfigBuilder
```

Added in v0.6.0

## updateSourceDir

**Signature**

```ts
export declare const updateSourceDir: (srcDir: string) => (wa: ConfigBuilder) => ConfigBuilder
```

Added in v0.6.0

## updateTheme

**Signature**

```ts
export declare const updateTheme: (theme: string) => (wa: ConfigBuilder) => ConfigBuilder
```

Added in v0.6.0

# constructors

## build

**Signature**

```ts
export declare const build: (projectName: string, projectHomepage: string) => ConfigBuilder
```

Added in v0.6.4

# destructors

## resolveSettings

**Signature**

```ts
export declare const resolveSettings: (builder: ConfigBuilder) => Settings
```

Added in v0.6.0

# model

## Config (interface)

**Signature**

```ts
export interface Config {
  readonly projectHomepage: string
  readonly srcDir: string
  readonly outDir: string
  readonly theme: string
  readonly enableSearch: boolean
  readonly enforceDescriptions: boolean
  readonly enforceExamples: boolean
  readonly enforceVersion: boolean
  readonly exclude: ReadonlyArray<string>
}
```

Added in v0.6.4

## ConfigBuilder (interface)

**Signature**

```ts
export interface ConfigBuilder extends T.Traced<Config, Settings> {}
```

Added in v0.6.0

## Settings (interface)

**Signature**

```ts
export interface Settings {
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
}
```

Added in v0.6.0

# utils

## decode

**Signature**

```ts
export declare const decode: (input: unknown) => TE.TaskEither<string, Partial<Config>>
```

Added in v0.6.0
