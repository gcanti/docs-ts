---
title: internal.ts
nav_order: 5
parent: Modules
---

## internal overview

Added in v0.8.1

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

Added in v0.8.1
