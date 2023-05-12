---
title: Core.ts
nav_order: 2
parent: Modules
---

## Core overview

Added in v0.9.0

---

<h2 class="text-delta">Table of contents</h2>

- [main](#main)
  - [main](#main-1)
- [service](#service)
  - [Config](#config)
  - [Config (interface)](#config-interface)

---

# main

## main

**Signature**

```ts
export declare const main: Effect.Effect<never, Error, void>
```

Added in v0.9.0

# service

## Config

**Signature**

```ts
export declare const Config: Context.Tag<Config, Config>
```

Added in v0.9.0

## Config (interface)

**Signature**

```ts
export interface Config {
  readonly config: _.Config
}
```

Added in v0.9.0
