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

// TODO: use WritterT ?
const testLogger: L.Logger = {
  debug: (_msg: string) => TE.of(undefined),
  error: (_msg: string) => TE.of(undefined),
  info: (_msg: string) => TE.of(undefined)
}

// TODO: use WritterT ?
const mkTestFileSystem = (
  fs: Record<string, string>
): { getState: () => Record<string, string>; fileSystem: FS.FileSystem } => {
  const fileSystem = pipe(
    { ...fs },
    R.reduceWithIndex({} as Record<string, string>, (key, acc, content) => {
      acc[path.join(process.cwd(), key)] = content

      return acc
    })
  )

  const getState = () =>
    pipe(
      fileSystem,
      R.reduceWithIndex({} as Record<string, string>, (key, acc, content) => {
        acc[key.replace(`${process.cwd()}/`, '')] = content

        return acc
      })
    )

  return {
    getState,
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
  fs: Record<string, string>
): { getFileSystemState: () => Record<string, string>; capabilities: Core.Capabilities } => {
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
        const { capabilities } = mkTestCapabilites({ 'package.json': '{"name": "docs-ts"' })

        assertLeft(await Core.main(capabilities)(), error =>
          assert.equal(error.startsWith('Unexpected end of JSON input'), true)
        )
      })

      it('fails to decode', async () => {
        const { capabilities } = mkTestCapabilites({ 'package.json': '{}' })

        assertLeft(await Core.main(capabilities)(), error =>
          assert.equal(error.startsWith('Unable to decode package.json'), true)
        )
      })

      it('fails on missing homepage', async () => {
        const { capabilities } = mkTestCapabilites({ 'package.json': '{ "name": "docs-ts" }' })

        assertLeft(await Core.main(capabilities)(), error => assert.equal(error, 'Missing homepage in package.json'))
      })
    })

    describe('docs-ts.json', () => {
      it('fails on invalid JSON', async () => {
        const { capabilities } = mkTestCapabilites({
          'package.json': '{ "name": "docs-ts", "homepage": "https://docs-ts.com" }',
          'docs-ts.json': ''
        })

        assertLeft(await Core.main(capabilities)(), error =>
          assert.equal(error.startsWith('Invalid configuration file detected'), true)
        )
      })
    })

    it('writes only base files when no source files are present', async () => {
      const fs = { 'package.json': '{ "name": "docs-ts", "homepage": "https://docs-ts.com" }' }
      const { capabilities, getFileSystemState } = mkTestCapabilites(fs)

      assertRight(await Core.main(capabilities)(), value => {
        assert.equal(value, undefined)

        const actual = Object.keys(getFileSystemState())
        const expected = ['package.json', 'docs/_config.yml', 'docs/index.md', 'docs/modules/index.md']

        assert.deepStrictEqual(actual, expected)
      })
    })
  })
})
