/**
 * @since 0.6.0
 */
import * as E from 'fp-ts/Either'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { constVoid, Endomorphism, flow, pipe } from 'fp-ts/function'
import * as TD from 'io-ts/TaskDecoder'
import { spawnSync } from 'child_process'
import * as path from 'path'

import * as Config from './Config'
import * as FS from './FileSystem'
import * as L from './Logger'
import { printModule } from './Markdown'
import { Documentable, Module } from './Module'
import * as P from './Parser'

const CONFIG_FILE_NAME = 'docs-ts.json'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.6.0
 */
export interface Capabilities extends FS.FileSystem, L.Logger {}

/**
 * @category model
 * @since 0.6.0
 */
export interface Effect<A> extends RTE.ReaderTaskEither<Capabilities, string, A> {}

/**
 * @category model
 * @since 0.6.0
 */
export interface Environment {
  readonly capabilities: Capabilities
  readonly settings: Config.Settings
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Program<A> extends RTE.ReaderTaskEither<Environment, string, A> {}

// -------------------------------------------------------------------------------------
// decoders
// -------------------------------------------------------------------------------------

interface PackageJSON {
  readonly name: string
  readonly homepage: string
}

const PackageJSONDecoder = pipe(TD.type({ name: TD.string }), TD.intersect(TD.partial({ homepage: TD.string })))

// -------------------------------------------------------------------------------------
// files
// -------------------------------------------------------------------------------------

const readFile = (path: string): Effect<FS.File> =>
  pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(C => C.readFile(path)),
    RTE.map(content => FS.File(path, content, false))
  )

const readFiles: (paths: ReadonlyArray<string>) => Effect<ReadonlyArray<FS.File>> = RA.traverse(RTE.ApplicativePar)(
  readFile
)

const writeFile = (file: FS.File): Effect<void> => {
  const overwrite: Effect<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(C =>
      pipe(
        C.debug(`Overwriting file ${file.path}`),
        TE.chain(() => C.writeFile(file.path, file.content))
      )
    )
  )

  const skip: Effect<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(C => pipe(C.debug(`File ${file.path} already exists, skipping creation`)))
  )

  const write: Effect<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(C => pipe(C.writeFile(file.path, file.content)))
  )

  return pipe(
    RTE.ask<Capabilities>(),
    RTE.chain(C => RTE.fromTaskEither(C.exists(file.path))),
    RTE.chain(exists => (exists ? (file.overwrite ? overwrite : skip) : write))
  )
}

const writeFiles: (files: ReadonlyArray<FS.File>) => Effect<void> = flow(
  RA.traverse(RTE.ApplicativePar)(writeFile),
  RTE.map(constVoid)
)

const readPackageJSON: Effect<PackageJSON> = pipe(
  RTE.ask<Capabilities>(),
  RTE.chainTaskEitherK(capabilities =>
    pipe(
      capabilities.readFile(path.join(process.cwd(), 'package.json')),
      TE.mapLeft(() => `Unable to read package.json in "${process.cwd()}"`),
      TE.chainEitherK(json =>
        E.parseJSON(
          json,
          flow(E.toError, err => String(err.message))
        )
      ),
      TE.chain(json =>
        pipe(
          PackageJSONDecoder.decode(json),
          TE.mapLeft(decodeError => `Unable to decode package.json:\n${TD.draw(decodeError)}`)
        )
      ),
      TE.chain(({ name, homepage }) =>
        pipe(
          capabilities.debug(`Project name detected: ${name}`),
          TE.chain(() =>
            pipe(
              O.fromNullable(homepage),
              TE.fromOption(() => `Missing homepage in package.json`),
              TE.map(homepage => ({ name, homepage }))
            )
          )
        )
      )
    )
  )
)

const readSourcePaths: Program<ReadonlyArray<string>> = pipe(
  RTE.ask<Environment, string>(),
  RTE.chainTaskEitherK(({ capabilities, settings }) =>
    pipe(
      capabilities.search(path.join(settings.srcDir, '**', '*.ts'), settings.exclude),
      TE.map(RA.map(path.normalize)),
      TE.chainFirst(paths => pipe(capabilities.info(`Found ${paths.length} modules`)))
    )
  )
)

const readSourceFiles: Program<ReadonlyArray<FS.File>> = pipe(
  RTE.ask<Environment, string>(),
  RTE.chain(({ capabilities }) =>
    pipe(
      readSourcePaths,
      RTE.chainTaskEitherK(paths => pipe(capabilities, readFiles(paths)))
    )
  )
)

