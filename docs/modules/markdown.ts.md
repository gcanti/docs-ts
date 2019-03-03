---
title: markdown.ts
nav_order: 5
parent: Modules
---

# Overview

markdown utilities

<h2 class="text-delta">Table of contents</h2>

- [parseLink (function)](#parselink-function)
- [printHeader (function)](#printheader-function)
- [printModule (function)](#printmodule-function)

# parseLink (function)

**Signature**

```ts
export function parseLink(s: string): Validation<Array<string>, RegExpMatchArray> { ... }
```

# printHeader (function)

**Signature**

```ts
export function printHeader(title: string, order: number): string { ... }
```

# printModule (function)

**Signature**

```ts
export function printModule(module: Module, counter: number): string { ... }
```
