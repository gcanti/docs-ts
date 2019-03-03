---
title: check.ts
nav_order: 2
parent: Modules
---

# Overview

examples type-checking

<h2 class="text-delta">Table of contents</h2>

- [defaultOptions (constant)](#defaultoptions-constant)
- [check (function)](#check-function)
- [getProgram (function)](#getprogram-function)

# defaultOptions (constant)

**Signature**

```ts
export const defaultOptions: ts.CompilerOptions = ...
```

# check (function)

**Signature**

```ts
export function check(sources: Record<string, string>, options: ts.CompilerOptions): Array<string> { ... }
```

# getProgram (function)

**Signature**

```ts
export function getProgram(source: Record<string, string>, options: ts.CompilerOptions): ts.Program { ... }
```
