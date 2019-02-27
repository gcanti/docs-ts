import * as assert from 'assert'
import { none, some } from 'fp-ts/lib/Option'
import { Tree } from 'fp-ts/lib/Tree'
import { failure, success } from 'fp-ts/lib/Validation'
import {
  directory,
  file,
  fromDir,
  fromPaths,
  getClasses,
  getFunctions,
  getInterfaces,
  getSourceFile,
  getTypeAliases
} from '../src/parser'

describe('fromPaths', () => {
  it('should return a map of parts', () => {
    assert.deepStrictEqual(fromPaths([]), {})
    assert.deepStrictEqual(fromPaths(['a']), { a: {} })
    assert.deepStrictEqual(fromPaths(['a/b']), { a: { b: {} } })
    assert.deepStrictEqual(fromPaths(['a/b', 'a/c']), { a: { b: {}, c: {} } })
  })
})

describe('fromDir', () => {
  it('should return a tree of parts', () => {
    assert.deepStrictEqual(fromDir(fromPaths([])), [])
    assert.deepStrictEqual(fromDir(fromPaths(['a'])), [new Tree(file(['a']), [])])
    assert.deepStrictEqual(fromDir(fromPaths(['a/b'])), [
      new Tree(directory(['a'], ['b']), [new Tree(file(['a', 'b']), [])])
    ])
    assert.deepStrictEqual(fromDir(fromPaths(['a/b', 'a/c'])), [
      new Tree(directory(['a'], ['b', 'c']), [new Tree(file(['a', 'b']), []), new Tree(file(['a', 'c']), [])])
    ])
  })
})

describe('getInterfaces', () => {
  it('should return no `Interface`s if the file is empty', () => {
    const sourceFile = getSourceFile('test', '')
    assert.deepStrictEqual(getInterfaces(sourceFile), success([]))
  })

  it('should return no `Interface`s if there are no exported interfaces', () => {
    const sourceFile = getSourceFile('test', 'interface A {}')
    assert.deepStrictEqual(getInterfaces(sourceFile), success([]))
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
      success([
        {
          deprecated: true,
          description: some('a description...'),
          location: {
            from: 6,
            to: 6
          },
          name: 'A',
          signature: 'export interface A {}',
          since: some('1.0.0')
        }
      ])
    )
  })
})

