---
title: check.ts
nav_order: 1
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Failure](#failure)
- [defaultOptions](#defaultoptions)
- [check](#check)
- [getProgram](#getprogram)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Failure

**Signature** (interface)

```ts
export interface Failure {
  source: string
  message: string
}
```

# defaultOptions

**Signature** (constant)

```ts
export const defaultOptions: ts.CompilerOptions = ...
```

# check

**Signature** (function)

```ts
export function check(sources: Record<string, string>, options: ts.CompilerOptions): Array<Failure> { ... }
```

# getProgram

**Signature** (function)

```ts
export function getProgram(source: Record<string, string>, options: ts.CompilerOptions): ts.Program { ... }
```