// -------------------------------------------------------------------------------------
// parsers
// -------------------------------------------------------------------------------------

const parseFiles = (files: ReadonlyArray<FS.File>): Program<ReadonlyArray<Module>> =>
  pipe(
    RTE.ask<Environment, string>(),
    RTE.chainFirst(({ capabilities }) => RTE.fromTaskEither(capabilities.debug('Parsing files...'))),
    RTE.chain(() =>
      pipe(
        P.parseFiles(files),
        RTE.local(({ settings }) => settings)
      )
    )
  )

// -------------------------------------------------------------------------------------
// examples
// -------------------------------------------------------------------------------------

const foldFiles = M.fold(RA.getMonoid<FS.File>())

const getExampleFiles = (modules: ReadonlyArray<Module>): Program<ReadonlyArray<FS.File>> =>
  pipe(
    RTE.ask<Environment, string>(),
    RTE.map(env =>
      pipe(
        modules,
        RA.chain(module => {
          const prefix = module.path.join('-')

          const getDocumentableExamples = (documentable: Documentable): ReadonlyArray<FS.File> =>
            pipe(
              documentable.examples,
              RA.mapWithIndex((i, content) =>
                FS.File(
                  path.join(env.settings.outDir, 'examples', `${prefix}-${documentable.name}-${i}.ts`),
                  `${content}\n`,
                  true
                )
              )
            )

          const moduleExamples = getDocumentableExamples(module)
          const methods = pipe(
            module.classes,
            RA.chain(c =>
              foldFiles([
                pipe(c.methods, RA.chain(getDocumentableExamples)),
                pipe(c.staticMethods, RA.chain(getDocumentableExamples))
              ])
            )
          )
          const interfaces = pipe(module.interfaces, RA.chain(getDocumentableExamples))
          const typeAliases = pipe(module.typeAliases, RA.chain(getDocumentableExamples))
          const constants = pipe(module.constants, RA.chain(getDocumentableExamples))
          const functions = pipe(module.functions, RA.chain(getDocumentableExamples))

          return foldFiles([moduleExamples, methods, interfaces, typeAliases, constants, functions])
        })
      )
    )
  )

const addAssertImport = (code: string): string =>
  code.indexOf('assert.') !== -1 ? `import * as assert from 'assert'\n${code}` : code

const replaceProjectName = (source: string): Program<string> =>
  pipe(
    RTE.ask<Environment>(),
    RTE.map(({ settings }) => {
      // Matches imports of the form: `import { foo } from 'projectName'`
      const root = new RegExp(`from '${settings.projectName}'`, 'g')
      // Matches imports of the form: `import { foo } from 'projectName/lib/...'`
      const module = new RegExp(`from '${settings.projectName}/lib/`, 'g')
      // Matches immports of the form: `import { foo } from 'projectName/...'`
      const other = new RegExp(`from '${settings.projectName}/`, 'g')

      return source
        .replace(root, `from '../../${settings.srcDir}'`)
        .replace(module, `from '../../${settings.srcDir}/`)
        .replace(other, `from '../../${settings.srcDir}/`)
    })
  )

const handleImports: (files: ReadonlyArray<FS.File>) => Program<ReadonlyArray<FS.File>> = RA.traverse(
  RTE.ApplicativePar
)(file =>
  pipe(
    replaceProjectName(file.content),
    RTE.map(addAssertImport),
    RTE.map(content => FS.File(file.path, content, file.overwrite))
  )
)

const getExampleIndex = (examples: ReadonlyArray<FS.File>): Program<FS.File> => {
  const content = pipe(
    examples,
    RA.map(example => `import './${path.basename(example.path)}'`),
    RA.foldMap(M.monoidString)(example => `${example}\n`)
  )
  return pipe(
    RTE.ask<Environment, string>(),
    RTE.map(env => FS.File(path.join(env.settings.outDir, 'examples', 'index.ts'), `${content}\n`, true))
  )
}

const cleanExamples: Program<void> = pipe(
  RTE.ask<Environment, string>(),
  RTE.chainTaskEitherK(({ capabilities, settings }) => capabilities.remove(path.join(settings.outDir, 'examples')))
)

