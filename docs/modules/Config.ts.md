---
title: Config.ts
nav_order: 2
parent: Modules
---

## Config overview

Added in v0.9.0

---

<h2 class="text-delta">Table of contents</h2>

- [Config](#config)
  - [Config (interface)](#config-interface)
- [utils](#utils)
  - [getConfig](#getconfig)

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

# utils

## getConfig

**Signature**

```ts
export declare const getConfig: Effect.Effect<never, Error, Service.Config>
```

Added in v0.9.0
