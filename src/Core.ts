/**
 * @since 0.6.0
 */
import * as Either from 'fp-ts/Either'
import { constVoid, flow, pipe } from 'fp-ts/function'
import * as Json from 'fp-ts/Json'
import * as Monoid from 'fp-ts/Monoid'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as ReadonlyArray from 'fp-ts/ReadonlyArray'
import * as S from 'fp-ts/string'
import * as TaskEither from 'fp-ts/TaskEither'
import * as Decoder from 'io-ts/Decoder'
import * as path from 'path'
import * as ast from 'ts-morph'

import * as Config from './Config'
import { File, FileSystem } from './FileSystem'
import { Logger } from './Logger'
import { printModule } from './Markdown'
import { Documentable, Module } from './Module'
import * as Parser from './Parser'

/**
 * @category main
 * @since 0.6.0
 */
export const main: Program<void> = pipe(
  RTE.Do,
  RTE.bind('capabilities', () => RTE.ask<Capabilities>()),
  RTE.bind('pkg', () => parsePackageJSON),
  RTE.bind('config', ({ pkg }) => getConfig(pkg.name, pkg.homepage)),
  RTE.chainTaskEitherK(({ config, capabilities }) => {
    const program = pipe(
      readSourceFiles,
      RTE.flatMap(parseFiles),
      RTE.tap(typeCheckExamples),
      RTE.flatMap(getMarkdownFiles),
      RTE.flatMap(writeMarkdownFiles)
    )
    return program({ ...capabilities, config })
  })
)

// -------------------------------------------------------------------------------------
// PackageJSON
// -------------------------------------------------------------------------------------

interface PackageJSON {
  readonly name: string
  readonly homepage: string
}

const PackageJSONDecoder = pipe(
  Decoder.struct({
    name: Decoder.string,
    homepage: Decoder.string
  })
)

const parsePackageJSON: Program<PackageJSON> = ({ fileSystem }) => {
  const read = pipe(
    fileSystem.readFile(path.join(process.cwd(), 'package.json')),
    TaskEither.mapLeft(() => `Unable to read package.json in "${process.cwd()}"`)
  )
  const parse = (packageJsonSource: string) =>
    pipe(
      Json.parse(packageJsonSource),
      Either.mapLeft((u) => Either.toError(u).message),
      TaskEither.fromEither
    )
  const decode = (json: Json.Json) =>
    pipe(
      PackageJSONDecoder.decode(json),
      Either.mapLeft((decodeError) => `Unable to decode package.json:\n${Decoder.draw(decodeError)}`),
      TaskEither.fromEither
    )
  return pipe(read, TaskEither.flatMap(parse), TaskEither.flatMap(decode))
}

// -------------------------------------------------------------------------------------
// config
// -------------------------------------------------------------------------------------

const CONFIG_FILE_NAME = 'docs-ts.json'

const getConfig =
  (projectName: string, projectHomepage: string): Program<Config.Config> =>
  (capabilities) => {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME)
    const defaultConfig = getDefaultConfig(projectName, projectHomepage)
    return pipe(
      capabilities.fileSystem.exists(configPath),
      TaskEither.flatMap((exists) =>
        exists
          ? pipe(
              capabilities.fileSystem.readFile(configPath),
              TaskEither.flatMap((content) =>
                TaskEither.fromEither(
                  pipe(
                    Json.parse(content),
                    Either.mapLeft((u) => Either.toError(u).message)
                  )
                )
              ),
              TaskEither.tap(() => capabilities.logger.info(`Configuration file found`)),
              TaskEither.flatMap((json) => TaskEither.fromEither(Config.decode(json))),
              TaskEither.bimap(
                (decodeError) => `Invalid configuration file detected:\n${decodeError}`,
                (config) => ({ ...defaultConfig, ...config })
              )
            )
          : pipe(
              capabilities.logger.info('No configuration file detected, using default configuration'),
              TaskEither.map(() => defaultConfig)
            )
      )
    )
  }

