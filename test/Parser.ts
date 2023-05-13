import * as Either from '@effect/data/Either'
import { pipe } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import * as Effect from '@effect/io/Effect'
import * as assert from 'assert'
import * as E from 'fp-ts/Either'
import * as ast from 'ts-morph'

import * as _ from '../src/internal'
import * as Parser from '../src/Parser'
import { Config } from '../src/Service'

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
  exclude: [],
  parseCompilerOptions: {},
  examplesCompilerOptions: {}
}

const getTestEnv = (sourceText: string): Parser.ParserEnv => ({
  path: ['test'],
  sourceFile: project.createSourceFile(`test-${testCounter++}.ts`, sourceText),
  config
})

const expectLeft = <A>(sourceText: string, eff: Parser.ParserEffect<A>, left: Array<string>) => {
  const actual = eff(getTestEnv(sourceText))
  if (Either.isEither(actual)) {
    expect(actual).toEqual(Either.left(left))
  } else {
    expect(actual).toEqual(E.left(left))
  }
}

const expectRight = <A>(sourceText: string, eff: Parser.ParserEffect<A>, a: A) => {
  const actual = eff(getTestEnv(sourceText))
  if (Either.isEither(actual)) {
    expect(actual).toEqual(Either.right(a))
  } else {
    expect(actual).toEqual(E.right(a))
  }
}

