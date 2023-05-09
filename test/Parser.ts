import * as assert from 'assert'
import * as O from 'fp-ts/lib/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import * as ast from 'ts-morph'

import * as C from '../src/Config'
import * as E from '../src/Example'
import * as FS from '../src/FileSystem'
import * as L from '../src/Logger'
import * as _ from '../src/Parser'

import { assertLeft, assertRight } from './util'

let testCounter = 0

const project = new ast.Project({
  compilerOptions: { strict: true },
  useInMemoryFileSystem: true
})

const addFileToProject = (file: FS.File) => (project: ast.Project) =>
  project.createSourceFile(file.path, file.content, { overwrite: file.overwrite })

const settings: C.Settings = {
  projectName: 'docs-ts',
  projectHomepage: 'https://github.com/gcanti/docs-ts',
  srcDir: 'src',
  outDir: 'docs',
  theme: 'pmarsceill/just-the-docs',
  enableSearch: true,
  enforceDescriptions: false,
  enforceExamples: false,
  enforceVersion: true,
  exclude: RA.empty,
  compilerOptions: {}
}

const getTestEnv = (sourceText: string): _.ParserEnv => ({
  path: ['test'],
  sourceFile: project.createSourceFile(`test-${testCounter++}.ts`, sourceText),
  example: E.Example,
  fileSystem: FS.FileSystem,
  logger: L.Logger,
  settings,
  addFile: addFileToProject
})

