import * as Either from '@effect/data/Either'
import * as Effect from '@effect/io/Effect'
import * as assert from 'assert'

import * as _ from '../src/internal'

describe.concurrent('FileSystem', () => {
  describe.concurrent('readFile', () => {
    it('should error out on non existing files', async () => {
      assert.deepStrictEqual(
        Either.mapLeft(await Effect.runPromiseEither(_.readFile('')), (e) => e.message),
        Either.left("ENOENT: no such file or directory, open ''")
      )
    })
  })
})
