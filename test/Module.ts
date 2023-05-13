import { pipe } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import * as ReadonlyArray from '@effect/data/ReadonlyArray'
import * as assert from 'assert'

import * as Module from '../src/Module'

const documentable = (name: string) =>
  Module.createDocumentable(name, Option.none(), Option.some('1.0.0'), false, [], Option.none())

describe.concurrent('Module', () => {
  describe.concurrent('constructors', () => {
    it('Documentable', () => {
      assert.deepStrictEqual(documentable('A'), {
        name: 'A',
        description: Option.none(),
        since: Option.some('1.0.0'),
        deprecated: false,
        examples: [],
        category: Option.none()
      })
    })

    it('Module', () => {
      const m = Module.createModule(documentable('test'), ['src', 'index.ts'], [], [], [], [], [], [])

      assert.deepStrictEqual(m, {
        ...documentable('test'),
        path: ['src', 'index.ts'],
        classes: [],
        interfaces: [],
        functions: [],
        typeAliases: [],
        constants: [],
        exports: []
      })
    })

    it('Class', () => {
      const c = Module.createClass(documentable('A'), 'declare class A { constructor() }', [], [], [])

      assert.deepStrictEqual(c, {
        _tag: 'Class',
        ...documentable('A'),
        signature: 'declare class A { constructor() }',
        methods: [],
        staticMethods: [],
        properties: []
      })
    })

    it('Constant', () => {
      const c = Module.createConstant(documentable('foo'), 'declare const foo: string')

      assert.deepStrictEqual(c, {
        _tag: 'Constant',
        ...documentable('foo'),
        signature: 'declare const foo: string'
      })
    })

    it('Method', () => {
      const m = Module.createMethod(documentable('foo'), ['foo(): string'])

      assert.deepStrictEqual(m, {
        ...documentable('foo'),
        signatures: ['foo(): string']
      })
    })

    it('Property', () => {
      const p = Module.createProperty(documentable('foo'), 'foo: string')

      assert.deepStrictEqual(p, {
        ...documentable('foo'),
        signature: 'foo: string'
      })
    })

    it('Interface', () => {
      const i = Module.createInterface(documentable('A'), 'interface A {}')

      assert.deepStrictEqual(i, {
        _tag: 'Interface',
        ...documentable('A'),
        signature: 'interface A {}'
      })
    })

    it('Function', () => {
      const f = Module.createFunction(documentable('func'), ['declare function func(): string'])

      assert.deepStrictEqual(f, {
        _tag: 'Function',
        ...documentable('func'),
        signatures: ['declare function func(): string']
      })
    })

    it('TypeAlias', () => {
      const ta = Module.createTypeAlias(documentable('A'), 'type A = string')

      assert.deepStrictEqual(ta, {
        _tag: 'TypeAlias',
        ...documentable('A'),
        signature: 'type A = string'
      })
    })

    it('Export', () => {
      const e = Module.createExport(documentable('foo'), 'export declare const foo: string')

      assert.deepStrictEqual(e, {
        _tag: 'Export',
        ...documentable('foo'),
        signature: 'export declare const foo: string'
      })
    })
  })

  describe.concurrent('instances', () => {
    it('ordModule', () => {
      const m1 = Module.createModule(documentable('test1'), ['src', 'test1.ts'], [], [], [], [], [], [])

      const m2 = Module.createModule(documentable('test1'), ['src', 'test1.ts'], [], [], [], [], [], [])

      const sorted = pipe([m2, m1], ReadonlyArray.sort(Module.Order))

      assert.deepStrictEqual(sorted, [m1, m2])
    })
  })
})
