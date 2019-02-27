import * as assert from 'assert'
import { getExamples } from '../src'
import { module, func, location } from '../src/parser'
import { some, none } from 'fp-ts/lib/Option'

describe('getExamples', () => {
  const f1 = func('f1', [], none, none, location(0, 0), false, some(`import * as docs from 'docs-ts'`))
  const f2 = func('f2', [], none, none, location(0, 0), false, some(`import * as parser from 'docs-ts/lib/parser'`))
  const m = module(['src', 'index.ts'], [], [], [f1, f2], [], [])

  it('should load the project name', () => {
    assert.deepStrictEqual(getExamples([m], 'docs-ts'), {
      // tslint:disable-next-line: quotemark
      'src-index.ts-f1.ts': "import * as docs from '../src'",
      // tslint:disable-next-line: quotemark
      'src-index.ts-f2.ts': "import * as parser from '../src/parser'"
    })
  })
})