const spawnTsNode: Program<void> = pipe(
  RTE.ask<Environment, string>(),
  RTE.chainFirst(({ capabilities }) => RTE.fromTaskEither(capabilities.debug('Type checking examples...'))),
  RTE.chain(({ settings }) =>
    RTE.fromIOEither(() => {
      const executableName = process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node'
      const { status } = spawnSync(executableName, [path.join(settings.outDir, 'examples', 'index.ts')], {
        stdio: 'inherit'
      })
      return status === 0 ? E.right(undefined) : E.left('Type checking error')
    })
  )
)

const writeExamples = (examples: ReadonlyArray<FS.File>): Program<void> =>
  pipe(
    RTE.ask<Environment, string>(),
    RTE.chainFirst(({ capabilities }) => RTE.fromTaskEither(capabilities.debug('Writing examples...'))),
    RTE.chain(({ capabilities }) =>
      pipe(
        getExampleIndex(examples),
        RTE.map(index => RA.cons(index, examples)),
        RTE.chainTaskEitherK(files => pipe(capabilities, writeFiles(files)))
      )
    )
  )

const typeCheckExamples = (modules: ReadonlyArray<Module>): Program<void> =>
  pipe(
    getExampleFiles(modules),
    RTE.chain(handleImports),
    RTE.chain(examples =>
      examples.length === 0
        ? cleanExamples
        : pipe(
            writeExamples(examples),
            RTE.chain(() => spawnTsNode),
            RTE.chain(() => cleanExamples)
          )
    )
  )

// -------------------------------------------------------------------------------------
// markdown
// -------------------------------------------------------------------------------------

const getHome: Program<FS.File> = pipe(
  RTE.ask<Environment, string>(),
  RTE.map(({ settings }) =>
    FS.File(
      path.join(settings.outDir, 'index.md'),
      `---
title: Home
nav_order: 1
---
`,
      false
    )
  )
)

const getModulesIndex: Program<FS.File> = pipe(
  RTE.ask<Environment, string>(),
  RTE.map(({ settings }) =>
    FS.File(
      path.join(settings.outDir, 'modules', 'index.md'),
      `---
title: Modules
has_children: true
permalink: /docs/modules
nav_order: 2
---`,
      false
    )
  )
)

const replace = (searchValue: string | RegExp, replaceValue: string): Endomorphism<string> => s =>
  s.replace(searchValue, replaceValue)

const resolveConfigYML = (previousContent: string, settings: Config.Settings): string =>
  pipe(
    previousContent,
    replace(/^remote_theme:.*$/m, `remote_theme: ${settings.theme}`),
    replace(/^search_enabled:.*$/m, `search_enabled: ${settings.enableSearch}`),
    replace(
      /^  '\S* on GitHub':\n    - '.*'/m,
      `  '${settings.projectName} on GitHub':\n    - '${settings.projectHomepage}'`
    )
  )

const getConfigYML: Program<FS.File> = pipe(
  RTE.ask<Environment, string>(),
  RTE.chainTaskEitherK(({ capabilities, settings }) => {
    const filePath = path.join(settings.outDir, '_config.yml')
    return pipe(
      capabilities.exists(filePath),
      TE.chain(exists =>
        exists
          ? pipe(
              capabilities.readFile(filePath),
              TE.map(content => FS.File(filePath, resolveConfigYML(content, settings), false))
            )
          : TE.of(
              FS.File(
                filePath,
                `remote_theme: ${settings.theme}

# Enable or disable the site search
search_enabled: ${settings.enableSearch}

# Aux links for the upper right navigation
aux_links:
  '${settings.projectName} on Github:
    - '${settings.projectHomepage}'`,
                false
              )
            )
      )
    )
  })
)

const getMarkdownOutputPath = (module: Module): Program<string> =>
  pipe(
    RTE.ask<Environment, string>(),
    RTE.map(({ settings }) => path.join(settings.outDir, 'modules', `${module.path.slice(1).join(path.sep)}.md`))
  )

const getModuleMarkdownFiles = (modules: ReadonlyArray<Module>): Program<ReadonlyArray<FS.File>> =>
  pipe(
    modules,
    RA.traverseWithIndex(RTE.ApplicativePar)((order, module) =>
      pipe(
        getMarkdownOutputPath(module),
        RTE.bindTo('outputPath'),
        RTE.bind('content', () => RTE.right(printModule(module, order))),
        RTE.map(({ content, outputPath }) => FS.File(outputPath, content, true))
      )
    )
  )

