import * as assert from 'assert'
import { check, defaultOptions } from '../src/check'

describe('check', () => {
  it('should type check', () => {
    assert.deepStrictEqual(check({}, defaultOptions), [])
    assert.deepStrictEqual(
      check(
        {
          'file.ts': 'const a: number = 1'
        },
        defaultOptions
      ),
      []
    )
    assert.deepStrictEqual(
      check(
        {
          'file.ts': 'const a: number = true'
        },
        defaultOptions
      ),
      // tslint:disable-next-line: quotemark
      ["file.ts (1,7): Type 'true' is not assignable to type 'number'."]
    )
  })

  it('should raise an error if an assert fails', () => {
    assert.deepStrictEqual(
      check(
        {
          'file.ts': `import * as assert from 'assert'
assert.strictEqual(1, 2)`
        },
        defaultOptions
      ),
      [
        'file.ts: AssertionError [ERR_ASSERTION]: Input A expected to strictly equal input B:\n\u001b[32m+ expected\u001b[39m \u001b[31m- actual\u001b[39m\n\n\u001b[31m-\u001b[39m 1\n\u001b[32m+\u001b[39m 2'
      ]
    )
  })

  it.only('should import the project modules', () => {
    assert.deepStrictEqual(
      check(
        {
          'file.ts': `import * as assert from 'assert'
import { main } from './src'
import { IO } from 'fp-ts/lib/IO'
assert.strictEqual(main instanceof IO, true)`
        },
        defaultOptions
      ),
      []
    )
  })
})