describe.concurrent('Parser', () => {
  describe.concurrent('parsers', () => {
    describe.concurrent('parseInterfaces', () => {
      it('should return no `Interface`s if the file is empty', () => {
        const env = getTestEnv('')

        assertRight(pipe(env, _.parseInterfaces), (actual) => assert.deepStrictEqual(actual, RA.empty))
      })

      it('should return no `Interface`s if there are no exported interfaces', () => {
        const env = getTestEnv('interface A {}')

        assertRight(pipe(env, _.parseInterfaces), (actual) => assert.deepStrictEqual(actual, RA.empty))
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
        assertRight(pipe(env, _.parseInterfaces), (actual) =>
          assert.deepStrictEqual(
            actual,
            RA.of({
              _tag: 'Interface',
              deprecated: true,
              description: O.some('a description...'),
              name: 'A',
              signature: 'export interface A {}',
              since: O.some('1.0.0'),
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
        assertRight(pipe(env, _.parseInterfaces), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Interface',
              name: 'A',
              description: O.none,
              since: O.some('1.0.0'),
              deprecated: false,
              category: O.none,
              examples: RA.empty,
              signature: 'export interface A {}'
            },
            {
              _tag: 'Interface',
              name: 'B',
              description: O.none,
              since: O.some('1.0.0'),
              deprecated: false,
              category: O.none,
              examples: RA.empty,
              signature: 'export interface B {}'
            }
          ])
        )
      })
    })

    describe.concurrent('parseFunctions', () => {
      it('should raise an error if the function is anonymous', () => {
        const env = getTestEnv(`export function(a: number, b: number): number { return a + b }`)
        const expected = 'Missing function name in module test'

        assertLeft(pipe(env, _.parseFunctions), (error) => assert.strictEqual(error, expected))
      })

      it('should not return private function declarations', () => {
        const env = getTestEnv(`function sum(a: number, b: number): number { return a + b }`)

        assertRight(pipe(env, _.parseFunctions), (actual) => assert.deepStrictEqual(actual, RA.empty))
      })

      it('should not return ignored function declarations', () => {
        const env = getTestEnv(
          `/**
            * @ignore
            */
            export function sum(a: number, b: number): number { return a + b }`
        )

        assertRight(pipe(env, _.parseFunctions), (actual) => assert.deepStrictEqual(actual, RA.empty))
      })

      it('should not return ignored function declarations with overloads', () => {
        const env = getTestEnv(
          `/**
            * @ignore
            */
            export function sum(a: number, b: number)
            export function sum(a: number, b: number): number { return a + b }`
        )

        assertRight(pipe(env, _.parseFunctions), (actual) => assert.deepStrictEqual(actual, RA.empty))
      })

      it('should not return internal function declarations', () => {
        const env = getTestEnv(
          `/**
            * @internal
            */
            export function sum(a: number, b: number): number { return a + b }`
        )

        assertRight(pipe(env, _.parseFunctions), (actual) => assert.deepStrictEqual(actual, RA.empty))
      })

      it('should not return internal function declarations even with overloads', () => {
        const env = getTestEnv(
          `/**
            * @internal
            */
            export function sum(a: number, b: number)
            export function sum(a: number, b: number): number { return a + b }`
        )

        assertRight(pipe(env, _.parseFunctions), (actual) => assert.deepStrictEqual(actual, RA.empty))
      })

      it('should not return private const function declarations', () => {
        const env = getTestEnv(`const sum = (a: number, b: number): number => a + b `)

        assertRight(pipe(env, _.parseFunctions), (actual) => assert.deepStrictEqual(actual, RA.empty))
      })

      it('should not return internal const function declarations', () => {
        const env = getTestEnv(
          `/**
            * @internal
            */
            export const sum = (a: number, b: number): number => a + b `
        )

        assertRight(pipe(env, _.parseFunctions), (actual) => assert.deepStrictEqual(actual, RA.empty))
      })

      it('should account for nullable polymorphic return types', () => {
        const env = getTestEnv(
          `/**
            * @since 1.0.0
            */
           export const toNullable = <A>(ma: A | null): A | null => ma`
        )

        assertRight(pipe(env, _.parseFunctions), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Function',
              deprecated: false,
              description: O.none,
              name: 'toNullable',
              signatures: ['export declare const toNullable: <A>(ma: A | null) => A | null'],
              since: O.some('1.0.0'),
              examples: [],
              category: O.none
            }
          ])
        )
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

        assertRight(pipe(env, _.parseFunctions), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Function',
              deprecated: true,
              description: O.some('a description...'),
              name: 'f',
              signatures: ['export declare const f: (a: number, b: number) => { [key: string]: number; }'],
              since: O.some('1.0.0'),
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

        assertRight(pipe(env, _.parseFunctions), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Function',
              deprecated: false,
              description: O.none,
              name: 'f',
              signatures: ['export declare function f(a: number, b: number): { [key: string]: number }'],
              since: O.some('1.0.0'),
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

        assertRight(pipe(env, _.parseFunctions), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Function',
              deprecated: true,
              description: O.some('a description...'),
              name: 'f',
              signatures: ['export declare function f(a: number, b: number): { [key: string]: number }'],
              since: O.some('1.0.0'),
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

        assertRight(pipe(env, _.parseFunctions), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Function',
              name: 'f',
              description: O.some('a description...'),
              since: O.some('1.0.0'),
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

    describe.concurrent('parseTypeAlias', () => {
      it('should return a `TypeAlias`', () => {
        const env = getTestEnv(
          `/**
            * a description...
            * @since 1.0.0
            * @deprecated
            */
            export type Option<A> = None<A> | Some<A>`
        )

        assertRight(pipe(env, _.parseTypeAliases), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'TypeAlias',
              name: 'Option',
              description: O.some('a description...'),
              since: O.some('1.0.0'),
              deprecated: true,
              category: O.none,
              signature: 'export type Option<A> = None<A> | Some<A>',
              examples: RA.empty
            }
          ])
        )
      })
    })

    describe.concurrent('parseConstants', () => {
      it('should handle a constant value', () => {
        const env = getTestEnv(
          `/**
            * a description...
            * @since 1.0.0
            * @deprecated
            */
            export const s: string = ''`
        )

        assertRight(pipe(env, _.parseConstants), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Constant',
              name: 's',
              description: O.some('a description...'),
              since: O.some('1.0.0'),
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

        assertRight(pipe(env, _.parseConstants), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Constant',
              name: 'left',
              description: O.none,
              since: O.some('1.0.0'),
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
          `
            class A {}
          /**
            * @since 1.0.0
            */
            export const empty = new A()`
        )

        assertRight(pipe(env, _.parseConstants), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Constant',
              name: 'empty',
              description: O.none,
              since: O.some('1.0.0'),
              deprecated: false,
              category: O.none,
              signature: 'export declare const empty: A',
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

        assertRight(pipe(env, _.parseConstants), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Constant',
              deprecated: false,
              description: O.none,
              name: 'taskSeq',
              signature: 'export declare const taskSeq: { a: number; }',
              since: O.some('1.0.0'),
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

        assertRight(pipe(env, _.parseConstants), (actual) => assert.deepStrictEqual(actual, []))
      })
    })

    describe.concurrent('parseClasses', () => {
      it('should raise an error if the class is anonymous', () => {
        const env = getTestEnv(`export class {}`)

        assertLeft(pipe(env, _.parseClasses), (error) => assert.strictEqual(error, 'Missing class name in module test'))
      })

      it('should raise an error if an `@since` tag is missing in a module', () => {
        const env = getTestEnv(`export class MyClass {}`)

        assertLeft(pipe(env, _.parseClasses), (error) =>
          assert.strictEqual(error, 'Missing @since tag in test#MyClass documentation')
        )
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

        assertLeft(pipe(env, _.parseClasses), (error) =>
          assert.strictEqual(error, 'Missing @since tag in test#MyClass#_A documentation')
        )
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

        assertRight(pipe(env, _.parseClasses), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Class',
              name: 'MyClass',
              description: O.none,
              since: O.some('1.0.0'),
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

        assertRight(pipe(env, _.parseClasses), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Class',
              name: 'C',
              description: O.some('description'),
              since: O.some('1.0.0'),
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

      it('should get a constructor declaration signature', () => {
        const env = getTestEnv(`
          /**
           * @since 1.0.0
           */
          declare class A {
            constructor()
          }
        `)

        const constructorDeclaration = env.sourceFile.getClass('A')!.getConstructors()[0]

        assert.deepStrictEqual(_.getConstructorDeclarationSignature(constructorDeclaration), 'constructor()')
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

        assertRight(pipe(env, _.parseClasses), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Class',
              name: 'C',
              description: O.some('description'),
              since: O.some('1.0.0'),
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
                  since: O.some('1.0.0'),
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

        assertRight(pipe(env, _.parseClasses), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Class',
              name: 'Test',
              description: O.some('a class description...'),
              since: O.some('1.0.0'),
              deprecated: true,
              category: O.none,
              examples: RA.empty,
              signature: 'export declare class Test { constructor(readonly value: string) }',
              methods: [
                {
                  name: 'g',
                  description: O.some('a method description...'),
                  since: O.some('1.1.0'),
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
                  since: O.some('1.1.0'),
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
                  since: O.some('1.1.0'),
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

        assertRight(pipe(env, _.parseClasses), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Class',
              name: 'Test',
              description: O.some('a class description...'),
              since: O.some('1.0.0'),
              deprecated: true,
              category: O.none,
              examples: RA.empty,
              signature: 'export declare class Test<A> { constructor(readonly value: A) }',
              methods: [
                {
                  name: 'map',
                  description: O.some('a method description...'),
                  since: O.some('1.1.0'),
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
                  since: O.some('1.1.0'),
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

      it('should ignore internal/ignored methods (#42)', () => {
        const env = getTestEnv(
          `/**
            * a class description...
            * @since 1.0.0
            */
            export class Test<A> {
              /**
               * @since 0.0.1
               * @internal
               **/
              private foo(): void {}
              /**
               * @since 0.0.1
               * @ignore
               **/
              private bar(): void {}
            }`
        )

        assertRight(pipe(env, _.parseClasses), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Class',
              name: 'Test',
              description: O.some('a class description...'),
              since: O.some('1.0.0'),
              deprecated: false,
              category: O.none,
              examples: RA.empty,
              signature: 'export declare class Test<A>',
              methods: RA.empty,
              staticMethods: RA.empty,
              properties: RA.empty
            }
          ])
        )
      })
    })

    describe.concurrent('parseModuleDocumentation', () => {
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

        assertRight(pipe(env, _.parseModuleDocumentation), (actual) =>
          assert.deepStrictEqual(actual, {
            name: 'test',
            description: O.some('Manages the configuration settings for the widget'),
            since: O.some('1.0.0'),
            deprecated: true,
            category: O.none,
            examples: RA.empty
          })
        )
      })

      it('should return an error when documentation is enforced but no documentation is provided', () => {
        const env = getTestEnv('export const a: number = 1')

        assertLeft(pipe(env, _.parseModuleDocumentation), (actual) =>
          assert.strictEqual(actual, 'Missing documentation in test module')
        )
      })

      it('should support absence of module documentation when no documentation is enforced', () => {
        const defaultEnv = getTestEnv('export const a: number = 1')
        const env = { ...defaultEnv, settings: { ...defaultEnv.settings, enforceVersion: false } }

        assertRight(pipe(env, _.parseModuleDocumentation), (actual) =>
          assert.deepStrictEqual(actual, {
            name: 'test',
            description: O.none,
            since: O.none,
            deprecated: false,
            category: O.none,
            examples: RA.empty
          })
        )
      })
    })

    describe.concurrent('parseExports', () => {
      it('should return no `Export`s if the file is empty', () => {
        const env = getTestEnv('')

        assertRight(pipe(env, _.parseExports), (actual) => assert.deepStrictEqual(actual, RA.empty))
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

        assertRight(pipe(env, _.parseExports), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Export',
              name: 'b',
              description: O.none,
              deprecated: false,
              since: O.some('1.0.0'),
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

        assertRight(pipe(env, _.parseExports), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Export',
              name: 'a',
              description: O.some('description_of_a'),
              since: O.some('1.0.0'),
              deprecated: false,
              category: O.none,
              signature: 'export declare const a: any',
              examples: RA.empty
            },
            {
              _tag: 'Export',
              name: 'b',
              description: O.some('description_of_b'),
              since: O.some('2.0.0'),
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

        assertLeft(pipe(env, _.parseExports), (error) => assert.strictEqual(error, 'Missing a documentation in test'))
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

        assertRight(
          pipe(
            {
              path: ['test'],
              sourceFile,
              example: E.Example,
              fileSystem: FS.FileSystem,
              logger: L.Logger,
              settings,
              addFile: addFileToProject
            },
            _.parseExports
          ),
          (actual) =>
            assert.deepStrictEqual(actual, [
              {
                _tag: 'Export',
                name: 'b',
                description: O.none,
                since: O.some('1.0.0'),
                deprecated: false,
                signature: 'export declare const b: 1',
                category: O.none,
                examples: RA.empty
              }
            ])
        )
      })
    })

    describe.concurrent('parseModule', () => {
      it('should raise an error if `@since` tag is missing', async () => {
        const env = getTestEnv(`import * as assert from 'assert'`)

        assertLeft(pipe(env, _.parseModule), (error) =>
          assert.strictEqual(error, 'Missing documentation in test module')
        )
      })

      it('should not require an example for modules when `enforceExamples` is set to true (#38)', () => {
        const env = getTestEnv(`/**
* This is the assert module.
*
* @since 1.0.0
*/
import * as assert from 'assert'

/**
 * This is the foo export.
 *
 * @example
 * import { foo } from 'test'
 *
 * console.log(foo)
 *
 * @category foo
 * @since 1.0.0
 */
export const foo = 'foo'`)

        assertRight(pipe({ ...env, settings: { ...env.settings, enforceExamples: true } }, _.parseModule), (actual) =>
          assert.deepStrictEqual(actual, {
            name: 'test',
            description: O.some('This is the assert module.'),
            since: O.some('1.0.0'),
            deprecated: false,
            examples: RA.empty,
            category: O.none,
            path: ['test'],
            classes: RA.empty,
            interfaces: RA.empty,
            functions: RA.empty,
            typeAliases: RA.empty,
            constants: [
              {
                _tag: 'Constant',
                name: 'foo',
                description: O.some('This is the foo export.'),
                since: O.some('1.0.0'),
                deprecated: false,
                examples: [`import { foo } from 'test'\n\nconsole.log(foo)`],
                category: O.some('foo'),
                signature: 'export declare const foo: "foo"'
              }
            ],
            exports: RA.empty
          })
        )
      })
    })

    describe.concurrent('parseFile', () => {
      it('should not parse a non-existent file', async () => {
        const file = FS.File('non-existent.ts', '')
        const project = new ast.Project({ useInMemoryFileSystem: true })

        assertLeft(
          await pipe(
            {
              example: E.Example,
              fileSystem: FS.FileSystem,
              logger: L.Logger,
              settings,
              addFile: addFileToProject
            },
            _.parseFile(project)(file)
          )(),
          (error) => assert.strictEqual(error, 'Unable to locate file: non-existent.ts')
        )
      })
    })

    describe.concurrent('parseFiles', () => {
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

        assertRight(
          await pipe(
            {
              example: E.Example,
              fileSystem: FS.FileSystem,
              logger: L.Logger,
              settings,
              addFile: addFileToProject
            },
            _.parseFiles(files)
          )(),
          (actual) =>
            assert.deepStrictEqual(actual, [
              {
                name: 'test1',
                path: ['test', 'fixtures', 'test1.ts'],
                description: O.some('a description...'),
                since: O.some('1.0.0'),
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
                    since: O.some('1.0.0'),
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
    })
  })

  describe.concurrent('utils', () => {
    describe.concurrent('getCommentInfo', () => {
      it('should parse comment information', () => {
        const env = getTestEnv('')

        const text = `/**
* description
* @category instances
* @since 1.0.0
*/`

        assertRight(pipe(env, _.getCommentInfo('name')(text)), (actual) =>
          assert.deepStrictEqual(actual, {
            description: O.some('description'),
            since: O.some('1.0.0'),
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

        assertLeft(pipe(env, _.getCommentInfo('name')(text)), (error) =>
          assert.strictEqual(error, 'Missing @category value in test#name documentation')
        )
      })

      it('should require a description if `enforceDescriptions` is set to true', () => {
        const env = getTestEnv('')

        const text = `/**
* @category instances
* @since 1.0.0
*/`

        assertLeft(
          pipe({ ...env, settings: { ...env.settings, enforceDescriptions: true } }, _.getCommentInfo('name')(text)),
          (error) => assert.strictEqual(error, 'Missing description in test#name documentation')
        )
      })

      it('should require at least one example if `enforceExamples` is set to true', () => {
        const env = getTestEnv('')

        const text = `/**
* description
* @category instances
* @since 1.0.0
*/`

        assertLeft(
          pipe({ ...env, settings: { ...env.settings, enforceExamples: true } }, _.getCommentInfo('name')(text)),
          (error) => assert.strictEqual(error, 'Missing examples in test#name documentation')
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

        assertLeft(
          pipe({ ...env, settings: { ...env.settings, enforceExamples: true } }, _.getCommentInfo('name')(text)),
          (error) => assert.strictEqual(error, 'Missing examples in test#name documentation')
        )
      })

      it('should allow no since tag if `enforceVersion` is set to false', () => {
        const env = getTestEnv('')

        const text = `/**
* description
* @category instances
*/`

        assertRight(
          pipe({ ...env, settings: { ...env.settings, enforceVersion: false } }, _.getCommentInfo('name')(text)),
          (actual) =>
            assert.deepStrictEqual(actual, {
              description: O.some('description'),
              since: O.none,
              category: O.some('instances'),
              deprecated: false,
              examples: RA.empty
            })
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
