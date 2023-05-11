/**
 * @since 0.6.0
 */
import { constVoid, flow, pipe } from 'fp-ts/function'
import * as Monoid from 'fp-ts/Monoid'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as ReadonlyArray from 'fp-ts/ReadonlyArray'
import * as S from 'fp-ts/string'
import * as TaskEither from 'fp-ts/TaskEither'
import * as path from 'path'
import * as ast from 'ts-morph'

import * as _ from './internal'
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
  RTE.bind('config', () => _.toReaderTaskEither(_.getConfig)),
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
// config
// -------------------------------------------------------------------------------------

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
  readonly spawn: (command: string, executable: string) => TaskEither.TaskEither<Error, void>
  readonly addFile: (file: _.File) => (project: ast.Project) => void
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Program<A> extends RTE.ReaderTaskEither<Capabilities, Error, A> {}

/**
 * @category model
 * @since 0.6.0
 */
export interface EnvironmentWithConfig extends Capabilities {
  readonly config: _.Config
}

/**
 * @category model
 * @since 0.6.0
 */
export interface ProgramWithConfig<A> extends RTE.ReaderTaskEither<EnvironmentWithConfig, Error, A> {}

// -------------------------------------------------------------------------------------
// filesystem APIs
// -------------------------------------------------------------------------------------

const readFile = (path: string): Program<_.File> =>
  pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(() => _.toTaskEither(_.readFile(path))),
    RTE.map((content) => _.createFile(path, content, false))
  )

const readFiles: (paths: ReadonlyArray<string>) => Program<ReadonlyArray<_.File>> = ReadonlyArray.traverse(
  RTE.ApplicativePar
)(readFile)

const writeFile = (file: _.File): Program<void> => {
  const overwrite: Program<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(() =>
      pipe(
        _.toTaskEither(_.debug(`Overwriting file ${file.path}`)),
        TaskEither.flatMap(() => _.toTaskEither(_.writeFile(file.path, file.content)))
      )
    )
  )

  const skip: Program<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(() => _.toTaskEither(_.debug(`File ${file.path} already exists, skipping creation`)))
  )

  const write: Program<void> = pipe(
    RTE.ask<Capabilities>(),
    RTE.chainTaskEitherK(() => _.toTaskEither(_.writeFile(file.path, file.content)))
  )

  return pipe(
    RTE.ask<Capabilities>(),
    RTE.flatMap(() => RTE.fromTaskEither(_.toTaskEither(_.exists(file.path)))),
    RTE.flatMap((exists) => (exists ? (file.overwrite ? overwrite : skip) : write))
  )
}

const writeFiles: (files: ReadonlyArray<_.File>) => Program<void> = flow(
  ReadonlyArray.traverse(RTE.ApplicativePar)(writeFile),
  RTE.map(constVoid)
)

const readSourcePaths: ProgramWithConfig<ReadonlyArray<string>> = pipe(
  RTE.ask<EnvironmentWithConfig, Error>(),
  RTE.chainTaskEitherK(({ config }) =>
    pipe(
      _.toTaskEither(_.search(path.join(config.srcDir, '**', '*.ts'), config.exclude)),
      TaskEither.map(ReadonlyArray.map(path.normalize)),
      TaskEither.tap((paths) => _.toTaskEither(_.info(`${paths.length} module(s) found`)))
    )
  )
)

