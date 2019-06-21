import * as assert from 'assert'
import { none, some } from 'fp-ts/lib/Option'
import {
  getClasses,
  getFunctions,
  getInterfaces,
  getSourceFile,
  getTypeAliases,
  getConstants,
  getModuleInfo,
  getExports
} from '../src/parser'
import { right, left } from 'fp-ts/lib/Either'

describe('getInterfaces', () => {
  it('should return no `Interface`s if the file is empty', () => {
    const sourceFile = getSourceFile('test', '')
    assert.deepStrictEqual(getInterfaces(sourceFile), right([]))
  })

  it('should return no `Interface`s if there are no exported interfaces', () => {
    const sourceFile = getSourceFile('test', 'interface A {}')
    assert.deepStrictEqual(getInterfaces(sourceFile), right([]))
  })

  it('should return an `Interface`', () => {
    const sourceFile = getSourceFile(
      'test',
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
          since: some('1.0.0'),
          examples: []
        }
      ])
    )
  })
})

describe('getFunctions', () => {
  it('should raise an error if the function is anonymous', () => {
    const sourceFile = getSourceFile('test', `export function(a: number, b: number): number { return a + b }`)
    assert.deepStrictEqual(getFunctions('test', sourceFile), left(['Missing function name in module test']))
  })

  it('should not return private function declarations', () => {
    const sourceFile = getSourceFile('test', `function sum(a: number, b: number): number { return a + b }`)
    assert.deepStrictEqual(getFunctions('test', sourceFile), right([]))
  })

  it('should not return internal function declarations', () => {
    const sourceFile = getSourceFile(
      'test',
      `/** @internal */export function sum(a: number, b: number): number { return a + b }`
    )
    assert.deepStrictEqual(getFunctions('test', sourceFile), right([]))
  })

  it('should not return private variable declarations', () => {
    const sourceFile = getSourceFile('test', `const sum = (a: number, b: number): number => a + b `)
    assert.deepStrictEqual(getFunctions('test', sourceFile), right([]))
  })

  it('should not return internal variable declarations', () => {
    const sourceFile = getSourceFile(
      'test',
      `/** @internal */export const sum = (a: number, b: number): number => a + b `
    )
    assert.deepStrictEqual(getFunctions('test', sourceFile), right([]))
  })

  it('should not return exported const declarations', () => {
    const sourceFile = getSourceFile('test', `export const a = 1`)
    assert.deepStrictEqual(getFunctions('test', sourceFile), right([]))
  })

  it('should handle a const function', () => {
    const sourceFile = getSourceFile(
      'test',
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
          since: some('1.0.0'),
          examples: ['assert.deeStrictEqual(f(1, 2), { a: 1, b: 2})', 'assert.deeStrictEqual(f(3, 4), { a: 3, b: 4})']
        }
      ])
    )
  })

  it('should return a `Func` with a body', () => {
    const sourceFile = getSourceFile(
      'test',
      `const a: number = 1
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
          since: none,
          examples: []
        }
      ])
    )
  })

  it('should return a `Func` with comments', () => {
    const sourceFile = getSourceFile(
      'test',
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
          since: some('1.0.0'),
          examples: []
        }
      ])
    )
  })

  it('should handle overloadings', () => {
    const sourceFile = getSourceFile(
      'test',
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
          since: some('1.0.0'),
          examples: []
        }
      ])
    )
  })
})

describe('getTypeAliases', () => {
  it('should return a `TypeAlias`', () => {
    const sourceFile = getSourceFile(
      'test',
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
          since: some('1.0.0'),
          examples: []
        }
      ])
    )
  })
})

describe('getConstants', () => {
  it('should return a `Constant`', () => {
    const sourceFile = getSourceFile(
      'test',
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
          since: some('1.0.0'),
          examples: []
        }
      ])
    )
  })
})

describe('getClasses', () => {
  it('should raise an error if the class is anonymous', () => {
    const sourceFile = getSourceFile('test', `export class {}`)
    assert.deepStrictEqual(getClasses('test', sourceFile), left(['Missing class name in module test']))
  })

  it('should skip the constructor body', () => {
    const sourceFile = getSourceFile('test', `export class C { constructor() { ... } }`)
    assert.deepStrictEqual(
      getClasses('test', sourceFile),
      right([
        {
          deprecated: false,
          description: none,
          examples: [],
          methods: [],
          name: 'C',
          signature: 'export class C {\n  constructor() { ... }\n  ... \n}',
          since: none,
          staticMethods: []
        }
      ])
    )
  })

  it('should return a `Class`', () => {
    const sourceFile = getSourceFile(
      'test',
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
          since: some('1.0.0'),
          examples: [],
          methods: [
            {
              deprecated: true,
              description: some('a method description...'),
              name: 'g',
              signatures: ['g(a: number, b: number): { [key: string]: number } { ... }'],
              since: some('1.1.0'),
              examples: []
            }
          ],
          staticMethods: [
            {
              deprecated: true,
              description: some('a static method description...'),
              name: 'f',
              signatures: ['static f() { ... }'],
              since: some('1.1.0'),
              examples: []
            }
          ]
        }
      ])
    )
  })

  it('should handle method overloadings', () => {
    const sourceFile = getSourceFile(
      'test',
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
          since: some('1.0.0'),
          examples: [],
          methods: [
            {
              deprecated: true,
              description: some('a method description...'),
              name: 'map',
              signatures: ['map(f: (a: number) => number): Test', 'map(f: (a: string) => string): Test { ... }'],
              since: some('1.1.0'),
              examples: []
            }
          ],
          staticMethods: [
            {
              deprecated: true,
              description: some('a static method description...'),
              name: 'f',
              signatures: ['static f(x: number): number', 'static f(x: string): string { ... }'],
              since: some('1.1.0'),
              examples: []
            }
          ]
        }
      ])
    )
  })
})

describe('getModuleInfo', () => {
  it('should not return a file description if there is no @file tag', () => {
    const sourceFile = getSourceFile(
      'test',
      `
/**
 * @since 1.0.0
 */
export const a: number = 1
    `
    )
    assert.deepStrictEqual(getModuleInfo(sourceFile), {
      description: none,
      deprecated: false
    })
  })

  it('should return a description field and a deprecated field', () => {
    const sourceFile = getSourceFile(
      'test',
      `
/**
 * @file Manages the configuration settings for the widget
 * @deprecated
 */

/**
 * @since 1.0.0
 */
export const a: number = 1
    `
    )
    assert.deepStrictEqual(getModuleInfo(sourceFile), {
      description: some('Manages the configuration settings for the widget'),
      deprecated: true
    })
  })
})

describe('getExports', () => {
  it('should return no `Export`s if the file is empty', () => {
    const sourceFile = getSourceFile('test', '')
    assert.deepStrictEqual(getExports(sourceFile), right([]))
  })

  it('should skip if there are too many named exports', () => {
    const sourceFile = getSourceFile('test', 'export { a, b }')
    assert.deepStrictEqual(getExports(sourceFile), right([]))
  })

  it('should handle renamimg', () => {
    const sourceFile = getSourceFile('test', 'export { a as b }')
    assert.deepStrictEqual(
      getExports(sourceFile),
      right([
        {
          deprecated: false,
          description: none,
          examples: [],
          name: 'b',
          signature: 'export { a as b }',
          since: none
        }
      ])
    )
  })

  it('should return an `Export`', () => {
    const sourceFile = getSourceFile(
      'test',
      `/**
* a description...
* @since 1.0.0
* @deprecated
*/
export { a }`
    )
    assert.deepStrictEqual(
      getExports(sourceFile),
      right([
        {
          deprecated: true,
          description: some('a description...'),
          examples: [],
          name: 'a',
          signature: 'export { a }',
          since: some('1.0.0')
        }
      ])
    )
  })
})