describe.concurrent('Parser', () => {
  describe.concurrent('parsers', () => {
    describe.concurrent('parseInterfaces', () => {
      it('should return no `Interface`s if the file is empty', () => {
        const env = getTestEnv('')

        assert.deepStrictEqual(Parser.parseInterfaces(env), E.right([]))
      })

      it('should return no `Interface`s if there are no exported interfaces', () => {
        const env = getTestEnv('interface A {}')

        assert.deepStrictEqual(Parser.parseInterfaces(env), E.right([]))
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
              examples: [],
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
              examples: [],
              signature: 'export interface A {}'
            },
            {
              _tag: 'Interface',
              name: 'B',
              description: Option.none(),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
              examples: [],
              signature: 'export interface B {}'
            }
          ])
        )
      })
    })

    describe.concurrent('parseFunctions', () => {
      it('should raise an error if the function is anonymous', () => {
        expectLeft(`export function(a: number, b: number): number { return a + b }`, Parser.parseFunctions, [
          'Missing function name in module test'
        ])
      })

      it('should not return private function declarations', () => {
        const env = getTestEnv(`function sum(a: number, b: number): number { return a + b }`)

        expect(Parser.parseFunctions(env)).toEqual(E.right([]))
      })

      it('should not return ignored function declarations', () => {
        const env = getTestEnv(
          `/**
            * @ignore
            */
            export function sum(a: number, b: number): number { return a + b }`
        )

        expect(Parser.parseFunctions(env)).toEqual(E.right([]))
      })

      it('should not return ignored function declarations with overloads', () => {
        const env = getTestEnv(
          `/**
            * @ignore
            */
            export function sum(a: number, b: number)
            export function sum(a: number, b: number): number { return a + b }`
        )

        expect(Parser.parseFunctions(env)).toEqual(E.right([]))
      })

      it('should not return internal function declarations', () => {
        const env = getTestEnv(
          `/**
            * @internal
            */
            export function sum(a: number, b: number): number { return a + b }`
        )

        expect(Parser.parseFunctions(env)).toEqual(E.right([]))
      })

      it('should not return internal function declarations even with overloads', () => {
        const env = getTestEnv(
          `/**
            * @internal
            */
            export function sum(a: number, b: number)
            export function sum(a: number, b: number): number { return a + b }`
        )

        expect(Parser.parseFunctions(env)).toEqual(E.right([]))
      })

      it('should not return private const function declarations', () => {
        const env = getTestEnv(`const sum = (a: number, b: number): number => a + b `)

        expect(Parser.parseFunctions(env)).toEqual(E.right([]))
      })

      it('should not return internal const function declarations', () => {
        const env = getTestEnv(
          `/**
            * @internal
            */
            export const sum = (a: number, b: number): number => a + b `
        )

        expect(Parser.parseFunctions(env)).toEqual(E.right([]))
      })

      it('should account for nullable polymorphic return types', () => {
        const env = getTestEnv(
          `/**
            * @since 1.0.0
            */
           export const toNullable = <A>(ma: A | null): A | null => ma`
        )

        expect(Parser.parseFunctions(env)).toEqual(
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

        expect(Parser.parseFunctions(env)).toEqual(
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

        expect(Parser.parseFunctions(env)).toEqual(
          E.right([
            {
              _tag: 'Function',
              deprecated: false,
              description: Option.none(),
              name: 'f',
              signatures: ['export declare function f(a: number, b: number): { [key: string]: number }'],
              since: Option.some('1.0.0'),
              examples: [],
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

        expect(Parser.parseFunctions(env)).toEqual(
          E.right([
            {
              _tag: 'Function',
              deprecated: true,
              description: Option.some('a description...'),
              name: 'f',
              signatures: ['export declare function f(a: number, b: number): { [key: string]: number }'],
              since: Option.some('1.0.0'),
              examples: [],
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

        expect(Parser.parseFunctions(env)).toEqual(
          E.right([
            {
              _tag: 'Function',
              name: 'f',
              description: Option.some('a description...'),
              since: Option.some('1.0.0'),
              deprecated: true,
              category: Option.none(),
              examples: [],
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

        expect(Parser.parseTypeAliases(env)).toEqual(
          E.right([
            {
              _tag: 'TypeAlias',
              name: 'Option',
              description: Option.some('a description...'),
              since: Option.some('1.0.0'),
              deprecated: true,
              category: Option.none(),
              signature: 'export type Option<A> = None<A> | Some<A>',
              examples: []
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

        expect(Parser.parseConstants(env)).toEqual(
          E.right([
            {
              _tag: 'Constant',
              name: 's',
              description: Option.some('a description...'),
              since: Option.some('1.0.0'),
              deprecated: true,
              category: Option.none(),
              signature: 'export declare const s: string',
              examples: []
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

        expect(Parser.parseConstants(env)).toEqual(
          E.right([
            {
              _tag: 'Constant',
              name: 'left',
              description: Option.none(),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
              signature: 'export declare const left: <E = never, A = never>(l: E) => string',
              examples: []
            }
          ])
        )
      })

      it('should support untyped constants', () => {
        expectRight(
          `
        class A {}
      /**
        * @since 1.0.0
        */
        export const empty = new A()`,
          Parser.parseConstants,
          [
            {
              _tag: 'Constant',
              name: 'empty',
              description: Option.none(),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
              signature: 'export declare const empty: A',
              examples: []
            }
          ]
        )
      })

      it('should handle constants with typeof annotations', () => {
        expectRight(
          ` const task: { a: number } = {
          a: 1
        }
        /**
        * @since 1.0.0
        */
        export const taskSeq: typeof task = {
          ...task,
          ap: (mab, ma) => () => mab().then(f => ma().then(a => f(a)))
        }`,
          Parser.parseConstants,
          [
            {
              _tag: 'Constant',
              deprecated: false,
              description: Option.none(),
              name: 'taskSeq',
              signature: 'export declare const taskSeq: { a: number; }',
              since: Option.some('1.0.0'),
              examples: [],
              category: Option.none()
            }
          ]
        )
      })

      it('should not include variables declared in for loops', () => {
        expectRight(
          ` const object = { a: 1, b: 2, c: 3 };

        for (const property in object) {
          console.log(property);
        }`,
          Parser.parseConstants,
          []
        )
      })
    })

    describe.concurrent('parseClasses', () => {
      it('should raise an error if the class is anonymous', () => {
        expectLeft(`export class {}`, Parser.parseClasses, ['Missing class name in module test'])
      })

      it('should raise an error if an `@since` tag is missing in a module', () => {
        expectLeft(`export class MyClass {}`, Parser.parseClasses, ['Missing @since tag in test#MyClass documentation'])
      })

      it('should raise an error if `@since` is missing in a property', () => {
        expectLeft(
          `/**
            * @since 1.0.0
            */
            export class MyClass<A> {
              readonly _A!: A
            }`,
          Parser.parseClasses,
          ['Missing @since tag in test#MyClass#_A documentation']
        )
      })

      it('should skip ignored properties', () => {
        expectRight(
          `/**
        * @since 1.0.0
        */
        export class MyClass<A> {
          /**
           * @ignore
           */
          readonly _A!: A
        }`,
          Parser.parseClasses,
          [
            {
              _tag: 'Class',
              name: 'MyClass',
              description: Option.none(),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
              examples: [],
              signature: 'export declare class MyClass<A>',
              methods: [],
              staticMethods: [],
              properties: []
            }
          ]
        )
      })

      it('should skip the constructor body', () => {
        expectRight(
          `/**
        * description
        * @since 1.0.0
        */
        export class C { constructor() {} }`,
          Parser.parseClasses,
          [
            {
              _tag: 'Class',
              name: 'C',
              description: Option.some('description'),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
              examples: [],
              signature: 'export declare class C { constructor() }',
              methods: [],
              staticMethods: [],
              properties: []
            }
          ]
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
        expectRight(
          `/**
        * description
        * @since 1.0.0
        */
        export class C {
          /**
           * @since 1.0.0
           */
          a: string
        }`,
          Parser.parseClasses,
          [
            {
              _tag: 'Class',
              name: 'C',
              description: Option.some('description'),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
              examples: [],
              signature: 'export declare class C',
              methods: [],
              staticMethods: [],
              properties: [
                {
                  name: 'a',
                  description: Option.none(),
                  since: Option.some('1.0.0'),
                  deprecated: false,
                  category: Option.none(),
                  examples: [],
                  signature: 'a: string'
                }
              ]
            }
          ]
        )
      })

      it('should return a `Class`', () => {
        expectRight(
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
        }`,
          Parser.parseClasses,
          [
            {
              _tag: 'Class',
              name: 'Test',
              description: Option.some('a class description...'),
              since: Option.some('1.0.0'),
              deprecated: true,
              category: Option.none(),
              examples: [],
              signature: 'export declare class Test { constructor(readonly value: string) }',
              methods: [
                {
                  name: 'g',
                  description: Option.some('a method description...'),
                  since: Option.some('1.1.0'),
                  deprecated: true,
                  category: Option.none(),
                  examples: [],
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
                  examples: [],
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
                  examples: []
                }
              ]
            }
          ]
        )
      })

      it('should handle method overloadings', () => {
        expectRight(
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
        }`,
          Parser.parseClasses,
          [
            {
              _tag: 'Class',
              name: 'Test',
              description: Option.some('a class description...'),
              since: Option.some('1.0.0'),
              deprecated: true,
              category: Option.none(),
              examples: [],
              signature: 'export declare class Test<A> { constructor(readonly value: A) }',
              methods: [
                {
                  name: 'map',
                  description: Option.some('a method description...'),
                  since: Option.some('1.1.0'),
                  deprecated: true,
                  category: Option.none(),
                  examples: [],
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
                  examples: [],
                  signatures: ['static f(x: number): number', 'static f(x: string): string']
                }
              ],
              properties: []
            }
          ]
        )
      })

      it('should ignore internal/ignored methods (#42)', () => {
        expectRight(
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
        }`,
          Parser.parseClasses,
          [
            {
              _tag: 'Class',
              name: 'Test',
              description: Option.some('a class description...'),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
              examples: [],
              signature: 'export declare class Test<A>',
              methods: [],
              staticMethods: [],
              properties: []
            }
          ]
        )
      })
    })

    describe.concurrent('parseModuleDocumentation', () => {
      it('should return a description field and a deprecated field', () => {
        expectRight(
          `/**
            * Manages the configuration settings for the widget
            * @deprecated
            * @since 1.0.0
            */
            /**
             * @since 1.2.0
             */
            export const a: number = 1`,
          Parser.parseModuleDocumentation,
          {
            name: 'test',
            description: Option.some('Manages the configuration settings for the widget'),
            since: Option.some('1.0.0'),
            deprecated: true,
            category: Option.none(),
            examples: []
          }
        )
      })

      it('should return an error when documentation is enforced but no documentation is provided', () => {
        expectLeft('export const a: number = 1', Parser.parseModuleDocumentation, [
          'Missing documentation in test module'
        ])
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
            examples: []
          })
        )
      })
    })

    describe.concurrent('parseExports', () => {
      it('should return no `Export`s if the file is empty', () => {
        expectRight('', Parser.parseExports, [])
      })

      it('should handle renamimg', () => {
        expectRight(
          `const a = 1;
          export {
            /**
             * @since 1.0.0
             */
            a as b
          }`,
          Parser.parseExports,
          [
            {
              _tag: 'Export',
              name: 'b',
              description: Option.none(),
              deprecated: false,
              since: Option.some('1.0.0'),
              category: Option.none(),
              examples: [],
              signature: 'export declare const b: 1'
            }
          ]
        )
      })

      it('should return an `Export`', () => {
        expectRight(
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
          }`,
          Parser.parseExports,
          [
            {
              _tag: 'Export',
              name: 'a',
              description: Option.some('description_of_a'),
              since: Option.some('1.0.0'),
              deprecated: false,
              category: Option.none(),
              signature: 'export declare const a: any',
              examples: []
            },
            {
              _tag: 'Export',
              name: 'b',
              description: Option.some('description_of_b'),
              since: Option.some('2.0.0'),
              deprecated: false,
              category: Option.none(),
              signature: 'export declare const b: any',
              examples: []
            }
          ]
        )
      })

      it('should raise an error if `@since` tag is missing in export', () => {
        expectLeft('export { a }', Parser.parseExports, ['Missing a documentation in test'])
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

        expect(
          pipe(
            {
              path: ['test'],
              sourceFile,
              config
            },
            Parser.parseExports
          )
        ).toEqual(
          E.right([
            {
              _tag: 'Export',
              name: 'b',
              description: Option.none(),
              since: Option.some('1.0.0'),
              deprecated: false,
              signature: 'export declare const b: 1',
              category: Option.none(),
              examples: []
            }
          ])
        )
      })
    })

    describe.concurrent('parseModule', () => {
      it('should raise an error if `@since` tag is missing', async () => {
        expectLeft(`import * as assert from 'assert'`, Parser.parseModule, ['Missing documentation in test module'])
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

        expect(pipe({ ...env, config: { ...env.config, enforceExamples: true } }, Parser.parseModule)).toEqual(
          E.right({
            name: 'test',
            description: Option.some('This is the assert module.'),
            since: Option.some('1.0.0'),
            deprecated: false,
            examples: [],
            category: Option.none(),
            path: ['test'],
            classes: [],
            interfaces: [],
            functions: [],
            typeAliases: [],
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
            exports: []
          })
        )
      })
    })

    describe.concurrent('parseFile', () => {
      it('should not parse a non-existent file', async () => {
        const file = _.createFile('non-existent.ts', '')
        const project = new ast.Project({ useInMemoryFileSystem: true })

        assert.deepStrictEqual(
          pipe(Parser.parseFile(project)(file), Effect.provideService(Config, { config }), Effect.runSyncEither),
          Either.left(['Unable to locate file: non-existent.ts'])
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

        expect(pipe(env, Parser.getCommentInfo('name')(text))).toEqual(
          E.right({
            description: Option.some('description'),
            since: Option.some('1.0.0'),
            category: Option.some('instances'),
            deprecated: false,
            examples: []
          })
        )
      })

      it('should fail if an empty comment tag is provided', () => {
        const env = getTestEnv('')

        const text = `/**
* @category
* @since 1.0.0
*/`

        expect(pipe(env, Parser.getCommentInfo('name')(text))).toEqual(
          Either.left(['Missing @category tag in test#name documentation'])
        )
      })

      it('should require a description if `enforceDescriptions` is set to true', () => {
        const env = getTestEnv('')

        const text = `/**
* @category instances
* @since 1.0.0
*/`

        expect(
          pipe({ ...env, config: { ...env.config, enforceDescriptions: true } }, Parser.getCommentInfo('name')(text))
        ).toEqual(Either.left(['Missing description in test#name documentation']))
      })

      it('should require at least one example if `enforceExamples` is set to true', () => {
        const env = getTestEnv('')

        const text = `/**
* description
* @category instances
* @since 1.0.0
*/`

        expect(
          pipe({ ...env, config: { ...env.config, enforceExamples: true } }, Parser.getCommentInfo('name')(text))
        ).toEqual(Either.left(['Missing @example tag in test#name documentation']))
      })

      it('should require at least one non-empty example if `enforceExamples` is set to true', () => {
        const env = getTestEnv('')

        const text = `/**
* description
* @example
* @category instances
* @since 1.0.0
*/`

        expect(
          pipe({ ...env, config: { ...env.config, enforceExamples: true } }, Parser.getCommentInfo('name')(text))
        ).toEqual(Either.left(['Missing @example tag in test#name documentation']))
      })

      it('should allow no since tag if `enforceVersion` is set to false', () => {
        const env = getTestEnv('')

        const text = `/**
* description
* @category instances
*/`

        expect(
          pipe({ ...env, config: { ...env.config, enforceVersion: false } }, Parser.getCommentInfo('name')(text))
        ).toEqual(
          E.right({
            description: Option.some('description'),
            since: Option.none(),
            category: Option.some('instances'),
            deprecated: false,
            examples: []
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
      assert.deepStrictEqual(
        Parser.stripImportTypes(
          '{ <E, A, B>(refinement: import("/Users/giulio/Documents/Projects/github/fp-ts/src/function").Refinement<A, B>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, B>; <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, A>; }'
        ),
        '{ <E, A, B>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, B>; <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (ma: Either<E, A>) => Either<E, A>; }'
      )
      assert.deepStrictEqual(
        Parser.stripImportTypes(
          '{ <A, B>(refinementWithIndex: import("/Users/giulio/Documents/Projects/github/fp-ts/src/FilterableWithIndex").RefinementWithIndex<number, A, B>): (fa: A[]) => B[]; <A>(predicateWithIndex: import("/Users/giulio/Documents/Projects/github/fp-ts/src/FilterableWithIndex").PredicateWithIndex<number, A>): (fa: A[]) => A[]; }'
        ),
        '{ <A, B>(refinementWithIndex: RefinementWithIndex<number, A, B>): (fa: A[]) => B[]; <A>(predicateWithIndex: PredicateWithIndex<number, A>): (fa: A[]) => A[]; }'
      )
    })
  })
})
