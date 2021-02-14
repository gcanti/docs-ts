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
import * as path from 'path'

import * as Config from './Config'
import { Example } from './Example'
import { File, FileSystem } from './FileSystem'
import { Logger } from './Logger'
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
export interface Capabilities {
  readonly example: Example
  readonly fileSystem: FileSystem
  readonly logger: Logger
  readonly ast: P.Ast
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Effect<A> extends RTE.ReaderTaskEither<Capabilities, string, A> {}

/**
 * @category model
 * @since 0.6.0
 */
export interface Environment extends Capabilities {
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

const readFile = (path: string): Effect<File> =>
  pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(({ fileSystem }) => fileSystem.readFile(path)),
    RTE.map(content => File(path, content, false))
  )

const readFiles: (paths: ReadonlyArray<string>) => Effect<ReadonlyArray<File>> = RA.traverse(RTE.ApplicativePar)(
  readFile
)

const writeFile = (file: File): Effect<void> => {
  const overwrite: Effect<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(({ fileSystem, logger }) =>
      pipe(
        logger.debug(`Overwriting file ${file.path}`),
        TE.chain(() => fileSystem.writeFile(file.path, file.content))
      )
    )
  )

  const skip: Effect<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(({ logger }) => logger.debug(`File ${file.path} already exists, skipping creation`))
  )

  const write: Effect<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(({ fileSystem }) => fileSystem.writeFile(file.path, file.content))
  )

  return pipe(
    RTE.ask<Capabilities>(),
    RTE.chain(({ fileSystem }) => RTE.fromTaskEither(fileSystem.exists(file.path))),
    RTE.chain(exists => (exists ? (file.overwrite ? overwrite : skip) : write))
  )
}

const writeFiles: (files: ReadonlyArray<File>) => Effect<void> = flow(
  RA.traverse(RTE.ApplicativePar)(writeFile),
  RTE.map(constVoid)
)

