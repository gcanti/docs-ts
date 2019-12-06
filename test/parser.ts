import * as assert from 'assert'
import { none, some } from 'fp-ts/lib/Option'
import {
  getClasses,
  getFunctions,
  getInterfaces,
  getTypeAliases,
  getConstants,
  getModuleDocumentation,
  getExports,
  stripImportTypes
} from '../src/parser'
import { right, left } from 'fp-ts/lib/Either'
import * as ast from 'ts-morph'

const project = new ast.Project()

let counter = 0

function getTestSourceFile(source: string): ast.SourceFile {
  return project.createSourceFile(`test${counter++}.ts`, source)
}

describe('stripImportTypes', () => {
  it('should strip import types', () => {
    assert.strictEqual(
      stripImportTypes(
        '{ <E, A, B>(refinement: import("/Users/giulio/Documents/Projects/github/fp-ts/src/function").Refinement<A, B>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, B>; <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, A>; }'
      ),
      '{ <E, A, B>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, B>; <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, A>; }'
    )
    assert.strictEqual(
      stripImportTypes(
        '{ <A, B>(refinementWithIndex: import("/Users/giulio/Documents/Projects/github/fp-ts/src/FilterableWithIndex").RefinementWithIndex<number, A, B>): (fa: A[]) => B[]; <A>(predicateWithIndex: import("/Users/giulio/Documents/Projects/github/fp-ts/src/FilterableWithIndex").PredicateWithIndex<number, A>): (fa: A[]) => A[]; }'
      ),
      '{ <A, B>(refinementWithIndex: RefinementWithIndex<number, A, B>): (fa: A[]) => B[]; <A>(predicateWithIndex: PredicateWithIndex<number, A>): (fa: A[]) => A[]; }'
    )
  })
})

describe('getInterfaces', () => {
  it('should return no `Interface`s if the file is empty', () => {
    const sourceFile = getTestSourceFile('')
    assert.deepStrictEqual(getInterfaces(sourceFile), right([]))
  })

  it('should return no `Interface`s if there are no exported interfaces', () => {
    const sourceFile = getTestSourceFile('interface A {}')
    assert.deepStrictEqual(getInterfaces(sourceFile), right([]))
  })

  it('should return an `Interface`', () => {
    const sourceFile = getTestSourceFile(
      `/**
 * a description...
 * @since 1.0.0
 * @deprecated
 */
export interface A {}`
    )
    assert.deepStrictEqual(
      getInterfaces(sourceFile),
      right([
        {
          deprecated: true,
          description: some('a description...'),
          name: 'A',
          signature: 'export interface A {}',
          since: '1.0.0',
          examples: []
        }
      ])
    )
  })
})

