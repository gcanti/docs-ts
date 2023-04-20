import * as assert from 'assert'
import * as minimatch from 'minimatch'
import { join } from 'path'
import * as O from 'fp-ts/Option'
import * as TE from 'fp-ts/TaskEither'
import * as R from 'fp-ts/Record'
import * as A from 'fp-ts/Array'
import { eqString } from 'fp-ts/Eq'
import { pipe, Endomorphism } from 'fp-ts/function'
import * as Core from '../src/Core'
import * as E from '../src/Example'
import * as L from '../src/Logger'
import * as FS from '../src/FileSystem'
import { assertLeft, assertRight } from './utils'

import Option = O.Option

type FileSystemState = Record<string, string>
type Log = Array<string>

let command = ''
let executablePath = ''
let fileSystemState: FileSystemState = {}
let log: Log = []

beforeEach(() => {
  command = ''
  executablePath = ''
  fileSystemState = {}
  log = []
})

afterAll(() => {
  jest.restoreAllMocks()
})

const defaultPackageJson: string = JSON.stringify({
  name: 'docs-ts',
  homepage: 'https://www.github.com/gcanti/docs-ts'
})

const example: E.Example = {
  run: (c, p) => {
    command = c
    executablePath = p
    return TE.of(undefined)
  }
}

const prefixWithCwd: Endomorphism<FileSystemState> = R.reduceWithIndex<string, string, FileSystemState>(
  R.empty,
  (key, acc, content) => ({
    ...acc,
    [join(process.cwd(), key)]: content
  })
)

const fileSystem: FS.FileSystem = {
  readFile: (path) =>
    pipe(
      R.lookup(path, fileSystemState),
      TE.fromOption(() => `Error: file not found: ${path}`)
    ),
  writeFile: (path, content) => {
    fileSystemState = { ...fileSystemState, [join(process.cwd(), path.replace(process.cwd(), ''))]: content }
    return TE.of(undefined)
  },
  exists: (path) => TE.of<string, boolean>(pipe(fileSystemState, R.lookup(path), O.isSome)),
  remove: (pattern) => {
    Object.keys(fileSystemState).forEach((path) => {
      if (minimatch(path, pattern)) {
        delete fileSystemState[path]
      }
    })
    return TE.of(undefined)
  },
  search: (pattern: string, exclude: ReadonlyArray<string>) =>
    TE.of(
      pipe(
        fileSystemState,
        R.filterWithIndex((path) => minimatch(path, join(process.cwd(), pattern))),
        R.keys,
        A.filter((path) => !exclude.some((pattern) => minimatch(path, join(process.cwd(), pattern))))
      )
    )
}

const addMsgToLog: (msg: string) => TE.TaskEither<string, void> = (msg) => {
  log.push(msg)
  return TE.of(undefined)
}

const logger: L.Logger = {
  debug: addMsgToLog,
  error: addMsgToLog,
  info: addMsgToLog
}

const makeCapabilities: (state: FileSystemState) => Core.Capabilities = (state) => {
  fileSystemState = state
  return {
    logger,
    fileSystem,
    example,
    addFile: (file) => (project) => project.createSourceFile(file.path, file.content, { overwrite: file.overwrite })
  }
}