const readPackageJSON: Effect<PackageJSON> = pipe(
  RTE.ask<Capabilities>(),
  RTE.chainTaskEitherK(({ fileSystem, logger }) =>
    pipe(
      fileSystem.readFile(path.join(process.cwd(), 'package.json')),
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
          logger.debug(`Project name detected: ${name}`),
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
  RTE.chainTaskEitherK(({ fileSystem, logger, settings }) =>
    pipe(
      fileSystem.search(path.join(settings.srcDir, '**', '*.ts'), settings.exclude),
      TE.map(RA.map(path.normalize)),
      TE.chainFirst(paths => pipe(logger.info(`Found ${paths.length} modules`)))
    )
  )
)

const readSourceFiles: Program<ReadonlyArray<File>> = pipe(
  RTE.ask<Environment, string>(),
  RTE.chain(C =>
    pipe(
      readSourcePaths,
      RTE.chainTaskEitherK(paths => pipe(C, readFiles(paths)))
    )
  )
)

// -------------------------------------------------------------------------------------
// parsers
// -------------------------------------------------------------------------------------

const parseFiles = (files: ReadonlyArray<File>): Program<ReadonlyArray<Module>> =>
  pipe(
    RTE.ask<Environment, string>(),
    RTE.chainFirst(({ logger }) => RTE.fromTaskEither(logger.debug('Parsing files...'))),
    RTE.chain(() => P.parseFiles(files))
  )

// -------------------------------------------------------------------------------------
// examples
// -------------------------------------------------------------------------------------

const foldFiles = M.fold(RA.getMonoid<File>())

const getExampleFiles = (modules: ReadonlyArray<Module>): Program<ReadonlyArray<File>> =>
  pipe(
    RTE.ask<Environment, string>(),
    RTE.map(env =>
      pipe(
        modules,
        RA.chain(module => {
          const prefix = module.path.join('-')

          const getDocumentableExamples = (documentable: Documentable): ReadonlyArray<File> =>
            pipe(
              documentable.examples,
              RA.mapWithIndex((i, content) =>
                File(
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

const handleImports: (files: ReadonlyArray<File>) => Program<ReadonlyArray<File>> = RA.traverse(RTE.ApplicativePar)(
  file =>
    pipe(
      replaceProjectName(file.content),
      RTE.map(addAssertImport),
      RTE.map(content => File(file.path, content, file.overwrite))
    )
)

const getExampleIndex = (examples: ReadonlyArray<File>): Program<File> => {
  const content = pipe(
    examples,
    RA.foldMap(M.monoidString)(example => `import './${path.basename(example.path)}'\n`)
  )
  return pipe(
    RTE.ask<Environment, string>(),
    RTE.map(env => File(path.join(env.settings.outDir, 'examples', 'index.ts'), `${content}\n`, true))
  )
}

const cleanExamples: Program<void> = pipe(
  RTE.ask<Environment, string>(),
  RTE.chainTaskEitherK(({ fileSystem, settings }) => fileSystem.remove(path.join(settings.outDir, 'examples')))
)

const spawnTsNode: Program<void> = pipe(
  RTE.ask<Environment, string>(),
  RTE.chainFirst(({ logger }) => RTE.fromTaskEither(logger.debug('Type checking examples...'))),
  RTE.chainTaskEitherK(({ example, settings }) => {
    const command = process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node'
    const executablePath = path.join(process.cwd(), settings.outDir, 'examples', 'index.ts')
    return example.run(command, executablePath)
  })
)

const writeExamples = (examples: ReadonlyArray<File>): Program<void> =>
  pipe(
    RTE.ask<Environment, string>(),
    RTE.chainFirst(({ logger }) => RTE.fromTaskEither(logger.debug('Writing examples...'))),
    RTE.chain(C =>
      pipe(
        getExampleIndex(examples),
        RTE.map(index => RA.cons(index, examples)),
        RTE.chainTaskEitherK(files => pipe(C, writeFiles(files)))
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

const getHome: Program<File> = pipe(
  RTE.ask<Environment, string>(),
  RTE.map(({ settings }) =>
    File(
      path.join(process.cwd(), settings.outDir, 'index.md'),
      `---
title: Home
nav_order: 1
---
`,
      false
    )
  )
)

const getModulesIndex: Program<File> = pipe(
  RTE.ask<Environment, string>(),
  RTE.map(({ settings }) =>
    File(
      path.join(process.cwd(), settings.outDir, 'modules', 'index.md'),
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

/* tslint:disable:no-regex-spaces */
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
/* tslint:enable:no-regex-spaces */

const getConfigYML: Program<File> = pipe(
  RTE.ask<Environment, string>(),
  RTE.chainTaskEitherK(({ fileSystem, settings }) => {
    const filePath = path.join(process.cwd(), settings.outDir, '_config.yml')
    return pipe(
      fileSystem.exists(filePath),
      TE.chain(exists =>
        exists
          ? pipe(
              fileSystem.readFile(filePath),
              TE.map(content => File(filePath, resolveConfigYML(content, settings), true))
            )
          : TE.of(
              File(
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

const getModuleMarkdownFiles = (modules: ReadonlyArray<Module>): Program<ReadonlyArray<File>> =>
  pipe(
    modules,
    RA.traverseWithIndex(RTE.ApplicativePar)((order, module) =>
      pipe(
        getMarkdownOutputPath(module),
        RTE.bindTo('outputPath'),
        RTE.bind('content', () => RTE.right(printModule(module, order + 1))),
        RTE.map(({ content, outputPath }) => File(outputPath, content, true))
      )
    )
  )

const getMarkdownFiles = (modules: ReadonlyArray<Module>): Program<ReadonlyArray<File>> =>
  pipe(
    RA.sequence(RTE.ApplicativePar)([getHome, getModulesIndex, getConfigYML]),
    RTE.chain(meta =>
      pipe(
        getModuleMarkdownFiles(modules),
        RTE.map(files => RA.getMonoid<File>().concat(meta, files))
      )
    )
  )

const writeMarkdownFiles = (files: ReadonlyArray<File>): Program<void> =>
  pipe(
    RTE.ask<Environment, string>(),
    RTE.chainFirst<Environment, string, Environment, void>(({ fileSystem, logger, settings }) => {
      const outPattern = path.join(settings.outDir, '**/*.ts.md')
      return pipe(
        logger.debug(`Cleaning up docs folder: deleting ${outPattern}`),
        TE.chain(() => fileSystem.remove(outPattern)),
        RTE.fromTaskEither
      )
    }),
    RTE.chainTaskEitherK(C =>
      pipe(
        C.logger.debug('Writing markdown files...'),
        TE.chain(() => pipe(C, writeFiles(files)))
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
  RTE.chainTaskEitherK(({ fileSystem, logger }) =>
    pipe(
      logger.debug('Checking for configuration file...'),
      TE.chain(() => fileSystem.exists(path.join(process.cwd(), CONFIG_FILE_NAME)))
    )
  )
)

const readConfiguration: Effect<File> = pipe(
  RTE.ask<Capabilities>(),
  RTE.chain(() => readFile(path.join(process.cwd(), CONFIG_FILE_NAME)))
)

const parseConfiguration = (defaultSettings: Config.Settings) => (file: File): Effect<Config.Settings> =>
  pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(({ logger }) =>
      pipe(
        E.parseJSON(file.content, toErrorMsg),
        TE.fromEither,
        TE.chainFirst(() => logger.info(`Found configuration file`)),
        TE.chainFirst(() => logger.debug(`Parsing configuration file found at: ${file.path}`)),
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
    RTE.chainTaskEitherK(({ logger }) =>
      pipe(
        logger.info('No configuration file detected, using default settings'),
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
            return program({ ...capabilities, settings })
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
