import * as assert from 'assert'
import * as child_process from 'child_process'
import * as E from 'fp-ts/Either'

import * as _ from '../src/Example'

afterAll(() => {
  jest.restoreAllMocks()
})

describe('Example', () => {
  describe('run', () => {
    it('should return void when an example does pass typechecking', async () => {
      const mockSpawnSync = jest.spyOn(child_process, 'spawnSync').mockImplementation(() => ({ status: 0 }))

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
        .mockImplementation(() => ({ status: 1, stderr: 'Error!' }))

      const result = await _.run('ts-node', 'foo/bar.ts')()

      assert.deepStrictEqual(result, E.left('Error!'))
      expect(child_process.spawnSync).toHaveBeenCalledWith('ts-node', ['foo/bar.ts'], {
        stdio: 'pipe',
        encoding: 'utf8'
      })

      mockSpawnSync.mockReset()
    })
  })
})
