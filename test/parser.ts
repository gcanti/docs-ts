import * as assert from 'assert'
import * as P from '../src/parser'
import { right, left } from 'fp-ts/lib/Either'
import * as ast from 'ts-morph'
import * as O from 'fp-ts/lib/Option'

const project = new ast.Project()

let counter = 0

function getTestSourceFile(source: string): ast.SourceFile {
  return project.createSourceFile(`test${counter++}.ts`, source)
}

const testEnv: P.Env = {
  path: ['test'],
  sourceFile: getTestSourceFile('')
}

describe('parser', () => {
  it('parseContent', () => {
    assert.deepStrictEqual(P.parseComment(''), {
      description: O.none,
      tags: {}
    })
    assert.deepStrictEqual(P.parseComment('/** description */'), {
      description: O.some('description'),
      tags: {}
    })
    assert.deepStrictEqual(P.parseComment('/** description\n * @since 1.0.0\n */'), {
      description: O.some('description'),
      tags: {
        since: [O.some('1.0.0')]
      }
    })
    assert.deepStrictEqual(P.parseComment('/** description\n * @deprecated\n */'), {
      description: O.some('description'),
      tags: {
        deprecated: [O.none]
      }
    })
    assert.deepStrictEqual(P.parseComment('/** description\n * @category instance\n */'), {
      description: O.some('description'),
      tags: {
        category: [O.some('instance')]
      }
    })
  })

  it('getCommentInfo', () => {
    assert.deepStrictEqual(
      P.getCommentInfo('name', '/** description\n * @since 1.0.0\n * @category instance\n */')(testEnv),
      right({
        category: O.some('instance'),
        deprecated: false,
        description: O.some('description'),
        examples: [],
        since: '1.0.0'
      })
    )
  })
})

describe('stripImportTypes', () => {
  it('should strip import types', () => {
    assert.strictEqual(
      P.stripImportTypes(
        '{ <E, A, B>(refinement: import("/Users/giulio/Documents/Projects/github/fp-ts/src/function").Refinement<A, B>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, B>; <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, A>; }'
      ),
      '{ <E, A, B>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, B>; <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, A>; }'
    )
    assert.strictEqual(
      P.stripImportTypes(
        '{ <A, B>(refinementWithIndex: import("/Users/giulio/Documents/Projects/github/fp-ts/src/FilterableWithIndex").RefinementWithIndex<number, A, B>): (fa: A[]) => B[]; <A>(predicateWithIndex: import("/Users/giulio/Documents/Projects/github/fp-ts/src/FilterableWithIndex").PredicateWithIndex<number, A>): (fa: A[]) => A[]; }'
      ),
      '{ <A, B>(refinementWithIndex: RefinementWithIndex<number, A, B>): (fa: A[]) => B[]; <A>(predicateWithIndex: PredicateWithIndex<number, A>): (fa: A[]) => A[]; }'
    )
  })
})

describe('parseInterfaces', () => {
  it('should return no `Interface`s if the file is empty', () => {
    const sourceFile = getTestSourceFile('')
    assert.deepStrictEqual(P.parseInterfaces({ ...testEnv, sourceFile }), right([]))
  })

  it('should return no `Interface`s if there are no exported interfaces', () => {
    const sourceFile = getTestSourceFile('interface A {}')
    assert.deepStrictEqual(P.parseInterfaces({ ...testEnv, sourceFile }), right([]))
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
      P.parseInterfaces({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Interface',
          deprecated: true,
          description: O.some('a description...'),
          name: 'A',
          signature: 'export interface A {}',
          since: '1.0.0',
          examples: [],
          category: O.none
        }
      ])
    )
  })
})