const getDefaultConfig = (projectName: string, projectHomepage: string): Config.Config => {
  return {
    projectName,
    projectHomepage,
    srcDir: 'src',
    outDir: 'docs',
    theme: 'pmarsceill/just-the-docs',
    enableSearch: true,
    enforceDescriptions: false,
    enforceExamples: false,
    enforceVersion: true,
    exclude: [],
    parseCompilerOptions: {},
    examplesCompilerOptions: {}
  }
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Capabilities {
  /**
   * Executes a command like:
   *
   * ```sh
   * ts-node examples/index.ts
   * ```
   *
   * where `command = ts-node` and `executable = examples/index.ts`
   */
  readonly spawn: (command: string, executable: string) => TaskEither.TaskEither<string, void>
  readonly fileSystem: FileSystem
  readonly logger: Logger
  readonly addFile: (file: File) => (project: ast.Project) => void
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Program<A> extends RTE.ReaderTaskEither<Capabilities, string, A> {}

/**
 * @category model
 * @since 0.6.0
 */
export interface EnvironmentWithConfig extends Capabilities {
  readonly config: Config.Config
}

/**
 * @category model
 * @since 0.6.0
 */
export interface ProgramWithConfig<A> extends RTE.ReaderTaskEither<EnvironmentWithConfig, string, A> {}

// -------------------------------------------------------------------------------------
// filesystem APIs
// -------------------------------------------------------------------------------------

const readFile = (path: string): Program<File> =>
  pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(({ fileSystem }) => fileSystem.readFile(path)),
    RTE.map((content) => File(path, content, false))
  )

const readFiles: (paths: ReadonlyArray<string>) => Program<ReadonlyArray<File>> = ReadonlyArray.traverse(
  RTE.ApplicativePar
)(readFile)

const writeFile = (file: File): Program<void> => {
  const overwrite: Program<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(({ fileSystem, logger }) =>
      pipe(
        logger.debug(`Overwriting file ${file.path}`),
        TaskEither.flatMap(() => fileSystem.writeFile(file.path, file.content))
      )
    )
  )

  const skip: Program<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(({ logger }) => logger.debug(`File ${file.path} already exists, skipping creation`))
  )

  const write: Program<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(({ fileSystem }) => fileSystem.writeFile(file.path, file.content))
  )

  return pipe(
    RTE.ask<Capabilities>(),
    RTE.flatMap(({ fileSystem }) => RTE.fromTaskEither(fileSystem.exists(file.path))),
    RTE.flatMap((exists) => (exists ? (file.overwrite ? overwrite : skip) : write))
  )
}

const writeFiles: (files: ReadonlyArray<File>) => Program<void> = flow(
  ReadonlyArray.traverse(RTE.ApplicativePar)(writeFile),
  RTE.map(constVoid)
)

const readSourcePaths: ProgramWithConfig<ReadonlyArray<string>> = pipe(
  RTE.ask<EnvironmentWithConfig, string>(),
  RTE.chainTaskEitherK(({ fileSystem, logger, config }) =>
    pipe(
      fileSystem.search(path.join(config.srcDir, '**', '*.ts'), config.exclude),
      TaskEither.map(ReadonlyArray.map(path.normalize)),
      TaskEither.tap((paths) => pipe(logger.info(`${paths.length} module(s) found`)))
    )
  )
)

const readSourceFiles: ProgramWithConfig<ReadonlyArray<File>> = pipe(
  RTE.ask<EnvironmentWithConfig, string>(),
  RTE.flatMap((C) =>
    pipe(
      readSourcePaths,
      RTE.chainTaskEitherK((paths) => pipe(C, readFiles(paths)))
    )
  )
)

// -------------------------------------------------------------------------------------
// parsers
// -------------------------------------------------------------------------------------

const parseFiles = (files: ReadonlyArray<File>): ProgramWithConfig<ReadonlyArray<Module>> =>
  pipe(
    RTE.ask<EnvironmentWithConfig, string>(),
    RTE.tap(({ logger }) => RTE.fromTaskEither(logger.debug('Parsing files...'))),
    RTE.flatMap(() => Parser.parseFiles(files))
  )

// -------------------------------------------------------------------------------------
// examples
// -------------------------------------------------------------------------------------

const foldFiles = Monoid.concatAll(ReadonlyArray.getMonoid<File>())

const getExampleFiles = (modules: ReadonlyArray<Module>): ProgramWithConfig<ReadonlyArray<File>> =>
  pipe(
    RTE.ask<EnvironmentWithConfig, string>(),
    RTE.map((env) =>
      pipe(
        modules,
        ReadonlyArray.flatMap((module) => {
          const prefix = module.path.join('-')

          const getDocumentableExamples =
            (id: string) =>
            (documentable: Documentable): ReadonlyArray<File> =>
              pipe(
                documentable.examples,
                ReadonlyArray.mapWithIndex((i, content) =>
                  File(
                    path.join(env.config.outDir, 'examples', `${prefix}-${id}-${documentable.name}-${i}.ts`),
                    `${content}\n`,
                    true
                  )
                )
              )

          const moduleExamples = getDocumentableExamples('module')(module)
          const methods = pipe(
            module.classes,
            ReadonlyArray.flatMap((c) =>
              foldFiles([
                pipe(c.methods, ReadonlyArray.flatMap(getDocumentableExamples(`${c.name}-method`))),
                pipe(c.staticMethods, ReadonlyArray.flatMap(getDocumentableExamples(`${c.name}-staticmethod`)))
              ])
            )
          )
          const interfaces = pipe(module.interfaces, ReadonlyArray.flatMap(getDocumentableExamples('interface')))
          const typeAliases = pipe(module.typeAliases, ReadonlyArray.flatMap(getDocumentableExamples('typealias')))
          const constants = pipe(module.constants, ReadonlyArray.flatMap(getDocumentableExamples('constant')))
          const functions = pipe(module.functions, ReadonlyArray.flatMap(getDocumentableExamples('function')))

          return foldFiles([moduleExamples, methods, interfaces, typeAliases, constants, functions])
        })
      )
    )
  )