const readSourceFiles: ProgramWithConfig<ReadonlyArray<_.File>> = pipe(
  RTE.ask<EnvironmentWithConfig, Error>(),
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

const parseFiles = (files: ReadonlyArray<_.File>): ProgramWithConfig<ReadonlyArray<Module>> =>
  pipe(
    RTE.ask<EnvironmentWithConfig, Error>(),
    RTE.tap(() => RTE.fromTaskEither(_.toTaskEither(_.debug('Parsing files...')))),
    RTE.flatMap(() =>
      pipe(
        Parser.parseFiles(files),
        RTE.mapLeft((s) => new Error(s))
      )
    )
  )

// -------------------------------------------------------------------------------------
// examples
// -------------------------------------------------------------------------------------

const foldFiles = Monoid.concatAll(ReadonlyArray.getMonoid<_.File>())

const getExampleFiles = (modules: ReadonlyArray<Module>): ProgramWithConfig<ReadonlyArray<_.File>> =>
  pipe(
    RTE.ask<EnvironmentWithConfig, Error>(),
    RTE.map((env) =>
      pipe(
        modules,
        ReadonlyArray.flatMap((module) => {
          const prefix = module.path.join('-')

          const getDocumentableExamples =
            (id: string) =>
            (documentable: Documentable): ReadonlyArray<_.File> =>
              pipe(
                documentable.examples,
                ReadonlyArray.mapWithIndex((i, content) =>
                  _.createFile(
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

const handleImports: (files: ReadonlyArray<_.File>) => ProgramWithConfig<ReadonlyArray<_.File>> =
  ReadonlyArray.traverse(RTE.ApplicativePar)((file) =>
    pipe(
      replaceProjectName(file.content),
      RTE.map(addAssertImport),
      RTE.map((content) => _.createFile(file.path, content, file.overwrite))
    )
  )

const getExampleIndex = (examples: ReadonlyArray<_.File>): ProgramWithConfig<_.File> => {
  const content = pipe(
    examples,
    ReadonlyArray.foldMap(S.Monoid)((example) => `import './${path.basename(example.path, '.ts')}'\n`)
  )
  return pipe(
    RTE.ask<EnvironmentWithConfig, Error>(),
    RTE.map((env) => _.createFile(path.join(env.config.outDir, 'examples', 'index.ts'), `${content}\n`, true))
  )
}

const cleanExamples: ProgramWithConfig<void> = pipe(
  RTE.ask<EnvironmentWithConfig, Error>(),
  RTE.chainTaskEitherK(({ config }) => _.toTaskEither(_.remove(path.join(config.outDir, 'examples'))))
)

const spawnTsNode: ProgramWithConfig<void> = pipe(
  RTE.ask<EnvironmentWithConfig, Error>(),
  RTE.tap(() => RTE.fromTaskEither(_.toTaskEither(_.debug('Type checking examples...')))),
  RTE.chainTaskEitherK(({ spawn, config }) => {
    const command = process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node'
    const executable = path.join(process.cwd(), config.outDir, 'examples', 'index.ts')
    return spawn(command, executable)
  })
)

const writeExamples = (examples: ReadonlyArray<_.File>): ProgramWithConfig<void> =>
  pipe(
    RTE.ask<EnvironmentWithConfig, Error>(),
    RTE.tap(() => RTE.fromTaskEither(_.toTaskEither(_.debug('Writing examples...')))),
    RTE.flatMap((C) =>
      pipe(
        getExampleIndex(examples),
        RTE.map((index) => pipe(examples, ReadonlyArray.prepend(index))),
        RTE.chainTaskEitherK((files) => pipe(C, writeFiles(files)))
      )
    )
  )

const writeTsConfigJson: ProgramWithConfig<void> = pipe(
  RTE.ask<EnvironmentWithConfig, Error>(),
  RTE.tap(() => RTE.fromTaskEither(_.toTaskEither(_.debug('Writing examples tsconfig...')))),
  RTE.flatMap((env) =>
    writeFile(
      _.createFile(
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

const getHome: ProgramWithConfig<_.File> = pipe(
  RTE.ask<EnvironmentWithConfig, Error>(),
  RTE.map(({ config }) =>
    _.createFile(
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

const getModulesIndex: ProgramWithConfig<_.File> = pipe(
  RTE.ask<EnvironmentWithConfig, Error>(),
  RTE.map(({ config }) =>
    _.createFile(
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

const resolveConfigYML = (previousContent: string, config: _.Config): string =>
  pipe(
    previousContent,
    replace(/^remote_theme:.*$/m, `remote_theme: ${config.theme}`),
    replace(/^search_enabled:.*$/m, `search_enabled: ${config.enableSearch}`),
    replace(
      /^ {2}'\S* on GitHub':\n {4}- '.*'/m,
      `  '${config.projectName} on GitHub':\n    - '${config.projectHomepage}'`
    )
  )

const getHomepageNavigationHeader = (config: _.Config): string => {
  const isGitHub = config.projectHomepage.toLowerCase().includes('github')
  return isGitHub ? config.projectName + ' on GitHub' : 'Homepage'
}

const getConfigYML: ProgramWithConfig<_.File> = pipe(
  RTE.ask<EnvironmentWithConfig, Error>(),
  RTE.chainTaskEitherK(({ config }) => {
    const filePath = path.join(process.cwd(), config.outDir, '_config.yml')
    return pipe(
      _.toTaskEither(_.exists(filePath)),
      TaskEither.flatMap((exists) =>
        exists
          ? pipe(
              _.toTaskEither(_.readFile(filePath)),
              TaskEither.map((content) => _.createFile(filePath, resolveConfigYML(content, config), true))
            )
          : TaskEither.of(
              _.createFile(
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
    RTE.ask<EnvironmentWithConfig, Error>(),
    RTE.map(({ config }) => path.join(config.outDir, 'modules', `${module.path.slice(1).join(path.sep)}.md`))
  )

const getModuleMarkdownFiles = (modules: ReadonlyArray<Module>): ProgramWithConfig<ReadonlyArray<_.File>> =>
  pipe(
    modules,
    RTE.traverseArrayWithIndex((order, module) =>
      pipe(
        getMarkdownOutputPath(module),
        RTE.bindTo('outputPath'),
        RTE.bind('content', () => RTE.right(printModule(module, order + 1))),
        RTE.map(({ content, outputPath }) => _.createFile(outputPath, content, true))
      )
    )
  )

const getMarkdownFiles = (modules: ReadonlyArray<Module>): ProgramWithConfig<ReadonlyArray<_.File>> =>
  pipe(
    RTE.sequenceArray([getHome, getModulesIndex, getConfigYML]),
    RTE.flatMap((meta) =>
      pipe(
        getModuleMarkdownFiles(modules),
        RTE.map((files) => ReadonlyArray.getMonoid<_.File>().concat(meta, files))
      )
    )
  )

const writeMarkdownFiles = (files: ReadonlyArray<_.File>): ProgramWithConfig<void> =>
  pipe(
    RTE.ask<EnvironmentWithConfig, Error>(),
    RTE.chainFirst<EnvironmentWithConfig, Error, EnvironmentWithConfig, void>(({ config }) => {
      const outPattern = path.join(config.outDir, '**/*.ts.md')
      return pipe(
        _.toTaskEither(_.debug(`Cleaning up docs folder: deleting ${outPattern}`)),
        TaskEither.flatMap(() => _.toTaskEither(_.remove(outPattern))),
        RTE.fromTaskEither
      )
    }),
    RTE.chainTaskEitherK((C) =>
      pipe(
        _.toTaskEither(_.debug('Writing markdown files...')),
        TaskEither.flatMap(() => pipe(C, writeFiles(files)))
      )
    )
  )
