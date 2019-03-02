---
title: check.ts
nav_order: 2
---

**Table of contents**

- [defaultOptions (constant)](#defaultoptions-constant)
- [check (function)](#check-function)
- [getProgram (function)](#getprogram-function)# defaultOptions (constant)

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
