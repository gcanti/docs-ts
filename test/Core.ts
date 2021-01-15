import * as assert from 'assert'
import * as path from 'path'
import * as O from 'fp-ts/Option'
import * as TE from 'fp-ts/TaskEither'
import * as R from 'fp-ts/Record'
import * as A from 'fp-ts/Array'
import { eqString } from 'fp-ts/Eq'
import { pipe, Endomorphism } from 'fp-ts/function'
import * as minimatch from 'minimatch'
import { join } from 'path'

import * as Core from '../src/Core'
import * as L from '../src/Logger'
import * as FS from '../src/FileSystem'
import { assertLeft, assertRight } from './utils'

type FileSystemState = Record<string, string>
type Log = Array<string>

let fileSystemState: FileSystemState = {}
let log: Log = []

beforeEach(() => {
  fileSystemState = {}
  log = []
})

const defaultPackageJson: string = JSON.stringify({ name: 'docs-ts', homepage: 'https://docs-ts.com' })

const addMsgToLog: (msg: string) => TE.TaskEither<string, void> = msg => {
  log.push(msg)
  return TE.of(undefined)
}

const logger: L.Logger = {
  debug: addMsgToLog,
  error: addMsgToLog,
  info: addMsgToLog
}

const prefixWithCwd: Endomorphism<FileSystemState> = R.reduceWithIndex<string, string, FileSystemState>(
  R.empty,
  (key, acc, content) => ({
    ...acc,
    [path.join(process.cwd(), key)]: content
  })
)

const fileSystem: FS.FileSystem = {
  readFile: path =>
    pipe(
      R.lookup(path, fileSystemState),
      TE.fromOption(() => `Error: file not found: ${path}`)
    ),
  writeFile: (path, content) => {
    fileSystemState = { ...fileSystemState, [join(process.cwd(), path.replace(process.cwd(), ''))]: content }
    return TE.of(undefined)
  },
  exists: path => TE.of<string, boolean>(pipe(fileSystemState, R.lookup(path), O.isSome)),
  remove: pattern => {
    Object.keys(fileSystemState).forEach(path => {
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
        R.filterWithIndex(path => minimatch(path, join(process.cwd(), pattern))),
        R.keys,
        A.filter(path => !exclude.some(pattern => minimatch(path,  join(process.cwd(), pattern))))
      )
    )
}

const makeCapabilities: (state: FileSystemState) => Core.Capabilities = state => {
  fileSystemState = state
  return {
    ...logger,
    ...fileSystem
  }
}

describe('Core', () => {
  describe('main', () => {
    describe('package.json', () => {
      it('fails when missing', async () => {
        const state = prefixWithCwd({})
        const capabilities = makeCapabilities(state)

        assertLeft(await Core.main(capabilities)(), error =>
          assert.strictEqual(error.startsWith('Unable to read package.json'), true)
        )
      })

      it('fails on invalid JSON', async () => {
        const state = prefixWithCwd({ 'package.json': '{"name": "docs-ts"' })
        const capabilities = makeCapabilities(state)

        assertLeft(await Core.main(capabilities)(), error =>
          assert.strictEqual(error.startsWith('Unexpected end of JSON input'), true)
        )
      })

      it('fails to decode package.json without required fields', async () => {
        const state = prefixWithCwd({ 'package.json': JSON.stringify(R.empty) })
        const capabilities = makeCapabilities(state)

        assertLeft(await Core.main(capabilities)(), error =>
          assert.strictEqual(error.startsWith('Unable to decode package.json'), true)
        )
      })

      it('fails on missing homepage', async () => {
        const state = prefixWithCwd({ 'package.json': JSON.stringify({ name: 'docs-ts' }) })
        const capabilities = makeCapabilities(state)

        assertLeft(await Core.main(capabilities)(), error =>
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

        assertLeft(await Core.main(capabilities)(), error =>
          assert.strictEqual(error.startsWith('Invalid configuration file detected'), true)
        )
      })

      it('writes only base files when no source files are present', async () => {
        const state = prefixWithCwd({
          'package.json': defaultPackageJson,
        })
        const capabilities = makeCapabilities(state)

        assertRight(await Core.main(capabilities)(), result => {
          assert.strictEqual(result, undefined)

          const actual = Object.keys(fileSystemState)
          const expected = [`package.json`, 'docs/index.md', 'docs/modules/index.md', 'docs/_config.yml'].map(path =>
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

        assertRight(await Core.main(capabilities)(), result => {
          assert.strictEqual(result, undefined)
          assert.strictEqual(A.elem(eqString)('Found configuration file')(log), true)
          assert.strictEqual(A.elem(eqString)(`Parsing configuration file found at: ${process.cwd()}/docs-ts.json`)(log), true)
        })
      })

      it('should only cause configurable properties to be overwritten if _config.yml exists', async () => {
        const configYML = `remote_theme: pmarsceill/just-the-docs

# Enable or disable the site search
search_enabled: true

# Aux links for the upper right navigation
aux_links:
  'docs-ts on Github:
    - 'https://github.com/gcanti/docs-ts'

additional_config_param: true`

        const state = prefixWithCwd({
          'package.json': defaultPackageJson,
          'docs/_config.yml': configYML,
          'docs-ts.json': JSON.stringify({ enableSearch: false })
        })
        const capabilities = makeCapabilities(state)

        assertRight(await Core.main(capabilities)(), result => {
          assert.strictEqual(result, undefined)
          assert.strictEqual(fileSystemState['/home/maxbrown/projects/docs-ts/docs/_config.yml'].includes('additional_config_param: true'), true)
        })
      })
    })

    describe('modules', () => {
      it('should print modules found in the file system', async () => {
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

        assertRight(await Core.main(capabilities)(), result => {
          assert.strictEqual(result, undefined)
          assert.strictEqual(log.includes('Found 1 modules'), true)
          assert.strictEqual(Object.keys(fileSystemState).includes(join(process.cwd(), 'docs/modules/src/utils/foo.ts.md')), true)
        })
      })
    })
  })
})
