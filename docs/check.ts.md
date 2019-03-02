---
title: check.ts
nav_order: 2
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [defaultOptions (constant)](#defaultoptions-constant)
- [check (function)](#check-function)
- [getProgram (function)](#getprogram-function)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

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
