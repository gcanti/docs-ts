---
title: markdown.ts
nav_order: 4
parent: Modules
---

# markdown overview

markdown utilities

Added in v0.2.0

---

<h2 class="text-delta">Table of contents</h2>

- [hasOwnProperty (function)](#hasownproperty-function)
- [printExamples](#printexamples)
- [printModule](#printmodule)

---

# hasOwnProperty (function)

**Signature**

```ts
export function hasOwnProperty<K extends string>(k: string, r: Record<K, unknown>): k is K { ... }
```

Added in v2.0.0

# printExamples

**Signature**

```ts
export function printExamples(examples: Array<Example>): string { ... }
```

Added in v0.2.0

# printModule

**Signature**

```ts
export function printModule(module: Module, counter: number): string { ... }
```

Added in v0.2.0
