import * as assert from 'assert'
import * as Eq from 'fp-ts/Eq'
import * as RA from 'fp-ts/ReadonlyArray'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'

import * as _ from '../src/FileSystem'
import { assertRight } from './utils'

describe('FileSystem', () => {
  describe('constructors', () => {
    it('File', () => {
      const file1 = _.File('src/test.ts', 'test')
      const file2 = _.File('src/test.ts', 'test', true)

      assert.deepStrictEqual(file1, {
        path: 'src/test.ts',
        content: 'test',
        overwrite: false
      })

      assert.deepStrictEqual(file2, {
        path: 'src/test.ts',
        content: 'test',
        overwrite: true
      })
    })
  })

  describe('utils', () => {
    let TEST_DIR: string = ''

    beforeEach((done) => {
      TEST_DIR = path.join(os.tmpdir(), 'FileSystem')
      fs.emptyDir(TEST_DIR, done)
    })

    afterEach((done) => {
      fs.remove(TEST_DIR, done)
    })

    it('readFile', async () => {
      const file = path.join(TEST_DIR, Math.random() + '.txt')
      await fs.writeFile(file, 'test1', { encoding: 'utf8' })

      assertRight(await _.readFile(file, 'utf8')(), (content) => assert.strictEqual(content, 'test1'))
    })

    it('writeFile', async () => {
      const file = path.join(TEST_DIR, Math.random() + '.txt')

      assertRight(
        await pipe(
          _.writeFile(file, 'test2', { encoding: 'utf8' }),
          TE.chain(() => _.readFile(file, 'utf8'))
        )(),
        (content) => assert.strictEqual(content, 'test2')
      )
    })

    it('exists', async () => {
      const file = path.join(TEST_DIR, Math.random() + '.txt')
      await fs.ensureFile(file)

      assertRight(await _.exists(file)(), (exists) => assert.strictEqual(exists, true))
    })

    it('remove', async () => {
      const file = path.join(TEST_DIR, Math.random() + '.txt')
      await fs.ensureFile(file)

      assert.strictEqual(await fs.pathExists(file), true, 'Error writing file')

      await _.remove(file, {})()

      assert.strictEqual(await fs.pathExists(file), false, 'Error removing file')
    })

    it('search', async () => {
      const file0 = path.join(TEST_DIR, Math.random() + '.txt')
      const file1 = path.join(TEST_DIR, Math.random() + '.txt')
      const file2 = path.join(TEST_DIR, Math.random() + '.txt')

      await pipe(
        [file0, file1, file2],
        RA.traverseWithIndex(TE.ApplicativePar)((i, f) => _.writeFile(f, `${i}`, { encoding: 'utf8' }))
      )()

      assert.strictEqual(await fs.pathExists(file0), true, 'Error writing file1')
      assert.strictEqual(await fs.pathExists(file1), true, 'Error writing file2')
      assert.strictEqual(await fs.pathExists(file2), true, 'Error writing file3')

      assertRight(
        await pipe(
          _.search(path.join(TEST_DIR, '*.txt'), {}),
          TE.chain(RA.traverse(TE.ApplicativePar)((f) => _.readFile(f, 'utf8'))),
          TE.map(RA.elem(Eq.eqString)('2'))
        )(),
        (found) => assert.deepStrictEqual(found, true)
      )
    })

    it('toErrorMsg', () => {
      const msg = _.toErrorMsg(new Error('test'))

      assert.strictEqual(msg, 'test')
    })
  })

  describe('instances', () => {
    let TEST_DIR: string = ''

    beforeEach((done) => {
      TEST_DIR = path.join(os.tmpdir(), 'FileSystem')
      fs.emptyDir(TEST_DIR, done)
    })

    afterEach((done) => {
      fs.remove(TEST_DIR, done)
    })

    it('FileSystem', async () => {
      const file1 = path.join(TEST_DIR, Math.random() + '.txt')
      const file2 = path.join(TEST_DIR, Math.random() + '.txt')
      const file3 = path.join(TEST_DIR, Math.random() + '.txt')
      const file4 = path.join(TEST_DIR, Math.random() + '.txt')

      await pipe(
        [file1, file2, file3],
        RA.traverseWithIndex(TE.ApplicativePar)((i, f) => _.writeFile(f, `${i}`, { encoding: 'utf8' }))
      )()

      assert.strictEqual(await fs.pathExists(file1), true, 'Error writing file1')
      assert.strictEqual(await fs.pathExists(file2), true, 'Error writing file2')
      assert.strictEqual(await fs.pathExists(file3), true, 'Error writing file3')

      await _.FileSystem.writeFile(file4, '4')()
      assertRight(await _.FileSystem.exists(file4)(), (exists) => assert.strictEqual(exists, true))
      assertRight(await _.FileSystem.readFile(file4)(), (content) => assert.strictEqual(content, '4'))
      assertRight(
        await pipe(
          _.FileSystem.search(path.join(TEST_DIR, '*.txt'), RA.empty),
          TE.chain(RA.traverse(TE.ApplicativePar)(_.FileSystem.readFile)),
          TE.map(RA.elem(Eq.eqString)('4'))
        )(),
        (found) => assert.strictEqual(found, true)
      )

      await _.FileSystem.remove(file4)()
      assertRight(await _.FileSystem.exists(file4)(), (exists) => assert.strictEqual(exists, false))
    })
  })
})
