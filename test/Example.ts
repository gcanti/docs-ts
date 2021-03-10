import * as assert from 'assert'
import * as child_process from 'child_process'
import { SpawnSyncReturns } from 'child_process'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'

import * as _ from '../src/Example'

afterAll(() => {
  jest.restoreAllMocks()
})

describe('Example', () => {
  describe('run', () => {
    it('should return void when an example does pass typechecking', async () => {
      const mockSpawnSync = jest
        .spyOn(child_process, 'spawnSync')
        .mockImplementation(() => ({ status: 0 } as SpawnSyncReturns<Buffer>))

      const result = await _.run('ts-node', 'foo/bar.ts')()

      assert.deepStrictEqual(result, E.right(undefined))
      expect(child_process.spawnSync).toHaveBeenCalledWith('ts-node', ['foo/bar.ts'], {
        stdio: 'pipe',
        encoding: 'utf8'
      })

      mockSpawnSync.mockReset()
    })

    it('should return an error message when an example does not pass typechecking', async () => {
      const mockSpawnSync = jest
        .spyOn(child_process, 'spawnSync')
        .mockImplementation(() => ({ status: 1, stderr: Buffer.from('Error!', 'utf8') } as SpawnSyncReturns<Buffer>))

      const result = await _.run('ts-node', 'foo/bar.ts')()

      assert.deepStrictEqual(
        pipe(
          result,
          E.mapLeft((buffer) => buffer.toString())
        ),
        E.left('Error!')
      )
      expect(child_process.spawnSync).toHaveBeenCalledWith('ts-node', ['foo/bar.ts'], {
        stdio: 'pipe',
        encoding: 'utf8'
      })

      mockSpawnSync.mockReset()
    })
  })
})
