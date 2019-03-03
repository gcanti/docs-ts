import * as assert from 'assert'
import { getExamples, fixExamples } from '../src/core'
import { module, func, documentable } from '../src/parser'
import { some, none } from 'fp-ts/lib/Option'

const f1 = func(documentable('f1', none, none, false, some(`import * as docs from 'mylibrary'`)), [])
const f2 = func(documentable('f2', none, none, false, some(`import * as parser from 'mylibrary/lib/parser'`)), [])
const m = module(['src', 'index.ts'], none, [], [], [f1, f2], [], [], [])

describe('getExamples', () => {
  it('should load the project name', () => {
    assert.deepStrictEqual(getExamples([m]), {
      // tslint:disable-next-line: quotemark
      'src-index.ts-f1.ts': "import * as docs from 'mylibrary'",
      // tslint:disable-next-line: quotemark
      'src-index.ts-f2.ts': "import * as parser from 'mylibrary/lib/parser'"
    })
  })
})

describe('fixExamplesProjectImports', () => {
  it('should load the project name', () => {
    assert.deepStrictEqual(fixExamples(getExamples([m]), 'mylibrary'), {
      // tslint:disable-next-line: quotemark
      'src-index.ts-f1.ts': "import * as docs from './src'",
      // tslint:disable-next-line: quotemark
      'src-index.ts-f2.ts': "import * as parser from './src/parser'"
    })
  })
})
