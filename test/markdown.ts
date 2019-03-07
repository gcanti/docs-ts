import * as assert from 'assert'
import { printExamples } from '../src/markdown'

describe('makdown', () => {
  describe('printExamples', () => {
    it('should handle multiple examples', () => {
      assert.strictEqual(printExamples([]), '')
      assert.strictEqual(printExamples(['example1']), '\n\n**Example**\n\n```ts\nexample1\n```')
      assert.strictEqual(
        printExamples(['example1', 'example2']),
        '\n\n**Example**\n\n```ts\nexample1\n```\n\n**Example**\n\n```ts\nexample2\n```'
      )
    })
  })
})