describe('Core', () => {
  describe('main', () => {
    describe('package.json', () => {
      it('fails when missing', async () => {
        const state = prefixWithCwd({})
        const capabilities = makeCapabilities(state)

        assertLeft(await Core.main(capabilities)(), (error) =>
          assert.strictEqual(error.startsWith('Unable to read package.json'), true)
        )
      })

      it('fails on invalid JSON', async () => {
        const state = prefixWithCwd({ 'package.json': '{"name": "docs-ts"' })
        const capabilities = makeCapabilities(state)

        assertLeft(await Core.main(capabilities)(), (error) =>
          assert.strictEqual(error.startsWith('Unexpected end of JSON input'), true)
        )
      })

      it('fails to decode package.json without required fields', async () => {
        const state = prefixWithCwd({ 'package.json': JSON.stringify(R.empty) })
        const capabilities = makeCapabilities(state)

        assertLeft(await Core.main(capabilities)(), (error) =>
          assert.strictEqual(error.startsWith('Unable to decode package.json'), true)
        )
      })

      it('fails on missing homepage', async () => {
        const state = prefixWithCwd({ 'package.json': JSON.stringify({ name: 'docs-ts' }) })
        const capabilities = makeCapabilities(state)

        assertLeft(await Core.main(capabilities)(), (error) =>
          assert.strictEqual(error, 'Missing homepage in package.json')
        )
      })
    })

    describe('docs-ts.json', () => {
      it('fails on invalid JSON', async () => {
        const state = prefixWithCwd({
          'package.json': defaultPackageJson,
          'docs-ts.json': ''
        })
        const capabilities = makeCapabilities(state)

        assertLeft(await Core.main(capabilities)(), (error) =>
          assert.strictEqual(error.startsWith('Invalid configuration file detected'), true)
        )
      })

      it('writes only base files when no source files are present', async () => {
        const state = prefixWithCwd({
          'package.json': defaultPackageJson
        })
        const capabilities = makeCapabilities(state)

        assertRight(await Core.main(capabilities)(), (result) => {
          assert.strictEqual(result, undefined)

          const actual = Object.keys(fileSystemState)
          const expected = [`package.json`, 'docs/_config.yml', 'docs/modules/index.md', 'docs/index.md'].map((path) =>
            join(process.cwd(), path)
          )

          assert.deepStrictEqual(actual, expected)
        })
      })

      it('should print messages to the console when a valid configuration file is found', async () => {
        const state = prefixWithCwd({
          'package.json': defaultPackageJson,
          'docs-ts.json': '{}'
        })
        const capabilities = makeCapabilities(state)

        assertRight(await Core.main(capabilities)(), (result) => {
          assert.strictEqual(result, undefined)
          assert.strictEqual(A.elem(eqString)('Found configuration file')(log), true)
          assert.strictEqual(
            A.elem(eqString)(`Parsing configuration file found at: ${process.cwd()}/docs-ts.json`)(log),
            true
          )
        })
      })

      it('should skip creation of index.md if the file already exists', async () => {
        const indexMd = `---
title: Home
nav_order: 1
---`
        const state = prefixWithCwd({
          'package.json': defaultPackageJson,
          'docs/index.md': indexMd,
          'docs-ts.json': JSON.stringify({ enableSearch: false })
        })
        const capabilities = makeCapabilities(state)

        assertRight(await Core.main(capabilities)(), (result) => {
          assert.strictEqual(result, undefined)
          assert.strictEqual(
            log.includes(`File ${process.cwd()}/docs/index.md already exists, skipping creation`),
            true
          )
        })
      })

      it('should only cause configurable properties to be overwritten if _config.yml exists', async () => {
        const configYML = `remote_theme: pmarsceill/just-the-docs

# Enable or disable the site search
search_enabled: true

# Aux links for the upper right navigation
aux_links:
  'docs-ts on Github':
    - 'https://github.com/gcanti/docs-ts'

additional_config_param: true`

        const state = prefixWithCwd({
          'package.json': defaultPackageJson,
          'docs/_config.yml': configYML,
          'docs-ts.json': JSON.stringify({ enableSearch: false })
        })
        const capabilities = makeCapabilities(state)

        assertRight(await Core.main(capabilities)(), (result) => {
          assert.strictEqual(result, undefined)
          assert.strictEqual(
            fileSystemState[join(process.cwd(), 'docs/_config.yml')].includes('additional_config_param: true'),
            true
          )
        })
      })

      it('should use the homepage specified in the package.json if no config present', async () => {
        const state = prefixWithCwd({
          'package.json': defaultPackageJson
        })
        const capabilities = makeCapabilities(state)

        assertRight(await Core.main(capabilities)(), (result) => {
          const config = fileSystemState[join(process.cwd(), 'docs/_config.yml')]
          assert.strictEqual(result, undefined)
          assert.strictEqual(config.includes('GitHub'), true)
          assert.strictEqual(config.includes('Homepage'), false)
          assert.strictEqual(config.includes('https://www.github.com/gcanti/docs-ts'), true)
        })
      })

      it('should use the project homepage specified in the config file if present', async () => {
        const state = prefixWithCwd({
          'package.json': defaultPackageJson,
          'docs-ts.json': JSON.stringify({ projectHomepage: 'https://somewhere.com/user/project' })
        })
        const capabilities = makeCapabilities(state)

        assertRight(await Core.main(capabilities)(), (result) => {
          const config = fileSystemState[join(process.cwd(), 'docs/_config.yml')]
          assert.strictEqual(result, undefined)
          assert.strictEqual(config.includes('Homepage'), true)
          assert.strictEqual(config.includes('GitHub'), false)
          assert.strictEqual(config.includes('https://somewhere.com/user/project'), true)
        })
      })
    })

    describe('modules', () => {
      it('should log modules found in the file system to the console', async () => {
        const state = prefixWithCwd({
          'package.json': defaultPackageJson,
          'src/utils/foo.ts': `
/**
 * @since 0.0.1
 */

/**
 * @category utils
 * @since 0.0.1
 */
export const foo = (): string => 'foo'
          `
        })
        const capabilities = makeCapabilities(state)

        assertRight(await Core.main(capabilities)(), (result) => {
          assert.strictEqual(result, undefined)
          assert.strictEqual(log.includes('Found 1 modules'), true)
          assert.strictEqual(
            Object.keys(fileSystemState).includes(join(process.cwd(), 'docs/modules/src/utils/foo.ts.md')),
            true
          )
        })
      })
    })

    describe('examples', () => {
      it('should attempt to typecheck examples', async () => {
        const state = prefixWithCwd({
          'package.json': defaultPackageJson,
          'src/utils/foo.ts': `
/**
 * @since 0.0.1
 */

/**
 * @category utils
 * @since 0.0.1
 */
export class Foo {
  /**
   * @example
   * const foo = new Foo()
   *
   * @since 0.0.1
   */
  public bar(): string {
    return 'bar'
  }
}
          `
        })
        const capabilities = makeCapabilities(state)

        assertRight(await Core.main(capabilities)(), (result) => {
          assert.strictEqual(result, undefined)
          assert.strictEqual(command, 'ts-node')
          assert.strictEqual(executablePath.includes('docs/examples/index.ts'), true)
        })
      })

      it('should replace imports from the project with the local source folder (single quotes)', async () => {
        const state = prefixWithCwd({
          'package.json': defaultPackageJson,
          'src/utils/foo.ts': `
/**
 * @since 0.0.1
 */

/**
 * @category utils
 * @since 0.0.1
 */
export class Foo {
  /**
   * @example
   * import * as Foo from '${JSON.parse(defaultPackageJson)['name']}'
   *
   * @since 0.0.1
   */
  public bar(): string {
    return 'bar'
  }
}
          `
        })
        const capabilities = makeCapabilities(state)

        assertRight(await Core.main(capabilities)(), (result) => {
          const exampleFileName = `${[...process.cwd().split('/'), 'src', 'utils', 'foo.ts'].join(
            '-'
          )}-Foo-method-bar-0.ts`
          const exampleFilePath = `${process.cwd()}/docs/examples/${exampleFileName}`
          const importFromRegex = new RegExp("from '../../src'")

          assert.strictEqual(result, undefined)
          assert.strictEqual(command, 'ts-node')
          assert.strictEqual(executablePath.includes('docs/examples/index.ts'), true)
          assert.strictEqual(importFromRegex.test(fileSystemState[exampleFilePath]), true)
        })
      })

      describe('Package Imports', () => {
        type PackageName = { scope: Option<string>; name: string }

        type PackageImport = {
          quotes: 'single' | 'double'
          packageName: PackageName
          lib: boolean
          path: Option<string>
        }

        const stringifyPackageName = ({ scope, name }: PackageName): string =>
          `${O.fold(
            () => '',
            (str) => `@${str}/`
          )(scope)}${name}`

        const stringifyPackageImport = ({ quotes, packageName, lib, path }: PackageImport) => {
          const quote = quotes === 'single' ? "'" : '"'
          const libStr = lib ? '/lib' : ''
          const pathStr = O.fold(
            () => '',
            (str) => `/${str}`
          )(path)
          const packageNameStr = stringifyPackageName(packageName)
          return `${quote}${packageNameStr}${libStr}${pathStr}${quote}`
        }

        const mkState = (packageName: PackageName, importLine: string) =>
          prefixWithCwd({
            'package.json': JSON.stringify({ name: stringifyPackageName(packageName), homepage: 'http://foo' }),
            'src/utils/foo.ts': `
/**
 * @since 0.0.1
 */
/**
 * @category utils
 * @since 0.0.1
 */
export class Foo {
  /**
   * @example
   * ${importLine}
   *
   * const bar = 1
   *
   * @since 0.0.1
   */
  public bar(): string {
    return 'bar'
  }
                            }`
          })

        /* By using the Array monad we generate a couple of PackageImport permutations
         */
        const packageImportPermutations: PackageImport[] = pipe(
          A.bindTo('quotes')(['single' as const, 'double' as const]),
          A.bind('scope', () => [O.some('my-org'), O.none]),
          A.bind('name', () => ['my-package']),
          A.bind('packageName', () =>
            pipe(
              A.bindTo('scope')([O.some('my-org'), O.none]),
              A.bind('name', () => ['my-package'])
            )
          ),
          A.bind('lib', () => [true, false]),
          A.bind('path', () => [O.some('seg1'), O.some('seg1/seg2'), O.none])
        )

        test.each(
          pipe(
            packageImportPermutations,
            A.map((packageImport) => [stringifyPackageImport(packageImport), packageImport])
          )
        )(
          'should replace imports like %s from the project with the local source folder',
          async (packageImportStr, { path, packageName }) => {
            const state = mkState(packageName, `import * as foo from ${packageImportStr}`)
            const capabilities = makeCapabilities(state)
            assertRight(await Core.main(capabilities)(), (result) => {
              const exampleFileName = `${[...process.cwd().split('/'), 'src', 'utils', 'foo.ts'].join(
                '-'
              )}-Foo-method-bar-0.ts`
              const exampleFilePath = `${process.cwd()}/docs/examples/${exampleFileName}`
              const importPath =
                '../../src' +
                O.fold(
                  () => '',
                  (str) => `/${str}`
                )(path)

              assert.strictEqual(result, undefined)
              assert.strictEqual(command, 'ts-node')
              assert.strictEqual(executablePath.includes('docs/examples/index.ts'), true)
              assert.strictEqual(
                fileSystemState[exampleFilePath],
                `import * as foo from '${importPath}'

const bar = 1
`
              )
            })
          }
        )
      })

      it('should attempt to typecheck examples that include assert statements', async () => {
        const state = prefixWithCwd({
          'package.json': defaultPackageJson,
          'src/utils/foo.ts': `
/**
 * @since 0.0.1
 */

/**
 * @category utils
 * @since 0.0.1
 */
export class Foo {
  /**
   * @example
   * const foo = new Foo()
   * assert.strictEqual(typeof foo.bar() === 'string', true)
   *
   * @since 0.0.1
   */
  public bar(): string {
    return 'bar'
  }
}
          `
        })
        const capabilities = makeCapabilities(state)

        assertRight(await Core.main(capabilities)(), (result) => {
          assert.strictEqual(result, undefined)
          assert.strictEqual(command, 'ts-node')
          assert.strictEqual(executablePath.includes('docs/examples/index.ts'), true)
        })
      })
    })
  })

  describe('Windows', () => {
    let originalPlatform = process.platform

    beforeAll(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
    })

    afterAll(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should modify the executed command on Windows', async () => {
      const state = prefixWithCwd({
        'package.json': defaultPackageJson,
        'src/utils/foo.ts': `
/**
* @since 0.0.1
*/

/**
* @category utils
* @since 0.0.1
*/
export class Foo {
/**
 * @example
 * const foo = new Foo()
 *
 * @since 0.0.1
 */
public bar(): string {
  return 'bar'
}
}
        `
      })
      const capabilities = makeCapabilities(state)

      assertRight(await Core.main(capabilities)(), (result) => {
        assert.strictEqual(result, undefined)
        assert.strictEqual(command, 'ts-node.cmd')
        assert.strictEqual(executablePath.includes('docs/examples/index.ts'), true)
      })
    })
  })
})