describe('getFunctions', () => {
  it('should raise an error if the function is anonymous', () => {
    const sourceFile = getSourceFile('test', `export function(a: number, b: number): number { return a + b }`)
    assert.deepStrictEqual(getFunctions('test', sourceFile), failure(['Missing function name in module test']))
  })

  it('should not return private function declarations', () => {
    const sourceFile = getSourceFile('test', `function sum(a: number, b: number): number { return a + b }`)
    assert.deepStrictEqual(getFunctions('test', sourceFile), success([]))
  })

  it('should not return internal function declarations', () => {
    const sourceFile = getSourceFile(
      'test',
      `/** @internal */export function sum(a: number, b: number): number { return a + b }`
    )
    assert.deepStrictEqual(getFunctions('test', sourceFile), success([]))
  })

  it('should not return private variable declarations', () => {
    const sourceFile = getSourceFile('test', `const sum = (a: number, b: number): number => a + b `)
    assert.deepStrictEqual(getFunctions('test', sourceFile), success([]))
  })

  it('should not return internal variable declarations', () => {
    const sourceFile = getSourceFile(
      'test',
      `/** @internal */export const sum = (a: number, b: number): number => a + b `
    )
    assert.deepStrictEqual(getFunctions('test', sourceFile), success([]))
  })

  it('should not return exported const declarations', () => {
    const sourceFile = getSourceFile('test', `export const a = 1`)
    assert.deepStrictEqual(getFunctions('test', sourceFile), success([]))
  })

  it('should handle a const function', () => {
    const sourceFile = getSourceFile(
      'test',
      `/**
 * a description...
 * @since 1.0.0
 * @deprecated
 */
export const sum = (a: number, b: number): number => a + b`
    )
    assert.deepStrictEqual(
      getFunctions('test', sourceFile),
      success([
        {
          deprecated: true,
          description: some('a description...'),
          location: {
            from: 6,
            to: 6
          },
          name: 'sum',
          signatures: ['export const sum = (a: number, b: number): number => ...'],
          since: some('1.0.0'),
          example: none
        }
      ])
    )
  })

  it('should return a `Func`', () => {
    const sourceFile = getSourceFile(
      'test',
      `/**
 * a description...
 * @since 1.0.0
 * @deprecated
 */
export function sum(a: number, b: number): number { return a + b }`
    )
    assert.deepStrictEqual(
      getFunctions('test', sourceFile),
      success([
        {
          deprecated: true,
          description: some('a description...'),
          location: {
            from: 6,
            to: 6
          },
          name: 'sum',
          signatures: ['export function sum(a: number, b: number): number { ... }'],
          since: some('1.0.0'),
          example: none
        }
      ])
    )
  })

  it('should handle overloadings', () => {
    const sourceFile = getSourceFile(
      'test',
      `/**
* a description...
* @since 1.0.0
* @deprecated
*/
export function sum(a: int, b: int): int
export function sum(a: number, b: number): number { return a + b }`
    )
    assert.deepStrictEqual(
      getFunctions('test', sourceFile),
      success([
        {
          deprecated: true,
          description: some('a description...'),
          location: {
            from: 7,
            to: 7
          },
          name: 'sum',
          signatures: [
            'export function sum(a: int, b: int): int',
            'export function sum(a: number, b: number): number { ... }'
          ],
          since: some('1.0.0'),
          example: none
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
      success([
        {
          deprecated: true,
          description: some('a description...'),
          location: {
            from: 6,
            to: 6
          },
          name: 'Option',
          signature: 'export type Option<A> = None<A> | Some<A>',
          since: some('1.0.0'),
          example: none
        }
      ])
    )
  })
})

describe('getClasses', () => {
  it('should raise an error if the class is anonymous', () => {
    const sourceFile = getSourceFile('test', `export class {}`)
    assert.deepStrictEqual(getClasses('test', sourceFile), failure(['Missing class name in module test']))
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
  map(f: (a: string) => string): Test {
    return new Test(f(this.value))
  }
}`
    )
    assert.deepStrictEqual(
      getClasses('test', sourceFile),
      success([
        {
          deprecated: true,
          description: some('a class description...'),
          location: {
            from: 6,
            to: 22
          },
          name: 'Test',
          signature: 'export class Test {\n  constructor(readonly value: string) { }\n  ... \n}',
          since: some('1.0.0'),
          example: none,
          methods: [
            {
              deprecated: true,
              description: some('a method description...'),
              location: {
                from: 19,
                to: 21
              },
              name: 'map',
              signatures: ['map(f: (a: string) => string): Test { ... }'],
              since: some('1.1.0'),
              example: none
            }
          ],
          staticMethods: [
            {
              deprecated: true,
              description: some('a static method description...'),
              location: {
                from: 12,
                to: 12
              },
              name: 'f',
              signatures: ['static f() { ... }'],
              since: some('1.1.0'),
              example: none
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
  static f(x: string): string {}
  constructor(readonly value: A) { }
  /**
   * a method description...
   * @since 1.1.0
   * @deprecated
   */
  map(f: (a: number) => number): Test
  map(f: (a: string) => string): Test {
    return new Test(f(this.value))
  }
}`
    )
    assert.deepStrictEqual(
      getClasses('test', sourceFile),
      success([
        {
          deprecated: true,
          description: some('a class description...'),
          location: {
            from: 6,
            to: 24
          },
          name: 'Test',
          signature: 'export class Test<A> {\n  constructor(readonly value: A) { }\n  ... \n}',
          since: some('1.0.0'),
          example: none,
          methods: [
            {
              deprecated: true,
              description: some('a method description...'),
              location: {
                from: 21,
                to: 23
              },
              name: 'map',
              signatures: ['map(f: (a: number) => number): Test', 'map(f: (a: string) => string): Test { ... }'],
              since: some('1.1.0'),
              example: none
            }
          ],
          staticMethods: [
            {
              deprecated: true,
              description: some('a static method description...'),
              location: {
                from: 13,
                to: 13
              },
              name: 'f',
              signatures: ['static f(x: number): number', 'static f(x: string): string { ... }'],
              since: some('1.1.0'),
              example: none
            }
          ]
        }
      ])
    )
  })
})