const getMarkdownFiles = (modules: ReadonlyArray<Module>): Program<ReadonlyArray<FS.File>> =>
  pipe(
    RA.sequence(RTE.ApplicativePar)([getHome, getModulesIndex, getConfigYML]),
    RTE.chain(meta =>
      pipe(
        getModuleMarkdownFiles(modules),
        RTE.map(files => RA.getMonoid<FS.File>().concat(meta, files))
      )
    )
  )

const writeMarkdownFiles = (files: ReadonlyArray<FS.File>): Program<void> =>
  pipe(
    RTE.ask<Environment, string>(),
    RTE.chainFirst<Environment, string, Environment, void>(({ capabilities, settings }) => {
      const outPattern = path.join(settings.outDir, '**/*.ts.md')
      return pipe(
        capabilities.debug(`Cleaning up docs folder: deleting ${outPattern}`),
        TE.chain(() => capabilities.remove(outPattern)),
        RTE.fromTaskEither
      )
    }),
    RTE.chainTaskEitherK(({ capabilities }) =>
      pipe(
        capabilities.debug('Writing markdown files...'),
        TE.chain(() => pipe(capabilities, writeFiles(files)))
      )
    )
  )

// -------------------------------------------------------------------------------------
// config
// -------------------------------------------------------------------------------------

const getDefaultSettings = (projectName: string, projectHomepage: string): Config.Settings =>
  pipe(Config.build(projectName, projectHomepage), Config.resolveSettings)

const hasConfiguration: Effect<boolean> = pipe(
  RTE.ask<Capabilities>(),
  RTE.chainTaskEitherK(C =>
    pipe(
      C.debug('Checking for configuration file...'),
      TE.chain(() => C.exists(path.join(process.cwd(), CONFIG_FILE_NAME)))
    )
  )
)

const readConfiguration: Effect<FS.File> = pipe(
  RTE.ask<Capabilities>(),
  RTE.chain(() => readFile(path.join(process.cwd(), CONFIG_FILE_NAME)))
)

const parseConfiguration = (defaultSettings: Config.Settings) => (file: FS.File): Effect<Config.Settings> =>
  pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(C =>
      pipe(
        E.parseJSON(file.content, toErrorMsg),
        TE.fromEither,
        TE.chainFirst(() => C.info(`Found configuration file`)),
        TE.chainFirst(() => C.debug(`Parsing configuration file found at: ${file.path}`)),
        TE.chain(Config.decode),
        TE.bimap(
          decodeError => `Invalid configuration file detected:\n${decodeError}`,
          settings => ({ ...defaultSettings, ...settings })
        )
      )
    )
  )

const useDefaultSettings = (defaultSettings: Config.Settings): Effect<Config.Settings> =>
  pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(C =>
      pipe(
        C.info('No configuration file detected, using default settings'),
        TE.map(() => defaultSettings)
      )
    )
  )

const getDocsConfiguration = (projectName: string, projectHomepage: string): Effect<Config.Settings> =>
  pipe(
    hasConfiguration,
    RTE.bindTo('hasConfig'),
    RTE.bind('defaultSettings', () => RTE.right(getDefaultSettings(projectName, projectHomepage))),
    RTE.chain(({ defaultSettings, hasConfig }) =>
      hasConfig
        ? pipe(readConfiguration, RTE.chain(parseConfiguration(defaultSettings)))
        : useDefaultSettings(defaultSettings)
    )
  )

// -------------------------------------------------------------------------------------
// program
// -------------------------------------------------------------------------------------

/**
 * @category program
 * @since 0.6.0
 */
export const main: Effect<void> = pipe(
  RTE.ask<Capabilities>(),
  RTE.chain(capabilities =>
    pipe(
      readPackageJSON,
      RTE.chain(pkg =>
        pipe(
          getDocsConfiguration(pkg.name, pkg.homepage),
          RTE.chainTaskEitherK(settings => {
            const program = pipe(
              readSourceFiles,
              RTE.chain(parseFiles),
              RTE.chainFirst(typeCheckExamples),
              RTE.chain(getMarkdownFiles),
              RTE.chain(writeMarkdownFiles)
            )
            return program({ capabilities, settings })
          })
        )
      )
    )
  )
)

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

const toErrorMsg: (u: unknown) => string = flow(E.toError, err => String(err.message))
