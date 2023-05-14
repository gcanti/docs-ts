import { flow } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import * as assert from 'assert'

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

const content = _.createPlainText('a')

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
        createDocumentable('hasOwnProperty', Option.none(), Option.some('1.0.0'), false, [], Option.none()),
        ['hasOwnProperty(): boolean']
      )
    ],
    [
      createMethod(createDocumentable('staticTest', Option.none(), Option.some('1.0.0'), false, [], Option.none()), [
        'static testStatic(): string;'
      ])
    ],
    [
      createProperty(
        createDocumentable('foo', Option.none(), Option.some('1.0.0'), false, [], Option.none()),
        'foo: string'
      )
    ]
  ),
  constant: createConstant(
    createDocumentable('test', Option.some('the test'), Option.some('1.0.0'), false, [], Option.some('constants')),
    'declare const test: string'
  ),
  export: createExport(
    createDocumentable('test', Option.none(), Option.some('1.0.0'), false, [], Option.none()),
    'export declare const test: typeof test'
  ),
  function: createFunction(
    createDocumentable('func', Option.some('a function'), Option.some('1.0.0'), true, ['example 1'], Option.none()),
    ['declare const func: (test: string) => string']
  ),
  interface: createInterface(
    createDocumentable('A', Option.none(), Option.some('1.0.0'), false, [], Option.none()),
    'export interface A extends Record<string, unknown> {}'
  ),
  typeAlias: createTypeAlias(
    createDocumentable('A', Option.none(), Option.some('1.0.0'), false, [], Option.none()),
    'export type A = number'
  )
}

describe.concurrent('Markdown', () => {
  describe.concurrent('constructors', () => {
    it('Bold', () => {
      assert.deepStrictEqual(_.createBold(content), {
        _tag: 'Bold',
        content
      })
    })

    it('Fence', () => {
      assert.deepStrictEqual(_.createFence('ts', content), {
        _tag: 'Fence',
        language: 'ts',
        content
      })
    })

    it('Header', () => {
      assert.deepStrictEqual(_.createHeader(1)(content), {
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
      assert.deepStrictEqual(_.createParagraph(content), {
        _tag: 'Paragraph',
        content
      })
    })

    it('PlainText', () => {
      assert.deepStrictEqual(_.createPlainText('a'), {
        _tag: 'PlainText',
        content: 'a'
      })
    })

    it('PlainTexts', () => {
      assert.deepStrictEqual(_.createPlainTexts([content]), {
        _tag: 'PlainTexts',
        content: [content]
      })
    })

    it('Strikethrough', () => {
      assert.deepStrictEqual(_.createStrikethrough(content), {
        _tag: 'Strikethrough',
        content
      })
    })
  })

  describe.concurrent('destructors', () => {
    it('match', () => {
      const match: (markdown: _.Markdown) => string = _.match({
        Bold: (c) => `Bold(${match(c)})`,
        Fence: (l, c) => `Fence(${l}, ${match(c)})`,
        Header: (l, c) => `Header(${l}, ${match(c)})`,
        Newline: () => `Newline`,
        Paragraph: (c) => `Paragraph(${match(c)})`,
        PlainText: (s) => s,
        PlainTexts: (cs) => `PlainTexts(${show(cs)})`,
        Strikethrough: (c) => `Strikethrough(${match(c)})`
      })
      const show = (ms: ReadonlyArray<_.Markdown>): string => '[' + ms.map(match).join(', ') + ']'

      assert.strictEqual(match(_.createBold(content)), 'Bold(a)')
      assert.strictEqual(match(_.createFence('ts', content)), 'Fence(ts, a)')
      assert.strictEqual(match(_.createHeader(1)(content)), 'Header(1, a)')
      assert.strictEqual(match(_.Newline), 'Newline')
      assert.strictEqual(match(_.createParagraph(content)), 'Paragraph(a)')
      assert.strictEqual(match(_.createPlainText('a')), 'a')
      assert.strictEqual(match(_.createPlainTexts([content])), 'PlainTexts([a])')
      assert.strictEqual(match(_.createStrikethrough(content)), 'Strikethrough(a)')
    })
  })

  describe.concurrent('instances', () => {
    it('monoidMarkdown', () => {
      assert.deepStrictEqual(_.monoidMarkdown.combine(_.createBold(content), _.createStrikethrough(content)), {
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

      assert.deepStrictEqual(_.monoidMarkdown.combine(_.createBold(content), _.createStrikethrough(content)), {
        _tag: 'PlainTexts',
        content: [
          { _tag: 'Bold', content: { _tag: 'PlainText', content: 'a' } },
          { _tag: 'Strikethrough', content: { _tag: 'PlainText', content: 'a' } }
        ]
      })
    })
  })

  describe.concurrent('printers', () => {
    const print = flow(_.fromPrintable, _.render, _.prettify)

    it('fromClass', () => {
      assert.strictEqual(
        print(testCases.class),
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
        print(testCases.constant),
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
        print(testCases.export),
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
        print(testCases.function),
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
        print(testCases.interface),
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
        print(testCases.typeAlias),
        `## A (type alias)

**Signature**

\`\`\`ts
export type A = number
\`\`\`

Added in v1.0.0
`
      )

      assert.strictEqual(
        print({ ...testCases.typeAlias, since: Option.none() }),
        `## A (type alias)

**Signature**

\`\`\`ts
export type A = number
\`\`\`
`
      )
    })

    it('printModule', () => {
      const documentation = createDocumentable('tests', Option.none(), Option.some('1.0.0'), false, [], Option.none())
      assert.strictEqual(
        _.printModule(
          createModule(
            documentation,
            ['src', 'tests.ts'],
            [testCases.class],
            [testCases.interface],
            [testCases.function],
            [testCases.typeAlias],
            [testCases.constant],
            [testCases.export]
          ),
          1
        ),
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
  - [~~func~~](#func)
  - [test](#test-1)

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

## test

**Signature**

\`\`\`ts
export declare const test: typeof test
\`\`\`

Added in v1.0.0
`
      )

      const empty = createModule(documentation, ['src', 'tests.ts'], [], [], [], [], [], [])

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
        [],
        [],
        [],
        [],
        []
      )

      assert.throws(() => {
        _.printModule(throws, 1)
      })
    })
  })
})
