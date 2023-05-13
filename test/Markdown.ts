import * as Option from '@effect/data/Option'
import * as assert from 'assert'
import * as RA from 'fp-ts/ReadonlyArray'

import * as _ from '../src/Markdown'
import {
  createClass,
  createConstant,
  createDocumentable,
  createExport,
  createFunction,
  createInterface,
  createMethod,
  createModule,
  createProperty,
  createTypeAlias
} from '../src/Module'

const content = _.PlainText('a')

const testCases = {
  class: createClass(
    createDocumentable(
      'A',
      Option.some('a class'),
      Option.some('1.0.0'),
      false,
      ['example 1'],
      Option.some('category')
    ),
    'declare class A { constructor() }',
    [
      createMethod(
        createDocumentable('hasOwnProperty', Option.none(), Option.some('1.0.0'), false, RA.empty, Option.none()),
        ['hasOwnProperty(): boolean']
      )
    ],
    [
      createMethod(
        createDocumentable('staticTest', Option.none(), Option.some('1.0.0'), false, RA.empty, Option.none()),
        ['static testStatic(): string;']
      )
    ],
    [
      createProperty(
        createDocumentable('foo', Option.none(), Option.some('1.0.0'), false, RA.empty, Option.none()),
        'foo: string'
      )
    ]
  ),
  constant: createConstant(
    createDocumentable(
      'test',
      Option.some('the test'),
      Option.some('1.0.0'),
      false,
      RA.empty,
      Option.some('constants')
    ),
    'declare const test: string'
  ),
  export: createExport(
    createDocumentable('test', Option.none(), Option.some('1.0.0'), false, RA.empty, Option.none()),
    'export declare const test: typeof test'
  ),
  function: createFunction(
    createDocumentable('func', Option.some('a function'), Option.some('1.0.0'), true, ['example 1'], Option.none()),
    ['declare const func: (test: string) => string']
  ),
  interface: createInterface(
    createDocumentable('A', Option.none(), Option.some('1.0.0'), false, RA.empty, Option.none()),
    'export interface A extends Record<string, unknown> {}'
  ),
  typeAlias: createTypeAlias(
    createDocumentable('A', Option.none(), Option.some('1.0.0'), false, RA.empty, Option.none()),
    'export type A = number'
  )
}

