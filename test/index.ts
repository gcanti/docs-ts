import * as assert from 'assert'

describe('index', () => {
  it('check exported modules', () => {
    const docsts = require('../src')

    assert.deepStrictEqual(
      docsts['main'] !== undefined,
      true,
      'A "main" function is not exported from src/index.ts'
    )
  })
})