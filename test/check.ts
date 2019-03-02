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
})
