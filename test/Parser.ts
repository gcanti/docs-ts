import * as assert from 'assert'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import * as ast from 'ts-morph'

import * as C from '../src/Config'
import * as FS from '../src/FileSystem'
import * as _ from '../src/Parser'

import { assertLeft } from './utils'

let testCounter = 0

const project = new ast.Project()

const settings: C.Settings = {
  projectName: 'docs-ts',
  projectHomepage: 'https://github.com/gcanti/docs-ts',
  srcDir: 'src',
  outDir: 'docs',
  theme: 'pmarsceill/just-the-docs',
  enableSearch: true,
  enforceDescriptions: false,
  enforceExamples: false,
  exclude: RA.empty
}

const getTestEnv = (sourceText: string): _.Env => ({
  path: ['test'],
  sourceFile: project.createSourceFile(`test-${testCounter++}.ts`, sourceText),
  ...settings
})

describe('Parser', () => {
  describe('parsers', () => {
    describe('parseInterfaces', () => {
      it('should return no `Interface`s if the file is empty', () => {
        const env = getTestEnv('')

        assert.deepStrictEqual(pipe(env, _.parseInterfaces), E.right(RA.empty))
      })

      it('should return no `Interface`s if there are no exported interfaces', () => {
        const env = getTestEnv('interface A {}')

        assert.deepStrictEqual(pipe(env, _.parseInterfaces), E.right(RA.empty))
      })

      it('should return an `Interface`', () => {
        const env = getTestEnv(
          `/**
            * a description...
            * @since 1.0.0
            * @deprecated
            */
            export interface A {}`
        )
        assert.deepStrictEqual(
          pipe(env, _.parseInterfaces),
          E.right(
            RA.of({
              _tag: 'Interface',
              deprecated: true,
              description: O.some('a description...'),
              name: 'A',
              signature: 'export interface A {}',
              since: '1.0.0',
              examples: RA.empty,
              category: O.none
            })
          )
        )
      })

      it('should return interfaces sorted by name', () => {
        const env = getTestEnv(
          `
          /**
           * @since 1.0.0
           */
          export interface B {}
          /**
           * @since 1.0.0
           */
          export interface A {}
          `
        )
        assert.deepStrictEqual(
          pipe(env, _.parseInterfaces),
          E.right([
            {
              _tag: 'Interface',
              name: 'A',
              description: O.none,
              since: '1.0.0',
              deprecated: false,
              category: O.none,
              examples: RA.empty,
              signature: 'export interface A {}'
            },
            {
              _tag: 'Interface',
              name: 'B',
              description: O.none,
              since: '1.0.0',
              deprecated: false,
              category: O.none,
              examples: RA.empty,
              signature: 'export interface B {}'
            }
          ])
        )
      })
    })

    describe('parseFunctions', () => {
      it('should raise an error if the function is anonymous', () => {
        const env = getTestEnv(`export function(a: number, b: number): number { return a + b }`)

        assert.deepStrictEqual(pipe(env, _.parseFunctions), E.left('Missing function name in module test'))
      })

      it('should not return private function declarations', () => {
        const env = getTestEnv(`function sum(a: number, b: number): number { return a + b }`)

        assert.deepStrictEqual(pipe(env, _.parseFunctions), E.right(RA.empty))
      })

      it('should not return ignored function declarations', () => {
        const env = getTestEnv(
          `/**
            * @ignore
            */
            export function sum(a: number, b: number): number { return a + b }`
        )

        assert.deepStrictEqual(pipe(env, _.parseFunctions), E.right(RA.empty))
      })

      it('should not return ignored function declarations with overloads', () => {
        const env = getTestEnv(
          `/**
            * @ignore
            */
            export function sum(a: number, b: number)
            export function sum(a: number, b: number): number { return a + b }`
        )

        assert.deepStrictEqual(pipe(env, _.parseFunctions), E.right(RA.empty))
      })

      it('should not return internal function declarations', () => {
        const env = getTestEnv(
          `/**
            * @internal
            */
            export function sum(a: number, b: number): number { return a + b }`
        )

        assert.deepStrictEqual(pipe(env, _.parseFunctions), E.right(RA.empty))
      })

      it('should not return internal function declarations even with overloads', () => {
        const env = getTestEnv(
          `/**
            * @internal
            */
            export function sum(a: number, b: number)
            export function sum(a: number, b: number): number { return a + b }`
        )

        assert.deepStrictEqual(pipe(env, _.parseFunctions), E.right(RA.empty))
      })

      it('should not return private const function declarations', () => {
        const env = getTestEnv(`const sum = (a: number, b: number): number => a + b `)

        assert.deepStrictEqual(pipe(env, _.parseFunctions), E.right(RA.empty))
      })

      it('should not return internal const function declarations', () => {
        const env = getTestEnv(
          `/**
            * @internal
            */
            export const sum = (a: number, b: number): number => a + b `
        )

        assert.deepStrictEqual(pipe(env, _.parseFunctions), E.right(RA.empty))
      })

      it('should return a const function declaration', () => {
        const env = getTestEnv(
          `/**
            * a description...
            * @since 1.0.0
            * @example
            * assert.deepStrictEqual(f(1, 2), { a: 1, b: 2 })
            * @example
            * assert.deepStrictEqual(f(3, 4), { a: 3, b: 4 })
            * @deprecated
            */
            export const f = (a: number, b: number): { [key: string]: number } => ({ a, b })`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseFunctions),
          E.right([
            {
              _tag: 'Function',
              deprecated: true,
              description: O.some('a description...'),
              name: 'f',
              signatures: ['export declare const f: (a: number, b: number) => { [key: string]: number; }'],
              since: '1.0.0',
              examples: [
                'assert.deepStrictEqual(f(1, 2), { a: 1, b: 2 })',
                'assert.deepStrictEqual(f(3, 4), { a: 3, b: 4 })'
              ],
              category: O.none
            }
          ])
        )
      })

      it('should return a function declaration', () => {
        const env = getTestEnv(
          `/**
            * @since 1.0.0
            */
            export function f(a: number, b: number): { [key: string]: number } { return { a, b } }`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseFunctions),
          E.right([
            {
              _tag: 'Function',
              deprecated: false,
              description: O.none,
              name: 'f',
              signatures: ['export declare function f(a: number, b: number): { [key: string]: number }'],
              since: '1.0.0',
              examples: RA.empty,
              category: O.none
            }
          ])
        )
      })

      it('should return a function with comments', () => {
        const env = getTestEnv(
          `/**
            * a description...
            * @since 1.0.0
            * @deprecated
            */
            export function f(a: number, b: number): { [key: string]: number } { return { a, b } }`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseFunctions),
          E.right([
            {
              _tag: 'Function',
              deprecated: true,
              description: O.some('a description...'),
              name: 'f',
              signatures: ['export declare function f(a: number, b: number): { [key: string]: number }'],
              since: '1.0.0',
              examples: RA.empty,
              category: O.none
            }
          ])
        )
      })

      it('should handle overloadings', () => {
        const env = getTestEnv(
          `/**
            * a description...
            * @since 1.0.0
            * @deprecated
            */
            export function f(a: Int, b: Int): { [key: string]: number }
            export function f(a: number, b: number): { [key: string]: number }
            export function f(a: any, b: any): { [key: string]: number } { return { a, b } }`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseFunctions),
          E.right([
            {
              _tag: 'Function',
              name: 'f',
              description: O.some('a description...'),
              since: '1.0.0',
              deprecated: true,
              category: O.none,
              examples: RA.empty,
              signatures: [
                'export declare function f(a: Int, b: Int): { [key: string]: number }',
                'export declare function f(a: number, b: number): { [key: string]: number }'
              ]
            }
          ])
        )
      })
    })

    describe('parseTypeAlias', () => {
      it('should return a `TypeAlias`', () => {
        const env = getTestEnv(
          `/**
            * a description...
            * @since 1.0.0
            * @deprecated
            */
            export type Option<A> = None<A> | Some<A>`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseTypeAliases),
          E.right([
            {
              _tag: 'TypeAlias',
              name: 'Option',
              description: O.some('a description...'),
              since: '1.0.0',
              deprecated: true,
              category: O.none,
              signature: 'export type Option<A> = None<A> | Some<A>',
              examples: RA.empty
            }
          ])
        )
      })
    })

    describe('parseConstants', () => {
      it('should handle a constant value', () => {
        const env = getTestEnv(
          `/**
            * a description...
            * @since 1.0.0
            * @deprecated
            */
            export const s: string = ''`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseConstants),
          E.right([
            {
              _tag: 'Constant',
              name: 's',
              description: O.some('a description...'),
              since: '1.0.0',
              deprecated: true,
              category: O.none,
              signature: 'export declare const s: string',
              examples: RA.empty
            }
          ])
        )
      })

      it('should support constants with default type parameters', () => {
        const env = getTestEnv(
          `/**
            * @since 1.0.0
            */
            export const left: <E = never, A = never>(l: E) => string = T.left`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseConstants),
          E.right([
            {
              _tag: 'Constant',
              name: 'left',
              description: O.none,
              since: '1.0.0',
              deprecated: false,
              category: O.none,
              signature: 'export declare const left: <E = never, A = never>(l: E) => string',
              examples: RA.empty
            }
          ])
        )
      })

      it('should support untyped constants', () => {
        const env = getTestEnv(
          `/**
            * @since 1.0.0
            */
            export const empty = new Map<never, never>()`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseConstants),
          E.right([
            {
              _tag: 'Constant',
              name: 'empty',
              description: O.none,
              since: '1.0.0',
              deprecated: false,
              category: O.none,
              signature: 'export declare const empty: Map<never, never>',
              examples: RA.empty
            }
          ])
        )
      })

      it('should handle constants with typeof annotations', () => {
        const env = getTestEnv(
          ` const task: { a: number } = {
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
          pipe(env, _.parseConstants),
          E.right([
            {
              _tag: 'Constant',
              deprecated: false,
              description: O.none,
              name: 'taskSeq',
              signature: 'export declare const taskSeq: { a: number; }',
              since: '1.0.0',
              examples: RA.empty,
              category: O.none
            }
          ])
        )
      })

      it('should not include variables declared in for loops', () => {
        const env = getTestEnv(
          ` const object = { a: 1, b: 2, c: 3 };

            for (const property in object) {
              console.log(property);
            }`
        )

        assert.deepStrictEqual(pipe(env, _.parseConstants), E.right([]))
      })
    })

    describe('parseClasses', () => {
      it('should raise an error if the class is anonymous', () => {
        const env = getTestEnv(`export class {}`)

        assert.deepStrictEqual(pipe(env, _.parseClasses), E.left('Missing class name in module test'))
      })

      it('should raise an error if an `@since` tag is missing in a module', () => {
        const env = getTestEnv(`export class MyClass {}`)

        assert.deepStrictEqual(pipe(env, _.parseClasses), E.left('Missing @since tag in test#MyClass documentation'))
      })

      it('should raise an error if `@since` is missing in a property', () => {
        const env = getTestEnv(
          `/**
            * @since 1.0.0
            */
            export class MyClass<A> {
              readonly _A!: A
            }`
        )

        assert.deepStrictEqual(pipe(env, _.parseClasses), E.left('Missing @since tag in test#MyClass#_A documentation'))
      })

      it('should skip ignored properties', () => {
        const env = getTestEnv(
          `/**
            * @since 1.0.0
            */
            export class MyClass<A> {
              /**
               * @ignore
               */
              readonly _A!: A
            }`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseClasses),
          E.right([
            {
              _tag: 'Class',
              name: 'MyClass',
              description: O.none,
              since: '1.0.0',
              deprecated: false,
              category: O.none,
              examples: RA.empty,
              signature: 'export declare class MyClass<A>',
              methods: RA.empty,
              staticMethods: RA.empty,
              properties: RA.empty
            }
          ])
        )
      })

      it('should skip the constructor body', () => {
        const env = getTestEnv(
          `/**
            * description
            * @since 1.0.0
            */
            export class C { constructor() {} }`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseClasses),
          E.right([
            {
              _tag: 'Class',
              name: 'C',
              description: O.some('description'),
              since: '1.0.0',
              deprecated: false,
              category: O.none,
              examples: RA.empty,
              signature: 'export declare class C { constructor() }',
              methods: RA.empty,
              staticMethods: RA.empty,
              properties: RA.empty
            }
          ])
        )
      })

      it('should handle non-readonly properties', () => {
        const env = getTestEnv(
          `/**
            * description
            * @since 1.0.0
            */
            export class C {
              /**
               * @since 1.0.0
               */
              a: string
            }`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseClasses),
          E.right([
            {
              _tag: 'Class',
              name: 'C',
              description: O.some('description'),
              since: '1.0.0',
              deprecated: false,
              category: O.none,
              examples: RA.empty,
              signature: 'export declare class C',
              methods: RA.empty,
              staticMethods: RA.empty,
              properties: [
                {
                  name: 'a',
                  description: O.none,
                  since: '1.0.0',
                  deprecated: false,
                  category: O.none,
                  examples: RA.empty,
                  signature: 'a: string'
                }
              ]
            }
          ])
        )
      })

      it('should return a `Class`', () => {
        const env = getTestEnv(
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
          pipe(env, _.parseClasses),
          E.right([
            {
              _tag: 'Class',
              name: 'Test',
              description: O.some('a class description...'),
              since: '1.0.0',
              deprecated: true,
              category: O.none,
              examples: RA.empty,
              signature: 'export declare class Test { constructor(readonly value: string) }',
              methods: [
                {
                  name: 'g',
                  description: O.some('a method description...'),
                  since: '1.1.0',
                  deprecated: true,
                  category: O.none,
                  examples: RA.empty,
                  signatures: ['g(a: number, b: number): { [key: string]: number }']
                }
              ],
              staticMethods: [
                {
                  name: 'f',
                  description: O.some('a static method description...'),
                  since: '1.1.0',
                  deprecated: true,
                  category: O.none,
                  examples: RA.empty,
                  signatures: ['static f(): void']
                }
              ],
              properties: [
                {
                  name: 'a',
                  description: O.some('a property...'),
                  since: '1.1.0',
                  deprecated: true,
                  category: O.none,
                  signature: 'readonly a: string',
                  examples: RA.empty
                }
              ]
            }
          ])
        )
      })

      it('should handle method overloadings', () => {
        const env = getTestEnv(
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
          pipe(env, _.parseClasses),
          E.right([
            {
              _tag: 'Class',
              name: 'Test',
              description: O.some('a class description...'),
              since: '1.0.0',
              deprecated: true,
              category: O.none,
              examples: RA.empty,
              signature: 'export declare class Test<A> { constructor(readonly value: A) }',
              methods: [
                {
                  name: 'map',
                  description: O.some('a method description...'),
                  since: '1.1.0',
                  deprecated: true,
                  category: O.none,
                  examples: RA.empty,
                  signatures: ['map(f: (a: number) => number): Test', 'map(f: (a: string) => string): Test']
                }
              ],
              staticMethods: [
                {
                  name: 'f',
                  description: O.some('a static method description...'),
                  since: '1.1.0',
                  deprecated: true,
                  category: O.none,
                  examples: RA.empty,
                  signatures: ['static f(x: number): number', 'static f(x: string): string']
                }
              ],
              properties: RA.empty
            }
          ])
        )
      })
    })

    describe('parseModuleDocumentation', () => {
      it('should return a description field and a deprecated field', () => {
        const env = getTestEnv(
          `/**
            * Manages the configuration settings for the widget
            * @deprecated
            * @since 1.0.0
            */
            /**
             * @since 1.2.0
             */
            export const a: number = 1`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseModuleDocumentation),
          E.right({
            name: 'test',
            description: O.some('Manages the configuration settings for the widget'),
            since: '1.0.0',
            deprecated: true,
            category: O.none,
            examples: RA.empty
          })
        )
      })
    })

    describe('parseExports', () => {
      it('should return no `Export`s if the file is empty', () => {
        const env = getTestEnv('')

        assert.deepStrictEqual(pipe(env, _.parseExports), E.right(RA.empty))
      })

      it('should handle renamimg', () => {
        const env = getTestEnv(
          `const a = 1;
          export {
            /**
             * @since 1.0.0
             */
            a as b
          }`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseExports),
          E.right([
            {
              _tag: 'Export',
              name: 'b',
              description: O.none,
              deprecated: false,
              since: '1.0.0',
              category: O.none,
              examples: RA.empty,
              signature: 'export declare const b: 1'
            }
          ])
        )
      })

      it('should return an `Export`', () => {
        const env = getTestEnv(
          `export {
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
          }`
        )

        assert.deepStrictEqual(
          pipe(env, _.parseExports),
          E.right([
            {
              _tag: 'Export',
              name: 'a',
              description: O.some('description_of_a'),
              since: '1.0.0',
              deprecated: false,
              category: O.none,
              signature: 'export declare const a: any',
              examples: RA.empty
            },
            {
              _tag: 'Export',
              name: 'b',
              description: O.some('description_of_b'),
              since: '2.0.0',
              deprecated: false,
              category: O.none,
              signature: 'export declare const b: any',
              examples: RA.empty
            }
          ])
        )
      })

      it('should raise an error if `@since` tag is missing in export', () => {
        const env = getTestEnv('export { a }')

        assert.deepStrictEqual(pipe(env, _.parseExports), E.left('Missing a documentation in test'))
      })

      it('should retrieve an export signature', () => {
        project.createSourceFile('a.ts', `export const a = 1`)
        const sourceFile = project.createSourceFile(
          'b.ts',
          `import { a } from './a'
          const b = a
          export {
            /**
              * @since 1.0.0
              */
            b
          }`
        )

        assert.deepStrictEqual(
          pipe({ path: ['test'], sourceFile, ...settings }, _.parseExports),
          E.right([
            {
              _tag: 'Export',
              name: 'b',
              description: O.none,
              since: '1.0.0',
              deprecated: false,
              signature: 'export declare const b: 1',
              category: O.none,
              examples: RA.empty
            }
          ])
        )
      })
    })

    describe('parseModule', () => {
      it('should raise an error if `@since` tag is missing', async () => {
        const env = getTestEnv(`import * as assert from 'assert'`)

        assert.deepStrictEqual(pipe(env, _.parseModule), E.left('Missing documentation in test module'))
      })
    })

    describe('parseFile', () => {
      it('should not parse a non-existent file', async () => {
        const file = FS.File('non-existent.ts', '')
        const project = new ast.Project()

        assert.deepStrictEqual(
          await pipe(settings, _.parseFile(project)(file))(),
          E.left('Unable to locate file: non-existent.ts')
        )
      })
    })

    describe('parseFiles', () => {
      it('should parse an array of files', async () => {
        const files = [
          FS.File(
            'test/fixtures/test1.ts',
            `
/**
 * a description...
 *
 * @since 1.0.0
 */
export function f(a: number, b: number): { [key: string]: number } {
  return { a, b }
}
`
          ),
          FS.File(
            'test/fixtures/test2.ts',
            `
/**
 * a description...
 *
 * @deprecated
 * @since 1.0.0
 */
export function f(a: number, b: number): { [key: string]: number } {
  return { a, b }
}
`
          )
        ]

        assert.deepStrictEqual(
          await pipe(settings, _.parseFiles(files))(),
          E.right([
            {
              name: 'test1',
              path: ['test', 'fixtures', 'test1.ts'],
              description: O.some('a description...'),
              since: '1.0.0',
              deprecated: false,
              category: O.none,
              examples: RA.empty,
              classes: RA.empty,
              constants: RA.empty,
              exports: RA.empty,
              interfaces: RA.empty,
              typeAliases: RA.empty,
              functions: [
                {
                  _tag: 'Function',
                  name: 'f',
                  description: O.some('a description...'),
                  since: '1.0.0',
                  deprecated: false,
                  category: O.none,
                  examples: RA.empty,
                  signatures: ['export declare function f(a: number, b: number): { [key: string]: number }']
                }
              ]
            }
          ])
        )
      })

      it('should not parse a non-existent file', async () => {
        const FILE_NAME = 'test/fixtures/non-existent.ts'
        const files = [FS.File(FILE_NAME, '')]

        const result = await pipe(settings, _.parseFiles(files))()

        assertLeft(result, error => {
          assert.equal(error.includes('Error: File not found'), true)
          assert.equal(error.includes(FILE_NAME), true)
        })
      })
    })
  })

  describe('utils', () => {
    describe('getCommentInfo', () => {
      it('should parse comment information', () => {
        const env = getTestEnv('')

        const text = `/**
* description
* @category instances
* @since 1.0.0
*/`

        assert.deepStrictEqual(
          pipe(env, _.getCommentInfo('name')(text)),
          E.right({
            description: O.some('description'),
            since: '1.0.0',
            category: O.some('instances'),
            deprecated: false,
            examples: RA.empty
          })
        )
      })

      it('should fail if an empty comment tag is provided', () => {
        const env = getTestEnv('')

        const text = `/**
* @category
* @since 1.0.0
*/`

        assert.deepStrictEqual(
          pipe(env, _.getCommentInfo('name')(text)),
          E.left('Missing @category value in test#name documentation')
        )
      })

      it('should require a description if `enforceDescriptions` is set to true', () => {
        const env = getTestEnv('')

        const text = `/**
* @category instances
* @since 1.0.0
*/`

        assert.deepStrictEqual(
          pipe({ ...env, enforceDescriptions: true }, _.getCommentInfo('name')(text)),
          E.left('Missing description in test#name documentation')
        )
      })

      it('should require at least one example if `enforceExamples` is set to true', () => {
        const env = getTestEnv('')

        const text = `/**
* description
* @category instances
* @since 1.0.0
*/`

        assert.deepStrictEqual(
          pipe({ ...env, enforceExamples: true }, _.getCommentInfo('name')(text)),
          E.left('Missing examples in test#name documentation')
        )
      })

      it('should require at least one non-empty example if `enforceExamples` is set to true', () => {
        const env = getTestEnv('')

        const text = `/**
* description
* @example
* @category instances
* @since 1.0.0
*/`

        assert.deepStrictEqual(
          pipe({ ...env, enforceExamples: true }, _.getCommentInfo('name')(text)),
          E.left('Missing examples in test#name documentation')
        )
      })
    })

    it('parseComment', () => {
      assert.deepStrictEqual(_.parseComment(''), {
        description: O.none,
        tags: {}
      })

      assert.deepStrictEqual(_.parseComment('/** description */'), {
        description: O.some('description'),
        tags: {}
      })

      assert.deepStrictEqual(_.parseComment('/** description\n * @since 1.0.0\n */'), {
        description: O.some('description'),
        tags: {
          since: [O.some('1.0.0')]
        }
      })

      assert.deepStrictEqual(_.parseComment('/** description\n * @deprecated\n */'), {
        description: O.some('description'),
        tags: {
          deprecated: [O.none]
        }
      })

      assert.deepStrictEqual(_.parseComment('/** description\n * @category instance\n */'), {
        description: O.some('description'),
        tags: {
          category: [O.some('instance')]
        }
      })
    })

    it('stripImportTypes', () => {
      assert.strictEqual(
        _.stripImportTypes(
          '{ <E, A, B>(refinement: import("/Users/giulio/Documents/Projects/github/fp-ts/src/function").Refinement<A, B>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, B>; <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, A>; }'
        ),
        '{ <E, A, B>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, B>; <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, A>; }'
      )
      assert.strictEqual(
        _.stripImportTypes(
          '{ <A, B>(refinementWithIndex: import("/Users/giulio/Documents/Projects/github/fp-ts/src/FilterableWithIndex").RefinementWithIndex<number, A, B>): (fa: A[]) => B[]; <A>(predicateWithIndex: import("/Users/giulio/Documents/Projects/github/fp-ts/src/FilterableWithIndex").PredicateWithIndex<number, A>): (fa: A[]) => A[]; }'
        ),
        '{ <A, B>(refinementWithIndex: RefinementWithIndex<number, A, B>): (fa: A[]) => B[]; <A>(predicateWithIndex: PredicateWithIndex<number, A>): (fa: A[]) => A[]; }'
      )
    })
  })
})