describe('parseFunctions', () => {
  it('should raise an error if the function is anonymous', () => {
    const sourceFile = getTestSourceFile(`export function(a: number, b: number): number { return a + b }`)
    assert.deepStrictEqual(P.parseFunctions({ ...testEnv, sourceFile }), left('Missing function name in module test'))
  })

  it('should not return private function declarations', () => {
    const sourceFile = getTestSourceFile(`function sum(a: number, b: number): number { return a + b }`)
    assert.deepStrictEqual(P.parseFunctions({ ...testEnv, sourceFile }), right([]))
  })

  it('should not return internal function declarations', () => {
    const sourceFile = getTestSourceFile(
      `/** @internal */export function sum(a: number, b: number): number { return a + b }`
    )
    assert.deepStrictEqual(P.parseFunctions({ ...testEnv, sourceFile }), right([]))
  })

  it('should not return private variable declarations', () => {
    const sourceFile = getTestSourceFile(`const sum = (a: number, b: number): number => a + b `)
    assert.deepStrictEqual(P.parseFunctions({ ...testEnv, sourceFile }), right([]))
  })

  it('should not return internal variable declarations', () => {
    const sourceFile = getTestSourceFile(`/** @internal */export const sum = (a: number, b: number): number => a + b `)
    assert.deepStrictEqual(P.parseFunctions({ ...testEnv, sourceFile }), right([]))
  })

  it('should not return exported const declarations', () => {
    const sourceFile = getTestSourceFile(`export const a = 1`)
    assert.deepStrictEqual(P.parseFunctions({ ...testEnv, sourceFile }), right([]))
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
      P.parseFunctions({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Function',
          deprecated: true,
          description: O.some('a description...'),
          name: 'f',
          signatures: ['export declare const f: (a: number, b: number) => { [key: string]: number; }'],
          since: '1.0.0',
          examples: ['assert.deeStrictEqual(f(1, 2), { a: 1, b: 2})', 'assert.deeStrictEqual(f(3, 4), { a: 3, b: 4})'],
          category: O.none
        }
      ])
    )
  })

  it('should return a function declaration', () => {
    const sourceFile = getTestSourceFile(
      `const a: number = 1
/**
 * @since 1.0.0
 */
export function f(a: number, b: number): { [key: string]: number } { return { a, b } }`
    )
    assert.deepStrictEqual(
      P.parseFunctions({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Function',
          deprecated: false,
          description: O.none,
          name: 'f',
          signatures: ['export declare function f(a: number, b: number): { [key: string]: number }'],
          since: '1.0.0',
          examples: [],
          category: O.none
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
      P.parseFunctions({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Function',
          deprecated: true,
          description: O.some('a description...'),
          name: 'f',
          signatures: ['export declare function f(a: number, b: number): { [key: string]: number }'],
          since: '1.0.0',
          examples: [],
          category: O.none
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
      P.parseFunctions({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Function',
          deprecated: true,
          description: O.some('a description...'),
          name: 'f',
          signatures: [
            'export declare function f(a: int, b: int): { [key: string]: number }',
            'export declare function f(a: number, b: number): { [key: string]: number }'
          ],
          since: '1.0.0',
          examples: [],
          category: O.none
        }
      ])
    )
  })
})

describe('parseTypeAliases', () => {
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
      P.parseTypeAliases({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'TypeAlias',
          deprecated: true,
          description: O.some('a description...'),
          name: 'Option',
          signature: 'export type Option<A> = None<A> | Some<A>',
          since: '1.0.0',
          examples: [],
          category: O.none
        }
      ])
    )
  })
})

describe('parseConstants', () => {
  it('should handle a constant', () => {
    const sourceFile = getTestSourceFile(
      `/**
* a description...
* @since 1.0.0
* @deprecated
*/
export const s: string = ''`
    )
    assert.deepStrictEqual(
      P.parseConstants({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Constant',
          deprecated: true,
          description: O.some('a description...'),
          name: 's',
          signature: 'export declare const s: string',
          since: '1.0.0',
          examples: [],
          category: O.none
        }
      ])
    )
  })

  it('should support default type parameters', () => {
    const sourceFile = getTestSourceFile(
      `/**
* @since 1.0.0
*/
export const left: <E = never, A = never>(l: E) => string = T.left`
    )
    assert.deepStrictEqual(
      P.parseConstants({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Constant',
          deprecated: false,
          description: O.none,
          name: 'left',
          signature: 'export declare const left: <E = never, A = never>(l: E) => string',
          since: '1.0.0',
          examples: [],
          category: O.none
        }
      ])
    )
  })

  it('should support untyped constants', () => {
    const sourceFile = getTestSourceFile(
      `/**
* @since 1.0.0
*/
export const empty = new Map<never, never>()`
    )
    assert.deepStrictEqual(
      P.parseConstants({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Constant',
          deprecated: false,
          description: O.none,
          name: 'empty',
          signature: 'export declare const empty: Map<never, never>',
          since: '1.0.0',
          examples: [],
          category: O.none
        }
      ])
    )
  })

  it('should typeof annotations', () => {
    const sourceFile = getTestSourceFile(
      `
const task: { a: number } = {
  a: 1
}

/**
* @since 1.0.0
*/
export const taskSeq: typeof task = {
  ...task,
  ap: (mab, ma) => () => mab().then(f => ma().then(a => f(a)))
}`
    )
    assert.deepStrictEqual(
      P.parseConstants({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Constant',
          deprecated: false,
          description: O.none,
          name: 'taskSeq',
          signature: 'export declare const taskSeq: { a: number; }',
          since: '1.0.0',
          examples: [],
          category: O.none
        }
      ])
    )
  })
})

