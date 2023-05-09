import * as assert from 'assert'
import { pipe } from 'fp-ts/function'
import * as RA from 'fp-ts/ReadonlyArray'

import * as _ from '../src/Config'
import { assertLeft,assertRight } from './util'

const defaultSettings = pipe(_.build('docs-ts', 'https://github.com/gcanti/docs-ts'), _.resolveSettings)

describe.concurrent('Config', () => {
  describe.concurrent('constructors/destructors', () => {
    it('build and resolveSettings', () => {
      assert.deepStrictEqual(defaultSettings, {
        projectName: 'docs-ts',
        projectHomepage: 'https://github.com/gcanti/docs-ts',
        srcDir: 'src',
        outDir: 'docs',
        theme: 'pmarsceill/just-the-docs',
        enableSearch: true,
        enforceDescriptions: false,
        enforceExamples: false,
        enforceVersion: true,
        exclude: RA.empty,
        compilerOptions: {}
      })
    })
  })

  describe.concurrent('combinators', () => {
    it('updateProjectHomepage', () => {
      const config = pipe(
        _.build('docs-ts', 'https://github.com/gcanti/docs-ts'),
        _.updateProjectHomepage('https://github.com/user/project'),
        _.resolveSettings
      )

      assert.deepStrictEqual(config, {
        ...defaultSettings,
        projectHomepage: 'https://github.com/user/project'
      })
    })

    it('updateSourceDir', () => {
      const config = pipe(
        _.build('docs-ts', 'https://github.com/gcanti/docs-ts'),
        _.updateSourceDir('newSrc'),
        _.resolveSettings
      )

      assert.deepStrictEqual(config, {
        ...defaultSettings,
        srcDir: 'newSrc'
      })
    })

    it('updateOutDir', () => {
      const config = pipe(
        _.build('docs-ts', 'https://github.com/gcanti/docs-ts'),
        _.updateOutDir('newOut'),
        _.resolveSettings
      )

      assert.deepStrictEqual(config, {
        ...defaultSettings,
        outDir: 'newOut'
      })
    })

    it('updateTheme', () => {
      const config = pipe(
        _.build('docs-ts', 'https://github.com/gcanti/docs-ts'),
        _.updateTheme('newTheme'),
        _.resolveSettings
      )

      assert.deepStrictEqual(config, {
        ...defaultSettings,
        theme: 'newTheme'
      })
    })

    it('updateSearchEnabled', () => {
      const config = pipe(
        _.build('docs-ts', 'https://github.com/gcanti/docs-ts'),
        _.updateSearchEnabled(false),
        _.resolveSettings
      )

      assert.deepStrictEqual(config, {
        ...defaultSettings,
        enableSearch: false
      })
    })

    it('updateEnforceDescriptions', () => {
      const config = pipe(
        _.build('docs-ts', 'https://github.com/gcanti/docs-ts'),
        _.updateEnforceDescriptions(true),
        _.resolveSettings
      )

      assert.deepStrictEqual(config, {
        ...defaultSettings,
        enforceDescriptions: true
      })
    })

    it('updateEnforceExamples', () => {
      const config = pipe(
        _.build('docs-ts', 'https://github.com/gcanti/docs-ts'),
        _.updateEnforceExamples(true),
        _.resolveSettings
      )

      assert.deepStrictEqual(config, {
        ...defaultSettings,
        enforceExamples: true
      })
    })

    it('updateEnforceVersion', () => {
      const config = pipe(
        _.build('docs-ts', 'https://github.com/gcanti/docs-ts'),
        _.updateEnforceVersion(false),
        _.resolveSettings
      )

      assert.deepStrictEqual(config, {
        ...defaultSettings,
        enforceVersion: false
      })
    })

    it('updateExclusions', () => {
      const config = pipe(
        _.build('docs-ts', 'https://github.com/gcanti/docs-ts'),
        _.updateExclusions(RA.of('subdirectory/**/*.ts')),
        _.resolveSettings
      )

      assert.deepStrictEqual(config, {
        ...defaultSettings,
        exclude: RA.of('subdirectory/**/*.ts')
      })
    })
  })

  describe.concurrent('utils', () => {
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

        assertRight(await _.decode(config)(), (decoded) => assert.deepStrictEqual(decoded, config))
      })

      it('should decode a valid partial configuration object', async () => {
        const config: unknown = {
          exclude: RA.of('subdirectory/**/*.ts')
        }

        assertRight(await _.decode({})(), (decoded) => assert.deepStrictEqual(decoded, {}))
        assertRight(await _.decode(config)(), (decoded) => assert.deepStrictEqual(decoded, config))
      })

      it('should not decode a configuration object with invalid keys', async () => {
        const config: unknown = {
          srcDir: 'src',
          outDir: 'docs',
          them: 'pmarsceill/just-the-docs',
          enableSrch: true,
          enforceDescriptions: false,
          enforceExamples: false,
          exclude: RA.empty
        }

        const expected =
          'cannot decode "enableSrch", should be a valid configuration property\n' +
          'cannot decode "them", should be a valid configuration property'

        assertLeft(await _.decode(config)(), (error) => assert.strict(error, expected))
      })
    })
  })
})