describe('getFunctions', () => {
  it('should raise an error if the function is anonymous', () => {
    const sourceFile = getTestSourceFile(`export function(a: number, b: number): number { return a + b }`)
    assert.deepStrictEqual(getFunctions('test', sourceFile), left(['Missing function name in module test']))
  })

  it('should not return private function declarations', () => {
    const sourceFile = getTestSourceFile(`function sum(a: number, b: number): number { return a + b }`)
    assert.deepStrictEqual(getFunctions('test', sourceFile), right([]))
  })

  it('should not return internal function declarations', () => {
    const sourceFile = getTestSourceFile(
      `/** @internal */export function sum(a: number, b: number): number { return a + b }`
    )
    assert.deepStrictEqual(getFunctions('test', sourceFile), right([]))
  })

  it('should not return private variable declarations', () => {
    const sourceFile = getTestSourceFile(`const sum = (a: number, b: number): number => a + b `)
    assert.deepStrictEqual(getFunctions('test', sourceFile), right([]))
  })

  it('should not return internal variable declarations', () => {
    const sourceFile = getTestSourceFile(`/** @internal */export const sum = (a: number, b: number): number => a + b `)
    assert.deepStrictEqual(getFunctions('test', sourceFile), right([]))
  })

  it('should not return exported const declarations', () => {
    const sourceFile = getTestSourceFile(`export const a = 1`)
    assert.deepStrictEqual(getFunctions('test', sourceFile), right([]))
  })

  it('should handle a const function', () => {
    const sourceFile = getTestSourceFile(
      `/**
 * a description...
 * @since 1.0.0
 * @example
 * assert.deeStrictEqual(f(1, 2), { a: 1, b: 2})
 * @example
 * assert.deeStrictEqual(f(3, 4), { a: 3, b: 4})
 * @deprecated
 */
export const f = (a: number, b: number): { [key: string]: number } => ({ a, b })`
    )
    assert.deepStrictEqual(
      getFunctions('test', sourceFile),
      right([
        {
          deprecated: true,
          description: some('a description...'),
          name: 'f',
          signatures: ['export const f = (a: number, b: number): { [key: string]: number } => ...'],
          since: '1.0.0',
          examples: ['assert.deeStrictEqual(f(1, 2), { a: 1, b: 2})', 'assert.deeStrictEqual(f(3, 4), { a: 3, b: 4})']
        }
      ])
    )
  })

  it('should return a `Func` with a body', () => {
    const sourceFile = getTestSourceFile(
      `const a: number = 1
/**
 * @since 1.0.0
 */
export function f(a: number, b: number): { [key: string]: number } { return { a, b } }`
    )
    assert.deepStrictEqual(
      getFunctions('test', sourceFile),
      right([
        {
          deprecated: false,
          description: none,
          name: 'f',
          signatures: ['export function f(a: number, b: number): { [key: string]: number } { ... }'],
          since: '1.0.0',
          examples: []
        }
      ])
    )
  })

  it('should return a `Func` with comments', () => {
    const sourceFile = getTestSourceFile(
      `const a: number = 1
/**
 * a description...
 * @since 1.0.0
 * @deprecated
 */
export function f(a: number, b: number): { [key: string]: number } { return { a, b } }`
    )
    assert.deepStrictEqual(
      getFunctions('test', sourceFile),
      right([
        {
          deprecated: true,
          description: some('a description...'),
          name: 'f',
          signatures: ['export function f(a: number, b: number): { [key: string]: number } { ... }'],
          since: '1.0.0',
          examples: []
        }
      ])
    )
  })

  it('should handle overloadings', () => {
    const sourceFile = getTestSourceFile(
      `const a: number = 1
/**
* a description...
* @since 1.0.0
* @deprecated
*/
export function f(a: int, b: int): { [key: string]: number }
export function f(a: number, b: number): { [key: string]: number }
export function f(a: any, b: any): { [key: string]: number } { return { a, b } }`
    )
    assert.deepStrictEqual(
      getFunctions('test', sourceFile),
      right([
        {
          deprecated: true,
          description: some('a description...'),
          name: 'f',
          signatures: [
            'export function f(a: int, b: int): { [key: string]: number }',
            'export function f(a: number, b: number): { [key: string]: number } { ... }'
          ],
          since: '1.0.0',
          examples: []
        }
      ])
    )
  })
})

describe('getTypeAliases', () => {
  it('should return a `TypeAlias`', () => {
    const sourceFile = getTestSourceFile(
      `/**
* a description...
* @since 1.0.0
* @deprecated
*/
export type Option<A> = None<A> | Some<A>`
    )
    assert.deepStrictEqual(
      getTypeAliases(sourceFile),
      right([
        {
          deprecated: true,
          description: some('a description...'),
          name: 'Option',
          signature: 'export type Option<A> = None<A> | Some<A>',
          since: '1.0.0',
          examples: []
        }
      ])
    )
  })
})

describe('getConstants', () => {
  it('should return a `Constant`', () => {
    const sourceFile = getTestSourceFile(
      `/**
* a description...
* @since 1.0.0
* @deprecated
*/
export const setoidString: Setoid<string> = setoidStrict`
    )
    assert.deepStrictEqual(
      getConstants(sourceFile),
      right([
        {
          deprecated: true,
          description: some('a description...'),
          name: 'setoidString',
          signature: 'export const setoidString: Setoid<string> = ...',
          since: '1.0.0',
          examples: []
        }
      ])
    )
  })
})

