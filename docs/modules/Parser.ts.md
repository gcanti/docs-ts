---
title: Parser.ts
nav_order: 10
parent: Modules
---

## Parser overview

Added in v0.9.0

---

<h2 class="text-delta">Table of contents</h2>

- [parsers](#parsers)
  - [parseClasses](#parseclasses)
  - [parseConstants](#parseconstants)
  - [parseExports](#parseexports)
  - [parseFiles](#parsefiles)
  - [parseFunctions](#parsefunctions)
  - [parseInterfaces](#parseinterfaces)
  - [parseModule](#parsemodule)
  - [parseTypeAliases](#parsetypealiases)

---

# parsers

## parseClasses

**Signature**

```ts
export declare const parseClasses: Effect.Effect<Service.Config | Service.Source, string[], Domain.Class[]>
```

Added in v0.9.0

## parseConstants

**Signature**

```ts
export declare const parseConstants: Effect.Effect<Service.Config | Service.Source, string[], Domain.Constant[]>
```

Added in v0.9.0

## parseExports

**Signature**

```ts
export declare const parseExports: Effect.Effect<Service.Config | Service.Source, string[], Domain.Export[]>
```

Added in v0.9.0

## parseFiles

**Signature**

```ts
export declare const parseFiles: (
  files: ReadonlyArray<FileSystem.File>
) => Effect.Effect<Service.Config, string[][], Domain.Module[]>
```

Added in v0.9.0

## parseFunctions

**Signature**

```ts
export declare const parseFunctions: Effect.Effect<Service.Config | Service.Source, string[], Domain.Function[]>
```

Added in v0.9.0

## parseInterfaces

**Signature**

```ts
export declare const parseInterfaces: Effect.Effect<Service.Config | Service.Source, string[], Domain.Interface[]>
```

Added in v0.9.0

## parseModule

**Signature**

```ts
export declare const parseModule: Effect.Effect<Service.Config | Service.Source, string[], Domain.Module>
```

Added in v0.9.0

## parseTypeAliases

**Signature**

```ts
export declare const parseTypeAliases: Effect.Effect<Service.Config | Service.Source, string[], Domain.TypeAlias[]>
```

Added in v0.9.0
