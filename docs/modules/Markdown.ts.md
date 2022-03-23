---
title: Markdown.ts
nav_order: 7
parent: Modules
---

## Markdown overview

Added in v0.6.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Bold](#bold)
  - [Fence](#fence)
  - [Header](#header)
  - [Newline](#newline)
  - [Paragraph](#paragraph)
  - [PlainText](#plaintext)
  - [PlainTexts](#plaintexts)
  - [Strikethrough](#strikethrough)
- [destructors](#destructors)
  - [fold](#fold)
- [instances](#instances)
  - [monoidMarkdown](#monoidmarkdown)
  - [semigroupMarkdown](#semigroupmarkdown)
  - [showMarkdown](#showmarkdown)
- [model](#model)
  - [Bold (interface)](#bold-interface)
  - [Fence (interface)](#fence-interface)
  - [Header (interface)](#header-interface)
  - [Markdown (type alias)](#markdown-type-alias)
  - [Newline (interface)](#newline-interface)
  - [Paragraph (interface)](#paragraph-interface)
  - [PlainText (interface)](#plaintext-interface)
  - [PlainTexts (interface)](#plaintexts-interface)
  - [Printable (type alias)](#printable-type-alias)
  - [Strikethrough (interface)](#strikethrough-interface)
- [printers](#printers)
  - [printClass](#printclass)
  - [printConstant](#printconstant)
  - [printExport](#printexport)
  - [printFunction](#printfunction)
  - [printInterface](#printinterface)
  - [printModule](#printmodule)
  - [printTypeAlias](#printtypealias)

---

# constructors

## Bold

**Signature**

```ts
export declare const Bold: (content: Markdown) => Markdown
```

Added in v0.6.0

## Fence

**Signature**

```ts
export declare const Fence: (language: string, content: Markdown) => Markdown
```

Added in v0.6.0

## Header

**Signature**

```ts
export declare const Header: (level: number, content: Markdown) => Markdown
```

Added in v0.6.0

## Newline

**Signature**

```ts
export declare const Newline: Markdown
```

Added in v0.6.0

## Paragraph

**Signature**

```ts
export declare const Paragraph: (content: Markdown) => Markdown
```

Added in v0.6.0

## PlainText

**Signature**

```ts
export declare const PlainText: (content: string) => Markdown
```

Added in v0.6.0

## PlainTexts

**Signature**

```ts
export declare const PlainTexts: (content: ReadonlyArray<Markdown>) => Markdown
```

Added in v0.6.0

## Strikethrough

**Signature**

```ts
export declare const Strikethrough: (content: Markdown) => Markdown
```

Added in v0.6.0

# destructors

## fold

**Signature**

```ts
export declare const fold: <R>(patterns: {
  readonly Bold: (content: Markdown) => R
  readonly Fence: (language: string, content: Markdown) => R
  readonly Header: (level: number, content: Markdown) => R
  readonly Newline: () => R
  readonly Paragraph: (content: Markdown) => R
  readonly PlainText: (content: string) => R
  readonly PlainTexts: (content: ReadonlyArray<Markdown>) => R
  readonly Strikethrough: (content: Markdown) => R
}) => (markdown: Markdown) => R
```

Added in v0.6.0

# instances

## monoidMarkdown

**Signature**

```ts
export declare const monoidMarkdown: M.Monoid<Markdown>
```

Added in v0.6.0

## semigroupMarkdown

**Signature**

```ts
export declare const semigroupMarkdown: Semigroup<Markdown>
```

Added in v0.6.0

## showMarkdown

**Signature**

```ts
export declare const showMarkdown: Show<Markdown>
```

Added in v0.6.0

# model

## Bold (interface)

**Signature**

```ts
export interface Bold {
  readonly _tag: 'Bold'
  readonly content: Markdown
}
```

Added in v0.6.0

## Fence (interface)

**Signature**

```ts
export interface Fence {
  readonly _tag: 'Fence'
  readonly language: string
  readonly content: Markdown
}
```

Added in v0.6.0

## Header (interface)

**Signature**

```ts
export interface Header {
  readonly _tag: 'Header'
  readonly level: number
  readonly content: Markdown
}
```

Added in v0.6.0

## Markdown (type alias)

**Signature**

```ts
export type Markdown = Bold | Fence | Header | Newline | Paragraph | PlainText | PlainTexts | Strikethrough
```

Added in v0.6.0

## Newline (interface)

**Signature**

```ts
export interface Newline {
  readonly _tag: 'Newline'
}
```

Added in v0.6.0

## Paragraph (interface)

**Signature**

```ts
export interface Paragraph {
  readonly _tag: 'Paragraph'
  readonly content: Markdown
}
```

Added in v0.6.0

## PlainText (interface)

**Signature**

```ts
export interface PlainText {
  readonly _tag: 'PlainText'
  readonly content: string
}
```

Added in v0.6.0

## PlainTexts (interface)

**Signature**

```ts
export interface PlainTexts {
  readonly _tag: 'PlainTexts'
  readonly content: ReadonlyArray<Markdown>
}
```

Added in v0.6.0

## Printable (type alias)

**Signature**

```ts
export type Printable = Class | Constant | Export | Function | Interface | TypeAlias
```

Added in v0.6.0

## Strikethrough (interface)

**Signature**

```ts
export interface Strikethrough {
  readonly _tag: 'Strikethrough'
  readonly content: Markdown
}
```

Added in v0.6.0

# printers

## printClass

**Signature**

```ts
export declare const printClass: (c: Class) => string
```

Added in v0.6.0

## printConstant

**Signature**

```ts
export declare const printConstant: (c: Constant) => string
```

Added in v0.6.0

## printExport

**Signature**

```ts
export declare const printExport: (e: Export) => string
```

Added in v0.6.0

## printFunction

**Signature**

```ts
export declare const printFunction: (f: Function) => string
```

Added in v0.6.0

## printInterface

**Signature**

```ts
export declare const printInterface: (i: Interface) => string
```

Added in v0.6.0

## printModule

**Signature**

```ts
export declare const printModule: (module: Module, order: number) => string
```

Added in v0.6.0

## printTypeAlias

**Signature**

```ts
export declare const printTypeAlias: (f: TypeAlias) => string
```

Added in v0.6.0