describe('getClasses', () => {
  it('should raise an error if the class is anonymous', () => {
    const sourceFile = getTestSourceFile(`export class {}`)
    assert.deepStrictEqual(getClasses('test', sourceFile), left(['Missing class name in module test']))
  })

  it('should skip the constructor body', () => {
    const sourceFile = getTestSourceFile(`/** description
 * @since 1.0.0
 */
export class C { constructor() { ... } }`)
    assert.deepStrictEqual(
      getClasses('test', sourceFile),
      right([
        {
          deprecated: false,
          description: some('description'),
          examples: [],
          methods: [],
          name: 'C',
          signature: 'export class C {\n  constructor() { ... }\n  ... \n}',
          since: '1.0.0',
          staticMethods: []
        }
      ])
    )
  })

  it('should return a `Class`', () => {
    const sourceFile = getTestSourceFile(
      `/**
 * a class description...
 * @since 1.0.0
 * @deprecated
 */
export class Test {
  /**
   * a static method description...
   * @since 1.1.0
   * @deprecated
   */
  static f() {}
  constructor(readonly value: string) { }
  /**
   * a method description...
   * @since 1.1.0
   * @deprecated
   */
  g(a: number, b: number): { [key: string]: number } {
    return { a, b }
  }
}`
    )
    assert.deepStrictEqual(
      getClasses('test', sourceFile),
      right([
        {
          deprecated: true,
          description: some('a class description...'),
          name: 'Test',
          signature: 'export class Test {\n  constructor(readonly value: string) { ... }\n  ... \n}',
          since: '1.0.0',
          examples: [],
          methods: [
            {
              deprecated: true,
              description: some('a method description...'),
              name: 'g',
              signatures: ['g(a: number, b: number): { [key: string]: number } { ... }'],
              since: '1.1.0',
              examples: []
            }
          ],
          staticMethods: [
            {
              deprecated: true,
              description: some('a static method description...'),
              name: 'f',
              signatures: ['static f() { ... }'],
              since: '1.1.0',
              examples: []
            }
          ]
        }
      ])
    )
  })

  it('should handle method overloadings', () => {
    const sourceFile = getTestSourceFile(
      `/**
 * a class description...
 * @since 1.0.0
 * @deprecated
 */
export class Test<A> {
  /**
   * a static method description...
   * @since 1.1.0
   * @deprecated
   */
  static f(x: number): number
  static f(x: string): string
  static f(x: any): any {}
  constructor(readonly value: A) { }
  /**
   * a method description...
   * @since 1.1.0
   * @deprecated
   */
  map(f: (a: number) => number): Test
  map(f: (a: string) => string): Test
  map(f: (a: any) => any): any {
    return new Test(f(this.value))
  }
}`
    )
    assert.deepStrictEqual(
      getClasses('test', sourceFile),
      right([
        {
          deprecated: true,
          description: some('a class description...'),
          name: 'Test',
          signature: 'export class Test<A> {\n  constructor(readonly value: A) { ... }\n  ... \n}',
          since: '1.0.0',
          examples: [],
          methods: [
            {
              deprecated: true,
              description: some('a method description...'),
              name: 'map',
              signatures: ['map(f: (a: number) => number): Test', 'map(f: (a: string) => string): Test { ... }'],
              since: '1.1.0',
              examples: []
            }
          ],
          staticMethods: [
            {
              deprecated: true,
              description: some('a static method description...'),
              name: 'f',
              signatures: ['static f(x: number): number', 'static f(x: string): string { ... }'],
              since: '1.1.0',
              examples: []
            }
          ]
        }
      ])
    )
  })
})

describe('getModuleDocumentation', () => {
  it('should return a description field and a deprecated field', () => {
    const sourceFile = getTestSourceFile(
      `
/**
 * Manages the configuration settings for the widget
 * @deprecated
 * @since 1.0.0
 */

/**
 * @since 1.2.0
 */
export const a: number = 1
    `
    )
    assert.deepStrictEqual(
      getModuleDocumentation(sourceFile, 'name'),
      right({
        name: 'name',
        description: some('Manages the configuration settings for the widget'),
        deprecated: true,
        since: '1.0.0',
        examples: []
      })
    )
  })
})

describe('getExports', () => {
  it('should return no `Export`s if the file is empty', () => {
    const sourceFile = getTestSourceFile('')
    assert.deepStrictEqual(getExports(sourceFile), right([]))
  })

  it('should handle renamimg', () => {
    const sourceFile = getTestSourceFile(`const a = 1; export {
  /**
   * @since 1.0.0
   */
  a as b
}`)
    assert.deepStrictEqual(
      getExports(sourceFile),
      right([
        {
          deprecated: false,
          description: none,
          examples: [],
          name: 'b',
          signature: '1',
          since: '1.0.0'
        }
      ])
    )
  })

  it('should return an `Export`', () => {
    const sourceFile = getTestSourceFile(`export {
  /**
   * description_of_a
   * @since 1.0.0
   */
  a,
  /**
   * description_of_b
   * @since 2.0.0
   */
  b
}
`)
    assert.deepStrictEqual(
      getExports(sourceFile),
      right([
        {
          deprecated: false,
          description: some('description_of_a'),
          examples: [],
          name: 'a',
          signature: 'any',
          since: '1.0.0'
        },
        {
          deprecated: false,
          description: some('description_of_b'),
          examples: [],
          name: 'b',
          signature: 'any',
          since: '2.0.0'
        }
      ])
    )
  })

  it('should retrieve an export signature', () => {
    project.createSourceFile(
      'a.ts',
      `
export const a = 1
`
    )
    project.createSourceFile(
      'b.ts',
      `
import { a } from './a'
const b = a
export {
  /**
   * @since 1.0.0
   */
  b
}
`
    )
    const sourceFile = project.getSourceFile('b.ts')!
    assert.deepStrictEqual(
      getExports(sourceFile),
      right([
        {
          deprecated: false,
          description: none,
          examples: [],
          name: 'b',
          signature: '1',
          since: '1.0.0'
        }
      ])
    )
  })
})
