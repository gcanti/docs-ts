import * as assert from 'assert'
import * as path from 'path'
import * as O from 'fp-ts/Option'
import * as TE from 'fp-ts/TaskEither'
import * as R from 'fp-ts/Record'
import { pipe } from 'fp-ts/lib/function'
import * as minimatch from 'minimatch'

import * as Core from '../src/Core'
import * as L from '../src/Logger'
import * as FS from '../src/FileSystem'
import { assertLeft, assertRight } from './utils'

type FileSystemState = Record<string, string>

const prefixWithCwd = (fs: FileSystemState) =>
  pipe(
    { ...fs },
    R.reduceWithIndex({} as FileSystemState, (key, acc, content) => {
      acc[path.join(process.cwd(), key)] = content

      return acc
    })
  )

// TODO: use WritterT ?
const testLogger: L.Logger = {
  debug: (_msg: string) => TE.of(undefined),
  error: (_msg: string) => TE.of(undefined),
  info: (_msg: string) => TE.of(undefined)
}

// TODO: use WritterT ?
const mkTestFileSystem = (fs: FileSystemState): { getState: () => FileSystemState; fileSystem: FS.FileSystem } => {
  const fileSystem = { ...fs }

  return {
    getState: () => fileSystem,
    fileSystem: {
      readFile: (path: string) =>
        pipe(
          fileSystem,
          R.lookup(path),
          TE.fromOption(() => `Error: file not found: ${path}`)
        ),
      writeFile: (path: string, content: string) => {
        fileSystem[path] = content

        return TE.of(undefined)
      },
      exists: (path: string) => pipe(fileSystem, R.lookup(path), mbPath => TE.of(O.isSome(mbPath))),
      remove: (pattern: string) => {
        Object.keys(fileSystem).forEach(path => {
          // TODO check how to delete directories
          if (minimatch(path, pattern)) {
            delete fileSystem[path]
          }
        })

        return TE.of(undefined)
      },
      search: (pattern: string, exclude: ReadonlyArray<string>) =>
        pipe(
          fileSystem,
          R.filterWithIndex((path, _contents) => minimatch(path, pattern)),
          R.keys,
          foundPaths => TE.of(foundPaths.filter(path => !exclude.some(pattern => minimatch(path, pattern))))
        )
    }
  }
}

const mkTestCapabilites = (
  fs: FileSystemState
): { getFileSystemState: () => FileSystemState; capabilities: Core.Capabilities } => {
  const { fileSystem, getState } = mkTestFileSystem(fs)

  return { capabilities: { ...testLogger, ...fileSystem }, getFileSystemState: getState }
}

describe('Core', () => {
  describe('main', () => {
    describe('package.json', () => {
      it('fails when missing', async () => {
        const { capabilities } = mkTestCapabilites({})

        assertLeft(await Core.main(capabilities)(), error =>
          assert.equal(error.startsWith('Unable to read package.json'), true)
        )
      })

      it('fails on invalid JSON', async () => {
        const { capabilities } = mkTestCapabilites(prefixWithCwd({ 'package.json': '{"name": "docs-ts"' }))

        assertLeft(await Core.main(capabilities)(), error =>
          assert.equal(error.startsWith('Unexpected end of JSON input'), true)
        )
      })

      it('fails to decode', async () => {
        const { capabilities } = mkTestCapabilites(prefixWithCwd({ 'package.json': '{}' }))

        assertLeft(await Core.main(capabilities)(), error =>
          assert.equal(error.startsWith('Unable to decode package.json'), true)
        )
      })

      it('fails on missing homepage', async () => {
        const { capabilities } = mkTestCapabilites(prefixWithCwd({ 'package.json': '{ "name": "docs-ts" }' }))

        assertLeft(await Core.main(capabilities)(), error => assert.equal(error, 'Missing homepage in package.json'))
      })
    })

    describe('docs-ts.json', () => {
      it('fails on invalid JSON', async () => {
        const { capabilities } = mkTestCapabilites(
          prefixWithCwd({
            'package.json': '{ "name": "docs-ts", "homepage": "https://docs-ts.com" }',
            'docs-ts.json': ''
          })
        )

        assertLeft(await Core.main(capabilities)(), error =>
          assert.equal(error.startsWith('Invalid configuration file detected'), true)
        )
      })
    })

    it('writes only base files when no source files are present', async () => {
      const { capabilities, getFileSystemState } = mkTestCapabilites(
        prefixWithCwd({ 'package.json': '{ "name": "docs-ts", "homepage": "https://docs-ts.com" }' })
      )

      assertRight(await Core.main(capabilities)(), value => {
        assert.equal(value, undefined)

        const actual = Object.keys(getFileSystemState())
        const expected = [`${process.cwd()}/package.json`, 'docs/index.md', 'docs/modules/index.md', 'docs/_config.yml']

        assert.deepStrictEqual(actual, expected)
      })
    })
  })
})
