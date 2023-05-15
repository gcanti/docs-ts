---
title: internal.ts
nav_order: 6
parent: Modules
---

## internal overview

Added in v0.9.0

---

<h2 class="text-delta">Table of contents</h2>

- [Config](#config)
  - [Config (interface)](#config-interface)

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
