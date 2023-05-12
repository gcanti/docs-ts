import * as Either from '@effect/data/Either'
import * as Option from '@effect/data/Option'
import * as assert from 'assert'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as RA from 'fp-ts/ReadonlyArray'
import * as ast from 'ts-morph'

import * as _ from '../src/internal'
import * as Parser from '../src/Parser'
import { assertLeft, assertRight } from './util'

let testCounter = 0

const project = new ast.Project({
  compilerOptions: { strict: true },
  useInMemoryFileSystem: true
})

const config: _.Config = {
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
  parseCompilerOptions: {},
  examplesCompilerOptions: {}
}

const getTestEnv = (sourceText: string): Parser.ParserEnv => ({
  path: ['test'],
  sourceFile: project.createSourceFile(`test-${testCounter++}.ts`, sourceText),
  config
})

describe.concurrent('Parser', () => {
  describe.concurrent('parsers', () => {
    describe.concurrent('parseInterfaces', () => {
      it('should return no `Interface`s if the file is empty', () => {
        const env = getTestEnv('')

        assert.deepStrictEqual(Parser.parseInterfaces(env), E.right(RA.empty))
      })

      it('should return no `Interface`s if there are no exported interfaces', () => {
        const env = getTestEnv('interface A {}')

        assert.deepStrictEqual(Parser.parseInterfaces(env), E.right(RA.empty))
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
          Parser.parseInterfaces(env),
          E.right([
            {
              _tag: 'Interface',
              deprecated: true,
              description: Option.some('a description...'),
              name: 'A',
              signature: 'export interface A {}',
              since: Option.some('1.0.0'),
              examples: RA.empty,
              category: Option.none()
            }
          ])
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
          Parser.parseInterfaces(env),
          E.right([
            {
              _tag: 'Interface',
              name: 'A',
              description: Option.none(),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
              examples: RA.empty,
              signature: 'export interface A {}'
            },
            {
              _tag: 'Interface',
              name: 'B',
              description: Option.none(),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
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

        assertLeft(pipe(env, Parser.parseFunctions), (error) => assert.strictEqual(error, expected))
      })

      it('should not return private function declarations', () => {
        const env = getTestEnv(`function sum(a: number, b: number): number { return a + b }`)

        assert.deepStrictEqual(Parser.parseFunctions(env), E.right(RA.empty))
      })

      it('should not return ignored function declarations', () => {
        const env = getTestEnv(
          `/**
            * @ignore
            */
            export function sum(a: number, b: number): number { return a + b }`
        )

        assert.deepStrictEqual(Parser.parseFunctions(env), E.right(RA.empty))
      })

      it('should not return ignored function declarations with overloads', () => {
        const env = getTestEnv(
          `/**
            * @ignore
            */
            export function sum(a: number, b: number)
            export function sum(a: number, b: number): number { return a + b }`
        )

        assert.deepStrictEqual(Parser.parseFunctions(env), E.right(RA.empty))
      })

      it('should not return internal function declarations', () => {
        const env = getTestEnv(
          `/**
            * @internal
            */
            export function sum(a: number, b: number): number { return a + b }`
        )

        assert.deepStrictEqual(Parser.parseFunctions(env), E.right(RA.empty))
      })

      it('should not return internal function declarations even with overloads', () => {
        const env = getTestEnv(
          `/**
            * @internal
            */
            export function sum(a: number, b: number)
            export function sum(a: number, b: number): number { return a + b }`
        )

        assert.deepStrictEqual(Parser.parseFunctions(env), E.right(RA.empty))
      })

      it('should not return private const function declarations', () => {
        const env = getTestEnv(`const sum = (a: number, b: number): number => a + b `)

        assertRight(pipe(env, Parser.parseFunctions), (actual) => assert.deepStrictEqual(actual, RA.empty))
      })

      it('should not return internal const function declarations', () => {
        const env = getTestEnv(
          `/**
            * @internal
            */
            export const sum = (a: number, b: number): number => a + b `
        )

        assert.deepStrictEqual(Parser.parseFunctions(env), E.right(RA.empty))
      })

      it('should account for nullable polymorphic return types', () => {
        const env = getTestEnv(
          `/**
            * @since 1.0.0
            */
           export const toNullable = <A>(ma: A | null): A | null => ma`
        )

        assert.deepStrictEqual(
          Parser.parseFunctions(env),
          E.right([
            {
              _tag: 'Function',
              deprecated: false,
              description: Option.none(),
              name: 'toNullable',
              signatures: ['export declare const toNullable: <A>(ma: A | null) => A | null'],
              since: Option.some('1.0.0'),
              examples: [],
              category: Option.none()
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

        assert.deepStrictEqual(
          Parser.parseFunctions(env),
          E.right([
            {
              _tag: 'Function',
              deprecated: true,
              description: Option.some('a description...'),
              name: 'f',
              signatures: ['export declare const f: (a: number, b: number) => { [key: string]: number; }'],
              since: Option.some('1.0.0'),
              examples: [
                'assert.deepStrictEqual(f(1, 2), { a: 1, b: 2 })',
                'assert.deepStrictEqual(f(3, 4), { a: 3, b: 4 })'
              ],
              category: Option.none()
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
          Parser.parseFunctions(env),
          E.right([
            {
              _tag: 'Function',
              deprecated: false,
              description: Option.none(),
              name: 'f',
              signatures: ['export declare function f(a: number, b: number): { [key: string]: number }'],
              since: Option.some('1.0.0'),
              examples: RA.empty,
              category: Option.none()
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
          Parser.parseFunctions(env),
          E.right([
            {
              _tag: 'Function',
              deprecated: true,
              description: Option.some('a description...'),
              name: 'f',
              signatures: ['export declare function f(a: number, b: number): { [key: string]: number }'],
              since: Option.some('1.0.0'),
              examples: RA.empty,
              category: Option.none()
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
          Parser.parseFunctions(env),
          E.right([
            {
              _tag: 'Function',
              name: 'f',
              description: Option.some('a description...'),
              since: Option.some('1.0.0'),
              deprecated: true,
              category: Option.none(),
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

        assertRight(pipe(env, Parser.parseTypeAliases), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'TypeAlias',
              name: 'Option',
              description: Option.some('a description...'),
              since: Option.some('1.0.0'),
              deprecated: true,
              category: Option.none(),
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

        assertRight(pipe(env, Parser.parseConstants), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Constant',
              name: 's',
              description: Option.some('a description...'),
              since: Option.some('1.0.0'),
              deprecated: true,
              category: Option.none(),
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

        assertRight(pipe(env, Parser.parseConstants), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Constant',
              name: 'left',
              description: Option.none(),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
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

        assertRight(pipe(env, Parser.parseConstants), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Constant',
              name: 'empty',
              description: Option.none(),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
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

        assertRight(pipe(env, Parser.parseConstants), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Constant',
              deprecated: false,
              description: Option.none(),
              name: 'taskSeq',
              signature: 'export declare const taskSeq: { a: number; }',
              since: Option.some('1.0.0'),
              examples: RA.empty,
              category: Option.none()
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

        assertRight(pipe(env, Parser.parseConstants), (actual) => assert.deepStrictEqual(actual, []))
      })
    })

    describe.concurrent('parseClasses', () => {
      it('should raise an error if the class is anonymous', () => {
        const env = getTestEnv(`export class {}`)

        assertLeft(pipe(env, Parser.parseClasses), (error) =>
          assert.strictEqual(error, 'Missing class name in module test')
        )
      })

      it('should raise an error if an `@since` tag is missing in a module', () => {
        const env = getTestEnv(`export class MyClass {}`)

        assertLeft(pipe(env, Parser.parseClasses), (error) =>
          assert.strictEqual(error, 'Missing "@since" tag in test#MyClass documentation')
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

        assertLeft(pipe(env, Parser.parseClasses), (error) =>
          assert.strictEqual(error, 'Missing "@since" tag in test#MyClass#_A documentation')
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

        assertRight(pipe(env, Parser.parseClasses), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Class',
              name: 'MyClass',
              description: Option.none(),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
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

        assertRight(pipe(env, Parser.parseClasses), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Class',
              name: 'C',
              description: Option.some('description'),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
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

        assert.deepStrictEqual(Parser.getConstructorDeclarationSignature(constructorDeclaration), 'constructor()')
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

        assertRight(pipe(env, Parser.parseClasses), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Class',
              name: 'C',
              description: Option.some('description'),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
              examples: RA.empty,
              signature: 'export declare class C',
              methods: RA.empty,
              staticMethods: RA.empty,
              properties: [
                {
                  name: 'a',
                  description: Option.none(),
                  since: Option.some('1.0.0'),
                  deprecated: false,
                  category: Option.none(),
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

        assertRight(pipe(env, Parser.parseClasses), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Class',
              name: 'Test',
              description: Option.some('a class description...'),
              since: Option.some('1.0.0'),
              deprecated: true,
              category: Option.none(),
              examples: RA.empty,
              signature: 'export declare class Test { constructor(readonly value: string) }',
              methods: [
                {
                  name: 'g',
                  description: Option.some('a method description...'),
                  since: Option.some('1.1.0'),
                  deprecated: true,
                  category: Option.none(),
                  examples: RA.empty,
                  signatures: ['g(a: number, b: number): { [key: string]: number }']
                }
              ],
              staticMethods: [
                {
                  name: 'f',
                  description: Option.some('a static method description...'),
                  since: Option.some('1.1.0'),
                  deprecated: true,
                  category: Option.none(),
                  examples: RA.empty,
                  signatures: ['static f(): void']
                }
              ],
              properties: [
                {
                  name: 'a',
                  description: Option.some('a property...'),
                  since: Option.some('1.1.0'),
                  deprecated: true,
                  category: Option.none(),
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

        assertRight(pipe(env, Parser.parseClasses), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Class',
              name: 'Test',
              description: Option.some('a class description...'),
              since: Option.some('1.0.0'),
              deprecated: true,
              category: Option.none(),
              examples: RA.empty,
              signature: 'export declare class Test<A> { constructor(readonly value: A) }',
              methods: [
                {
                  name: 'map',
                  description: Option.some('a method description...'),
                  since: Option.some('1.1.0'),
                  deprecated: true,
                  category: Option.none(),
                  examples: RA.empty,
                  signatures: ['map(f: (a: number) => number): Test', 'map(f: (a: string) => string): Test']
                }
              ],
              staticMethods: [
                {
                  name: 'f',
                  description: Option.some('a static method description...'),
                  since: Option.some('1.1.0'),
                  deprecated: true,
                  category: Option.none(),
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

        assertRight(pipe(env, Parser.parseClasses), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Class',
              name: 'Test',
              description: Option.some('a class description...'),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
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

        assertRight(pipe(env, Parser.parseModuleDocumentation), (actual) =>
          assert.deepStrictEqual(actual, {
            name: 'test',
            description: Option.some('Manages the configuration settings for the widget'),
            since: Option.some('1.0.0'),
            deprecated: true,
            category: Option.none(),
            examples: RA.empty
          })
        )
      })

      it('should return an error when documentation is enforced but no documentation is provided', () => {
        const env = getTestEnv('export const a: number = 1')

        assertLeft(pipe(env, Parser.parseModuleDocumentation), (actual) =>
          assert.strictEqual(actual, 'Missing documentation in test module')
        )
      })

      it('should support absence of module documentation when no documentation is enforced', () => {
        const defaultEnv = getTestEnv('export const a: number = 1')
        const env: Parser.ParserEnv = { ...defaultEnv, config: { ...defaultEnv.config, enforceVersion: false } }

        assert.deepStrictEqual(
          pipe(env, Parser.parseModuleDocumentation),
          Either.right({
            name: 'test',
            description: Option.none(),
            since: Option.none(),
            deprecated: false,
            category: Option.none(),
            examples: RA.empty
          })
        )
      })
    })

    describe.concurrent('parseExports', () => {
      it('should return no `Export`s if the file is empty', () => {
        const env = getTestEnv('')

        assertRight(pipe(env, Parser.parseExports), (actual) => assert.deepStrictEqual(actual, RA.empty))
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

        assertRight(pipe(env, Parser.parseExports), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Export',
              name: 'b',
              description: Option.none(),
              deprecated: false,
              since: Option.some('1.0.0'),
              category: Option.none(),
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

        assertRight(pipe(env, Parser.parseExports), (actual) =>
          assert.deepStrictEqual(actual, [
            {
              _tag: 'Export',
              name: 'a',
              description: Option.some('description_of_a'),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
              signature: 'export declare const a: any',
              examples: RA.empty
            },
            {
              _tag: 'Export',
              name: 'b',
              description: Option.some('description_of_b'),
              since: Option.some('2.0.0'),
              deprecated: false,
              category: Option.none(),
              signature: 'export declare const b: any',
              examples: RA.empty
            }
          ])
        )
      })

      it('should raise an error if `@since` tag is missing in export', () => {
        const env = getTestEnv('export { a }')

        assertLeft(pipe(env, Parser.parseExports), (error) =>
          assert.strictEqual(error, 'Missing a documentation in test')
        )
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
              config
            },
            Parser.parseExports
          ),
          (actual) =>
            assert.deepStrictEqual(actual, [
              {
                _tag: 'Export',
                name: 'b',
                description: Option.none(),
                since: Option.some('1.0.0'),
                deprecated: false,
                signature: 'export declare const b: 1',
                category: Option.none(),
                examples: RA.empty
              }
            ])
        )
      })
    })

    describe.concurrent('parseModule', () => {
      it('should raise an error if `@since` tag is missing', async () => {
        const env = getTestEnv(`import * as assert from 'assert'`)

        assertLeft(pipe(env, Parser.parseModule), (error) =>
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

        assertRight(pipe({ ...env, config: { ...env.config, enforceExamples: true } }, Parser.parseModule), (actual) =>
          assert.deepStrictEqual(actual, {
            name: 'test',
            description: Option.some('This is the assert module.'),
            since: Option.some('1.0.0'),
            deprecated: false,
            examples: RA.empty,
            category: Option.none(),
            path: ['test'],
            classes: RA.empty,
            interfaces: RA.empty,
            functions: RA.empty,
            typeAliases: RA.empty,
            constants: [
              {
                _tag: 'Constant',
                name: 'foo',
                description: Option.some('This is the foo export.'),
                since: Option.some('1.0.0'),
                deprecated: false,
                examples: [`import { foo } from 'test'\n\nconsole.log(foo)`],
                category: Option.some('foo'),
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
        const file = _.createFile('non-existent.ts', '')
        const project = new ast.Project({ useInMemoryFileSystem: true })

        assertLeft(await pipe(config, Parser.parseFile(project)(file))(), (error) =>
          assert.strictEqual(error, 'Unable to locate file: non-existent.ts')
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

        assertRight(pipe(env, Parser.getCommentInfo('name')(text)), (actual) =>
          assert.deepStrictEqual(actual, {
            description: Option.some('description'),
            since: Option.some('1.0.0'),
            category: Option.some('instances'),
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

        assertLeft(pipe(env, Parser.getCommentInfo('name')(text)), (error) =>
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
          pipe({ ...env, config: { ...env.config, enforceDescriptions: true } }, Parser.getCommentInfo('name')(text)),
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
          pipe({ ...env, config: { ...env.config, enforceExamples: true } }, Parser.getCommentInfo('name')(text)),
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
          pipe({ ...env, config: { ...env.config, enforceExamples: true } }, Parser.getCommentInfo('name')(text)),
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
          pipe({ ...env, config: { ...env.config, enforceVersion: false } }, Parser.getCommentInfo('name')(text)),
          (actual) =>
            assert.deepStrictEqual(actual, {
              description: Option.some('description'),
              since: Option.none(),
              category: Option.some('instances'),
              deprecated: false,
              examples: RA.empty
            })
        )
      })
    })

    it('parseComment', () => {
      assert.deepStrictEqual(Parser.parseComment(''), {
        description: Option.none(),
        tags: {}
      })

      assert.deepStrictEqual(Parser.parseComment('/** description */'), {
        description: Option.some('description'),
        tags: {}
      })

      assert.deepStrictEqual(Parser.parseComment('/** description\n * @since 1.0.0\n */'), {
        description: Option.some('description'),
        tags: {
          since: [Option.some('1.0.0')]
        }
      })

      assert.deepStrictEqual(Parser.parseComment('/** description\n * @deprecated\n */'), {
        description: Option.some('description'),
        tags: {
          deprecated: [Option.none()]
        }
      })

      assert.deepStrictEqual(Parser.parseComment('/** description\n * @category instance\n */'), {
        description: Option.some('description'),
        tags: {
          category: [Option.some('instance')]
        }
      })
    })

    it('stripImportTypes', () => {
      assert.strictEqual(
        Parser.stripImportTypes(
          '{ <E, A, B>(refinement: import("/Users/giulio/Documents/Projects/github/fp-ts/src/function").Refinement<A, B>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, B>; <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, A>; }'
        ),
        '{ <E, A, B>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, B>; <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, A>; }'
      )
      assert.strictEqual(
        Parser.stripImportTypes(
          '{ <A, B>(refinementWithIndex: import("/Users/giulio/Documents/Projects/github/fp-ts/src/FilterableWithIndex").RefinementWithIndex<number, A, B>): (fa: A[]) => B[]; <A>(predicateWithIndex: import("/Users/giulio/Documents/Projects/github/fp-ts/src/FilterableWithIndex").PredicateWithIndex<number, A>): (fa: A[]) => A[]; }'
        ),
        '{ <A, B>(refinementWithIndex: RefinementWithIndex<number, A, B>): (fa: A[]) => B[]; <A>(predicateWithIndex: PredicateWithIndex<number, A>): (fa: A[]) => A[]; }'
      )
    })
  })
})
