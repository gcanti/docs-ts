---
title: index.ts
nav_order: 2
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [checkExamples](#checkexamples)
- [getExamples](#getexamples)
- [main](#main)
- [mangleExamples](#mangleexamples)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# checkExamples

**Signature** (function)

```ts
export function checkExamples(
  examples: Record<string, string>,
  options: ts.CompilerOptions
): Validation<Array<string>, void> { ... }
```

# getExamples

**Signature** (function)

```ts
export function getExamples(nodes: Array<parser.Node>): Record<string, string> { ... }
```

# main

**Signature** (function)

```ts
export function main(): IO<void> { ... }
```

# mangleExamples

**Signature** (function)

```ts
export function mangleExamples(examples: Record<string, string>, projectName: string): Record<string, string> { ... }
```
