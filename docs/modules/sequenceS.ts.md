---
title: sequenceS.ts
nav_order: 6
parent: Modules
---

# Overview

Internal helper

---

<h2 class="text-delta">Table of contents</h2>

- [sequenceS (function)](#sequences-function)

---

# sequenceS (function)

**Signature**

```ts
export function sequenceS<F extends URIS3>(
  F: Apply3<F>
): <R extends Record<string, Type3<F, any, any, any>>>(
  r: EnforceNonEmptyRecord<R>
) => Type3<
  F,
  { [K in keyof R]: R[K] extends Type3<F, infer U, any, any> ? U : never }[keyof R],
  { [K in keyof R]: R[K] extends Type3<F, any, infer L, any> ? L : never }[keyof R],
  { [K in keyof R]: R[K] extends Type3<F, any, any, infer A> ? A : never }
>
export function sequenceS<F extends URIS3, U, L>(
  F: Apply3C<F, U, L>
): <R extends Record<string, Type3<F, U, L, any>>>(
  r: EnforceNonEmptyRecord<R>
) => Type3<F, U, L, { [K in keyof R]: R[K] extends Type3<F, any, any, infer A> ? A : never }>
export function sequenceS<F extends URIS2>(
  F: Apply2<F>
): <R extends Record<string, Type2<F, any, any>>>(
  r: EnforceNonEmptyRecord<R>
) => Type2<
  F,
  { [K in keyof R]: R[K] extends Type2<F, infer L, any> ? L : never }[keyof R],
  { [K in keyof R]: R[K] extends Type2<F, any, infer A> ? A : never }
>
export function sequenceS<F extends URIS2, L>(
  F: Apply2C<F, L>
): <R extends Record<string, Type2<F, L, any>>>(
  r: EnforceNonEmptyRecord<R>
) => Type2<F, L, { [K in keyof R]: R[K] extends Type2<F, any, infer A> ? A : never }>
export function sequenceS<F extends URIS>(
  F: Apply1<F>
): <R extends Record<string, Type<F, any>>>(
  r: EnforceNonEmptyRecord<R>
) => Type<F, { [K in keyof R]: R[K] extends Type<F, infer A> ? A : never }>
export function sequenceS<F>(F: Apply<F>): (r: Record<string, HKT<F, any>>) => HKT<F, Record<string, any>>
export function sequenceS<F>(F: Apply<F>): (r: Record<string, HKT<F, any>>) => HKT<F, Record<string, any>> { ... }
```