describe.concurrent('Markdown', () => {
  describe.concurrent('constructors', () => {
    it('Bold', () => {
      assert.deepStrictEqual(_.Bold(content), {
        _tag: 'Bold',
        content
      })
    })

    it('Fence', () => {
      assert.deepStrictEqual(_.Fence('ts', content), {
        _tag: 'Fence',
        language: 'ts',
        content
      })
    })

    it('Header', () => {
      assert.deepStrictEqual(_.Header(1, content), {
        _tag: 'Header',
        level: 1,
        content
      })
    })

    it('Newline', () => {
      assert.deepStrictEqual(_.Newline, {
        _tag: 'Newline'
      })
    })

    it('Paragraph', () => {
      assert.deepStrictEqual(_.Paragraph(content), {
        _tag: 'Paragraph',
        content
      })
    })

    it('PlainText', () => {
      assert.deepStrictEqual(_.PlainText('a'), {
        _tag: 'PlainText',
        content: 'a'
      })
    })

    it('PlainTexts', () => {
      assert.deepStrictEqual(_.PlainTexts([content]), {
        _tag: 'PlainTexts',
        content: [content]
      })
    })

    it('Strikethrough', () => {
      assert.deepStrictEqual(_.Strikethrough(content), {
        _tag: 'Strikethrough',
        content
      })
    })
  })

  describe.concurrent('destructors', () => {
    it('fold', () => {
      const fold: (markdown: _.Markdown) => string = _.fold({
        Bold: (c) => `Bold(${fold(c)})`,
        Fence: (l, c) => `Fence(${l}, ${fold(c)})`,
        Header: (l, c) => `Header(${l}, ${fold(c)})`,
        Newline: () => `Newline`,
        Paragraph: (c) => `Paragraph(${fold(c)})`,
        PlainText: (s) => s,
        PlainTexts: (cs) => `PlainTexts(${RA.getShow({ show: fold }).show(cs)})`,
        Strikethrough: (c) => `Strikethrough(${fold(c)})`
      })

      assert.strictEqual(fold(_.Bold(content)), 'Bold(a)')
      assert.strictEqual(fold(_.Fence('ts', content)), 'Fence(ts, a)')
      assert.strictEqual(fold(_.Header(1, content)), 'Header(1, a)')
      assert.strictEqual(fold(_.Newline), 'Newline')
      assert.strictEqual(fold(_.Paragraph(content)), 'Paragraph(a)')
      assert.strictEqual(fold(_.PlainText('a')), 'a')
      assert.strictEqual(fold(_.PlainTexts([content])), 'PlainTexts([a])')
      assert.strictEqual(fold(_.Strikethrough(content)), 'Strikethrough(a)')
      assert.throws(() => {
        // @ts-expect-error - valid Markdown instance required
        fold({})
      })
    })
  })

  describe.concurrent('instances', () => {
    it('monoidMarkdown', () => {
      assert.deepStrictEqual(_.monoidMarkdown.combine(_.Bold(content), _.Strikethrough(content)), {
        _tag: 'PlainTexts',
        content: [
          { _tag: 'Bold', content: { _tag: 'PlainText', content: 'a' } },
          { _tag: 'Strikethrough', content: { _tag: 'PlainText', content: 'a' } }
        ]
      })
      assert.deepStrictEqual(_.monoidMarkdown.empty, {
        _tag: 'PlainText',
        content: ''
      })

      assert.deepStrictEqual(_.monoidMarkdown.combine(_.Bold(content), _.Strikethrough(content)), {
        _tag: 'PlainTexts',
        content: [
          { _tag: 'Bold', content: { _tag: 'PlainText', content: 'a' } },
          { _tag: 'Strikethrough', content: { _tag: 'PlainText', content: 'a' } }
        ]
      })
    })

    it('showMarkdown', () => {
      // Prettier will add a trailing newline to the document so `a` becomes `\n`
      // and strips extra trailing newlines so `\n\n` becomes `\n`
      assert.strictEqual(_.showMarkdown(_.Bold(content)), '**a**\n')
      assert.strictEqual(_.showMarkdown(_.Header(1, content)), '# a\n')
      assert.strictEqual(_.showMarkdown(_.Header(2, content)), '## a\n')
      assert.strictEqual(_.showMarkdown(_.Header(3, content)), '### a\n')
      assert.strictEqual(_.showMarkdown(_.Fence('ts', content)), '```ts\na\n```\n')
      assert.strictEqual(_.showMarkdown(_.monoidMarkdown.combine(content, _.Newline)), 'a\n')
      assert.strictEqual(_.showMarkdown(_.Paragraph(content)), 'a\n')
      assert.strictEqual(_.showMarkdown(_.PlainText('a')), 'a\n')
      assert.strictEqual(_.showMarkdown(_.PlainTexts([content, _.Newline, content])), 'a\na\n')
      assert.strictEqual(_.showMarkdown(_.Strikethrough(content)), '~~a~~\n')
      assert.strictEqual(
        _.showMarkdown(
          _.PlainTexts([
            _.PlainText(''),
            _.Bold(content),
            _.Header(1, content),
            _.Fence('ts', content),
            _.Newline,
            _.Paragraph(content),
            _.PlainText('a'),
            _.PlainTexts([content]),
            _.Strikethrough(content)
          ])
        ),
        `**a**

# a

\`\`\`ts
a
\`\`\`

a

aa~~a~~
`
      )
    })
  })

  describe.concurrent('printers', () => {
    it('printClass', () => {
      assert.strictEqual(
        _.printClass(testCases.class),
        `## A (class)

a class

**Signature**

\`\`\`ts
declare class A {
  constructor()
}
\`\`\`

**Example**

\`\`\`ts
example 1
\`\`\`

Added in v1.0.0

### staticTest (static method)

**Signature**

\`\`\`ts
static testStatic(): string;
\`\`\`

Added in v1.0.0

### hasOwnProperty (function) (method)

**Signature**

\`\`\`ts
hasOwnProperty(): boolean
\`\`\`

Added in v1.0.0

### foo (property)

**Signature**

\`\`\`ts
foo: string
\`\`\`

Added in v1.0.0
`
      )
    })

    it('printConstant', () => {
      assert.strictEqual(
        _.printConstant(testCases.constant),
        `## test

the test

**Signature**

\`\`\`ts
declare const test: string
\`\`\`

Added in v1.0.0
`
      )
    })

    it('printExport', () => {
      assert.strictEqual(
        _.printExport(testCases.export),
        `## test

**Signature**

\`\`\`ts
export declare const test: typeof test
\`\`\`

Added in v1.0.0
`
      )
    })

    it('printFunction', () => {
      assert.strictEqual(
        _.printFunction(testCases.function),
        `## ~~func~~

a function

**Signature**

\`\`\`ts
declare const func: (test: string) => string
\`\`\`

**Example**

\`\`\`ts
example 1
\`\`\`

Added in v1.0.0
`
      )
    })

    it('printInterface', () => {
      assert.strictEqual(
        _.printInterface(testCases.interface),
        `## A (interface)

**Signature**

\`\`\`ts
export interface A extends Record<string, unknown> {}
\`\`\`

Added in v1.0.0
`
      )
    })

    it('printTypeAlias', () => {
      assert.strictEqual(
        _.printTypeAlias(testCases.typeAlias),
        `## A (type alias)

**Signature**

\`\`\`ts
export type A = number
\`\`\`

Added in v1.0.0
`
      )

      assert.strictEqual(
        _.printTypeAlias({ ...testCases.typeAlias, since: Option.none() }),
        `## A (type alias)

**Signature**

\`\`\`ts
export type A = number
\`\`\`
`
      )
    })

    it('printModule', () => {
      const documentation = createDocumentable(
        'tests',
        Option.none(),
        Option.some('1.0.0'),
        false,
        RA.empty,
        Option.none()
      )
      const m = createModule(
        documentation,
        ['src', 'tests.ts'],
        [testCases.class],
        [testCases.interface],
        [testCases.function],
        [testCases.typeAlias],
        [testCases.constant],
        [testCases.export]
      )

      assert.strictEqual(
        _.printModule(m, 1),
        `---
title: tests.ts
nav_order: 1
parent: Modules
---

## tests overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [category](#category)
  - [A (class)](#a-class)
    - [staticTest (static method)](#statictest-static-method)
    - [hasOwnProperty (function) (method)](#hasownproperty-function-method)
    - [foo (property)](#foo-property)
- [constants](#constants)
  - [test](#test)
- [utils](#utils)
  - [A (interface)](#a-interface)
  - [A (type alias)](#a-type-alias)
  - [test](#test-1)
  - [~~func~~](#func)

---

# category

## A (class)

a class

**Signature**

\`\`\`ts
declare class A {
  constructor()
}
\`\`\`

**Example**

\`\`\`ts
example 1
\`\`\`

Added in v1.0.0

### staticTest (static method)

**Signature**

\`\`\`ts
static testStatic(): string;
\`\`\`

Added in v1.0.0

### hasOwnProperty (function) (method)

**Signature**

\`\`\`ts
hasOwnProperty(): boolean
\`\`\`

Added in v1.0.0

### foo (property)

**Signature**

\`\`\`ts
foo: string
\`\`\`

Added in v1.0.0

# constants

## test

the test

**Signature**

\`\`\`ts
declare const test: string
\`\`\`

Added in v1.0.0

# utils

## A (interface)

**Signature**

\`\`\`ts
export interface A extends Record<string, unknown> {}
\`\`\`

Added in v1.0.0

## A (type alias)

**Signature**

\`\`\`ts
export type A = number
\`\`\`

Added in v1.0.0

## test

**Signature**

\`\`\`ts
export declare const test: typeof test
\`\`\`

Added in v1.0.0

## ~~func~~

a function

**Signature**

\`\`\`ts
declare const func: (test: string) => string
\`\`\`

**Example**

\`\`\`ts
example 1
\`\`\`

Added in v1.0.0
`
      )

      const empty = createModule(
        documentation,
        ['src', 'tests.ts'],
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty
      )

      assert.strictEqual(
        _.printModule(empty, 1),
        `---
title: tests.ts
nav_order: 1
parent: Modules
---

## tests overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

---
`
      )

      const throws = createModule(
        documentation,
        ['src', 'tests.ts'],
        // @ts-expect-error - valid Markdown instance required
        [{ category: 'invalid markdown' }],
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty
      )

      assert.throws(() => {
        _.printModule(throws, 1)
      })
    })
  })
})