const addAssertImport = (code: string): string =>
  code.indexOf('assert.') !== -1 ? `import * as assert from 'assert'\n${code}` : code

const replaceProjectName = (source: string): ProgramWithConfig<string> =>
  pipe(
    RTE.ask<EnvironmentWithConfig>(),
    RTE.map(({ config }) => {
      const importRegex = (projectName: string) =>
        new RegExp(`from (?<quote>['"])${projectName}(?:/lib)?(?:/(?<path>.*))?\\k<quote>`, 'g')

      return source.replace(importRegex(config.projectName), (...args) => {
        const groups: { path?: string } = args[args.length - 1]
        return `from '../../src${groups.path ? `/${groups.path}` : ''}'`
      })
    })
  )

const handleImports: (files: ReadonlyArray<File>) => ProgramWithConfig<ReadonlyArray<File>> = ReadonlyArray.traverse(
  RTE.ApplicativePar
)((file) =>
  pipe(
    replaceProjectName(file.content),
    RTE.map(addAssertImport),
    RTE.map((content) => File(file.path, content, file.overwrite))
  )
)

const getExampleIndex = (examples: ReadonlyArray<File>): ProgramWithConfig<File> => {
  const content = pipe(
    examples,
    ReadonlyArray.foldMap(S.Monoid)((example) => `import './${path.basename(example.path, '.ts')}'\n`)
  )
  return pipe(
    RTE.ask<EnvironmentWithConfig, string>(),
    RTE.map((env) => File(path.join(env.config.outDir, 'examples', 'index.ts'), `${content}\n`, true))
  )
}

const cleanExamples: ProgramWithConfig<void> = pipe(
  RTE.ask<EnvironmentWithConfig, string>(),
  RTE.chainTaskEitherK(({ fileSystem, config }) => fileSystem.remove(path.join(config.outDir, 'examples')))
)

const spawnTsNode: ProgramWithConfig<void> = pipe(
  RTE.ask<EnvironmentWithConfig, string>(),
  RTE.tap(({ logger }) => RTE.fromTaskEither(logger.debug('Type checking examples...'))),
  RTE.chainTaskEitherK(({ spawn, config }) => {
    const command = process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node'
    const executable = path.join(process.cwd(), config.outDir, 'examples', 'index.ts')
    return spawn(command, executable)
  })
)

const writeExamples = (examples: ReadonlyArray<File>): ProgramWithConfig<void> =>
  pipe(
    RTE.ask<EnvironmentWithConfig, string>(),
    RTE.tap(({ logger }) => RTE.fromTaskEither(logger.debug('Writing examples...'))),
    RTE.flatMap((C) =>
      pipe(
        getExampleIndex(examples),
        RTE.map((index) => pipe(examples, ReadonlyArray.prepend(index))),
        RTE.chainTaskEitherK((files) => pipe(C, writeFiles(files)))
      )
    )
  )

const writeTsConfigJson: ProgramWithConfig<void> = pipe(
  RTE.ask<EnvironmentWithConfig, string>(),
  RTE.tap(({ logger }) => RTE.fromTaskEither(logger.debug('Writing examples tsconfig...'))),
  RTE.flatMap((env) =>
    writeFile(
      File(
        path.join(process.cwd(), env.config.outDir, 'examples', 'tsconfig.json'),
        JSON.stringify(
          {
            compilerOptions: env.config.examplesCompilerOptions
          },
          null,
          2
        ),
        true
      )
    )
  )
)

const typeCheckExamples = (modules: ReadonlyArray<Module>): ProgramWithConfig<void> =>
  pipe(
    getExampleFiles(modules),
    RTE.flatMap(handleImports),
    RTE.flatMap((examples) =>
      examples.length === 0
        ? cleanExamples
        : pipe(
            writeExamples(examples),
            RTE.flatMap(() => writeTsConfigJson),
            RTE.flatMap(() => spawnTsNode),
            RTE.flatMap(() => cleanExamples)
          )
    )
  )

