import * as assert from 'assert'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'

import * as _ from '../src/Module'

const documentable = (name: string) => _.Documentable(name, O.none, O.some('1.0.0'), false, RA.empty, O.none)

describe.concurrent('Module', () => {
  describe.concurrent('constructors', () => {
    it('Documentable', () => {
      assert.deepStrictEqual(documentable('A'), {
        name: 'A',
        description: O.none,
        since: O.some('1.0.0'),
        deprecated: false,
        examples: RA.empty,
        category: O.none
      })
    })

    it('Module', () => {
      const m = _.Module(
        documentable('test'),
        ['src', 'index.ts'],
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty
      )

      assert.deepStrictEqual(m, {
        ...documentable('test'),
        path: ['src', 'index.ts'],
        classes: RA.empty,
        interfaces: RA.empty,
        functions: RA.empty,
        typeAliases: RA.empty,
        constants: RA.empty,
        exports: RA.empty
      })
    })

    it('Class', () => {
      const c = _.Class(documentable('A'), 'declare class A { constructor() }', RA.empty, RA.empty, RA.empty)

      assert.deepStrictEqual(c, {
        _tag: 'Class',
        ...documentable('A'),
        signature: 'declare class A { constructor() }',
        methods: RA.empty,
        staticMethods: RA.empty,
        properties: RA.empty
      })
    })

    it('Constant', () => {
      const c = _.Constant(documentable('foo'), 'declare const foo: string')

      assert.deepStrictEqual(c, {
        _tag: 'Constant',
        ...documentable('foo'),
        signature: 'declare const foo: string'
      })
    })

    it('Method', () => {
      const m = _.Method(documentable('foo'), ['foo(): string'])

      assert.deepStrictEqual(m, {
        ...documentable('foo'),
        signatures: ['foo(): string']
      })
    })

    it('Property', () => {
      const p = _.Property(documentable('foo'), 'foo: string')

      assert.deepStrictEqual(p, {
        ...documentable('foo'),
        signature: 'foo: string'
      })
    })

    it('Interface', () => {
      const i = _.Interface(documentable('A'), 'interface A {}')

      assert.deepStrictEqual(i, {
        _tag: 'Interface',
        ...documentable('A'),
        signature: 'interface A {}'
      })
    })

    it('Function', () => {
      const f = _.Function(documentable('func'), ['declare function func(): string'])

      assert.deepStrictEqual(f, {
        _tag: 'Function',
        ...documentable('func'),
        signatures: ['declare function func(): string']
      })
    })

    it('TypeAlias', () => {
      const ta = _.TypeAlias(documentable('A'), 'type A = string')

      assert.deepStrictEqual(ta, {
        _tag: 'TypeAlias',
        ...documentable('A'),
        signature: 'type A = string'
      })
    })

    it('Export', () => {
      const e = _.Export(documentable('foo'), 'export declare const foo: string')

      assert.deepStrictEqual(e, {
        _tag: 'Export',
        ...documentable('foo'),
        signature: 'export declare const foo: string'
      })
    })
  })

  describe.concurrent('instances', () => {
    it('ordModule', () => {
      const m1 = _.Module(
        documentable('test1'),
        ['src', 'test1.ts'],
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty
      )

      const m2 = _.Module(
        documentable('test1'),
        ['src', 'test1.ts'],
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty,
        RA.empty
      )

      const sorted = pipe([m2, m1], RA.sort(_.ordModule))

      assert.deepStrictEqual(sorted, [m1, m2])
    })
  })
})
