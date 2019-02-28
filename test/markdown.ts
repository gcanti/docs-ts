import * as assert from 'assert'
import { parseLink } from '../src/markdown'
import { failure, success } from 'fp-ts/lib/Validation'

describe('parseLink', () => {
  it('should parse a link', () => {
    assert.deepStrictEqual(parseLink(''), failure(['Invalid link ""']))
    assert.deepStrictEqual(parseLink('{@link alink}'), success(['{@link alink}']))
  })
})