// -------------------------------------------------------------------------------------
// markdown
// -------------------------------------------------------------------------------------

const getHome: ProgramWithConfig<File> = pipe(
  RTE.ask<EnvironmentWithConfig, string>(),
  RTE.map(({ config }) =>
    File(
      path.join(process.cwd(), config.outDir, 'index.md'),
      `---
title: Home
nav_order: 1
---
`,
      false
    )
  )
)

const getModulesIndex: ProgramWithConfig<File> = pipe(
  RTE.ask<EnvironmentWithConfig, string>(),
  RTE.map(({ config }) =>
    File(
      path.join(process.cwd(), config.outDir, 'modules', 'index.md'),
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

const replace =
  (searchValue: string | RegExp, replaceValue: string): ((s: string) => string) =>
  (s) =>
    s.replace(searchValue, replaceValue)

const resolveConfigYML = (previousContent: string, config: Config.Config): string =>
  pipe(
    previousContent,
    replace(/^remote_theme:.*$/m, `remote_theme: ${config.theme}`),
    replace(/^search_enabled:.*$/m, `search_enabled: ${config.enableSearch}`),
    replace(
      /^ {2}'\S* on GitHub':\n {4}- '.*'/m,
      `  '${config.projectName} on GitHub':\n    - '${config.projectHomepage}'`
    )
  )

const getHomepageNavigationHeader = (config: Config.Config): string => {
  const isGitHub = config.projectHomepage.toLowerCase().includes('github')
  return isGitHub ? config.projectName + ' on GitHub' : 'Homepage'
}

const getConfigYML: ProgramWithConfig<File> = pipe(
  RTE.ask<EnvironmentWithConfig, string>(),
  RTE.chainTaskEitherK(({ fileSystem, config }) => {
    const filePath = path.join(process.cwd(), config.outDir, '_config.yml')
    return pipe(
      fileSystem.exists(filePath),
      TaskEither.flatMap((exists) =>
        exists
          ? pipe(
              fileSystem.readFile(filePath),
              TaskEither.map((content) => File(filePath, resolveConfigYML(content, config), true))
            )
          : TaskEither.of(
              File(
                filePath,
                `remote_theme: ${config.theme}

# Enable or disable the site search
search_enabled: ${config.enableSearch}

# Aux links for the upper right navigation
aux_links:
  '${getHomepageNavigationHeader(config)}':
    - '${config.projectHomepage}'`,
                false
              )
            )
      )
    )
  })
)

const getMarkdownOutputPath = (module: Module): ProgramWithConfig<string> =>
  pipe(
    RTE.ask<EnvironmentWithConfig, string>(),
    RTE.map(({ config }) => path.join(config.outDir, 'modules', `${module.path.slice(1).join(path.sep)}.md`))
  )

const getModuleMarkdownFiles = (modules: ReadonlyArray<Module>): ProgramWithConfig<ReadonlyArray<File>> =>
  pipe(
    modules,
    RTE.traverseArrayWithIndex((order, module) =>
      pipe(
        getMarkdownOutputPath(module),
        RTE.bindTo('outputPath'),
        RTE.bind('content', () => RTE.right(printModule(module, order + 1))),
        RTE.map(({ content, outputPath }) => File(outputPath, content, true))
      )
    )
  )

const getMarkdownFiles = (modules: ReadonlyArray<Module>): ProgramWithConfig<ReadonlyArray<File>> =>
  pipe(
    RTE.sequenceArray([getHome, getModulesIndex, getConfigYML]),
    RTE.flatMap((meta) =>
      pipe(
        getModuleMarkdownFiles(modules),
        RTE.map((files) => ReadonlyArray.getMonoid<File>().concat(meta, files))
      )
    )
  )

const writeMarkdownFiles = (files: ReadonlyArray<File>): ProgramWithConfig<void> =>
  pipe(
    RTE.ask<EnvironmentWithConfig, string>(),
    RTE.chainFirst<EnvironmentWithConfig, string, EnvironmentWithConfig, void>(({ fileSystem, logger, config }) => {
      const outPattern = path.join(config.outDir, '**/*.ts.md')
      return pipe(
        logger.debug(`Cleaning up docs folder: deleting ${outPattern}`),
        TaskEither.flatMap(() => fileSystem.remove(outPattern)),
        RTE.fromTaskEither
      )
    }),
    RTE.chainTaskEitherK((C) =>
      pipe(
        C.logger.debug('Writing markdown files...'),
        TaskEither.flatMap(() => pipe(C, writeFiles(files)))
      )
    )
  )