describe('parseClasses', () => {
  it('should raise an error if the class is anonymous', () => {
    const sourceFile = getTestSourceFile(`export class {}`)
    assert.deepStrictEqual(P.parseClasses({ ...testEnv, sourceFile }), left('Missing class name in module test'))
  })

  it('should skip the constructor body', () => {
    const sourceFile = getTestSourceFile(`/** description
 * @since 1.0.0
 */
export class C { constructor() {} }`)
    assert.deepStrictEqual(
      P.parseClasses({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Class',
          deprecated: false,
          description: O.some('description'),
          examples: [],
          category: O.none,
          methods: [],
          name: 'C',
          signature: 'export declare class C { constructor() }',
          since: '1.0.0',
          staticMethods: [],
          properties: []
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
   * a property...
   * @since 1.1.0
   * @deprecated
   */
  readonly a: string
  private readonly b: number
  /**
   * a static method description...
   * @since 1.1.0
   * @deprecated
   */
  static f(): void {}
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
      P.parseClasses({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Class',
          deprecated: true,
          description: O.some('a class description...'),
          name: 'Test',
          signature: 'export declare class Test { constructor(readonly value: string) }',
          since: '1.0.0',
          examples: [],
          category: O.none,
          methods: [
            {
              deprecated: true,
              description: O.some('a method description...'),
              name: 'g',
              signatures: ['g(a: number, b: number): { [key: string]: number }'],
              since: '1.1.0',
              examples: [],
              category: O.none
            }
          ],
          staticMethods: [
            {
              deprecated: true,
              description: O.some('a static method description...'),
              name: 'f',
              signatures: ['static f(): void'],
              since: '1.1.0',
              examples: [],
              category: O.none
            }
          ],
          properties: [
            {
              deprecated: true,
              description: O.some('a property...'),
              examples: [],
              category: O.none,
              name: 'a',
              signature: 'readonly a: string',
              since: '1.1.0'
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
      P.parseClasses({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Class',
          deprecated: true,
          description: O.some('a class description...'),
          name: 'Test',
          signature: 'export declare class Test<A> { constructor(readonly value: A) }',
          since: '1.0.0',
          examples: [],
          category: O.none,
          methods: [
            {
              deprecated: true,
              description: O.some('a method description...'),
              name: 'map',
              signatures: ['map(f: (a: number) => number): Test', 'map(f: (a: string) => string): Test'],
              since: '1.1.0',
              examples: [],
              category: O.none
            }
          ],
          staticMethods: [
            {
              deprecated: true,
              description: O.some('a static method description...'),
              name: 'f',
              signatures: ['static f(x: number): number', 'static f(x: string): string'],
              since: '1.1.0',
              examples: [],
              category: O.none
            }
          ],
          properties: []
        }
      ])
    )
  })
})

describe('parseModuleDocumentation', () => {
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
      P.parseModuleDocumentation({ ...testEnv, sourceFile }),
      right({
        name: 'test',
        description: O.some('Manages the configuration settings for the widget'),
        deprecated: true,
        since: '1.0.0',
        examples: [],
        category: O.none
      })
    )
  })
})

describe('parseExports', () => {
  it('should return no `Export`s if the file is empty', () => {
    const sourceFile = getTestSourceFile('')
    assert.deepStrictEqual(P.parseExports({ ...testEnv, sourceFile }), right([]))
  })

  it('should handle renamimg', () => {
    const sourceFile = getTestSourceFile(`const a = 1; export {
  /**
   * @since 1.0.0
   */
  a as b
}`)
    assert.deepStrictEqual(
      P.parseExports({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Export',
          deprecated: false,
          description: O.none,
          examples: [],
          category: O.none,
          name: 'b',
          signature: 'export declare const b: 1',
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
      P.parseExports({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Export',
          deprecated: false,
          description: O.some('description_of_a'),
          examples: [],
          category: O.none,
          name: 'a',
          signature: 'export declare const a: any',
          since: '1.0.0'
        },
        {
          _tag: 'Export',
          deprecated: false,
          description: O.some('description_of_b'),
          examples: [],
          category: O.none,
          name: 'b',
          signature: 'export declare const b: any',
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
      P.parseExports({ ...testEnv, sourceFile }),
      right([
        {
          _tag: 'Export',
          deprecated: false,
          description: O.none,
          examples: [],
          category: O.none,
          name: 'b',
          signature: 'export declare const b: 1',
          since: '1.0.0'
        }
      ])
    )
  })
})
