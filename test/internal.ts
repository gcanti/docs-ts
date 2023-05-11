import * as Either from '@effect/data/Either'
import * as Effect from '@effect/io/Effect'
import * as Schema from '@effect/schema/Schema'
import * as TreeFormatter from '@effect/schema/TreeFormatter'
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

describe.concurrent('PartialConfigSchema', () => {
  it('should parse a config', () => {
    const parseEither = Schema.parseEither(_.PartialConfigSchema)
    assert.deepStrictEqual(parseEither({}), Either.right({}))
    assert.deepStrictEqual(
      Either.mapLeft(parseEither({ srcDir: 1 }), (e) => TreeFormatter.formatErrors(e.errors)),
      Either.left('error(s) found\n└─ ["srcDir"]\n   └─ Expected string, actual 1')
    )
  })
})
