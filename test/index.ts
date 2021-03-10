import * as assert from 'assert'
import chalk from 'chalk'
import * as TE from 'fp-ts/TaskEither'

import * as _ from '../src/index'

afterAll(() => {
  jest.restoreAllMocks()
})

describe('index', () => {
  describe('exit', () => {
    it('should return an error message when the program exits unsuccessfully', async () => {
      const mockConsole = jest.spyOn(console, 'log').mockImplementation(() => {})
      const mockExit = jest.spyOn(process, 'exit').mockImplementation()

      await _.exit(TE.left('foo'))()

      assert.strictEqual(mockConsole.mock.calls[0][0], chalk.bold.red('foo'))
      assert.strictEqual(mockExit.mock.calls[0][0], 1)

      mockConsole.mockReset()
      mockExit.mockReset()
    })

    it('should return a success message when the program exits successfully', async () => {
      const mockConsole = jest.spyOn(console, 'log').mockImplementation(() => {})
      const mockExit = jest.spyOn(process, 'exit').mockImplementation()

      await _.exit(TE.right(undefined))()

      assert.strictEqual(mockConsole.mock.calls[0][0], chalk.bold.green('Docs generation succeeded!'))
      assert.strictEqual(mockExit.mock.calls[0][0], 0)

      mockConsole.mockReset()
      mockExit.mockReset()
    })
  })
})
