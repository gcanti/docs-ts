import * as assert from 'assert'
import * as E from 'fp-ts/Either'
import * as RA from 'fp-ts/ReadonlyArray'

import * as _ from '../src/Config'
import { assertRight } from './util'

describe.concurrent('Config', () => {
  describe.concurrent('decode', () => {
    it('should decode a valid configuration object', async () => {
      const config: unknown = {
        srcDir: 'src',
        outDir: 'docs',
        theme: 'pmarsceill/just-the-docs',
        enableSearch: true,
        enforceDescriptions: false,
        enforceExamples: false,
        exclude: RA.empty
      }

      assertRight(_.decode(config), (decoded) => assert.deepStrictEqual(decoded, config))
    })

    it('should decode a valid partial configuration object', async () => {
      const config: unknown = {
        exclude: RA.of('subdirectory/**/*.ts')
      }

      assertRight(_.decode({}), (decoded) => assert.deepStrictEqual(decoded, {}))
      assertRight(_.decode(config), (decoded) => assert.deepStrictEqual(decoded, config))
    })

    it('should not decode a configuration object with invalid keys', async () => {
      const config: unknown = {
        srcDir: 'src',
        outDir: 'docs',
        theme: 1,
        enableSearch: true,
        enforceDescriptions: false,
        enforceExamples: false,
        exclude: RA.empty
      }

      assert.deepStrictEqual(
        _.decode(config),
        E.left(`optional property "theme"
└─ cannot decode 1, should be string`)
      )
    })
  })
})
