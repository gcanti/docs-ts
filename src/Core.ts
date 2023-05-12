/**
 * @since 0.9.0
 */
import * as Context from '@effect/data/Context'
import * as Effect from '@effect/io/Effect'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as Monoid from 'fp-ts/Monoid'
import * as ReadonlyArray from 'fp-ts/ReadonlyArray'
import * as S from 'fp-ts/string'
import * as TaskEither from 'fp-ts/TaskEither'
import * as NodePath from 'path'

import * as _ from './internal'
import { printModule } from './Markdown'
import { Documentable, Module } from './Module'
import * as Parser from './Parser'

const effectFromEither = E.matchW(Effect.fail, Effect.succeed)

const effectFromTaskEither = <E, A>(program: TaskEither.TaskEither<E, A>) =>
  Effect.async<never, E, A>(async (resume) => pipe(await program(), effectFromEither, resume))

/**
 * @category main
 * @since 0.9.0
 */
export const main: Effect.Effect<never, Error, void> = pipe(
  _.getConfig,
  Effect.flatMap((config) =>
    pipe(
      readFiles,
      Effect.flatMap(getModules),
      Effect.tap(typeCheckExamples),
      Effect.flatMap(getMarkdown),
      Effect.flatMap(writeMarkdown),
      Effect.provideService(Config, { config })
    )
  )
)

/**
 * @category service
 * @since 0.9.0
 */
export interface Config {
  readonly config: _.Config
}

/**
 * @category service
 * @since 0.9.0
 */
export const Config = Context.Tag<Config>()

/**
 * @category model
 * @since 0.9.0
 */
export interface Program<A> extends Effect.Effect<Config, Error, A> {}

// -------------------------------------------------------------------------------------
// readFiles
// -------------------------------------------------------------------------------------

const readFiles: Program<Array<_.File>> = pipe(
  Config,
  Effect.flatMap(({ config }) => _.glob(NodePath.join(config.srcDir, '**', '*.ts'), config.exclude)),
  Effect.map(ReadonlyArray.map(NodePath.normalize)),
  Effect.tap((paths) => _.info(`${paths.length} module(s) found`)),
  Effect.flatMap(
    Effect.forEachPar((path) => Effect.map(_.readFile(path), (content) => _.createFile(path, content, false)))
  )
)

const writeFile = (file: _.File): Effect.Effect<never, Error, void> => {
  const overwrite = pipe(
    _.debug(`Overwriting file ${file.path}`),
    Effect.flatMap(() => _.writeFile(file.path, file.content))
  )

  const skip = _.debug(`File ${file.path} already exists, skipping creation`)

  const write = _.writeFile(file.path, file.content)

  return pipe(
    _.exists(file.path),
    Effect.flatMap((exists) => (exists ? (file.overwrite ? overwrite : skip) : write))
  )
}

// -------------------------------------------------------------------------------------
// parse
// -------------------------------------------------------------------------------------

const getModules = (files: ReadonlyArray<_.File>): Program<ReadonlyArray<Module>> =>
  pipe(
    _.debug('Parsing files...'),
    Effect.flatMap(() => Config),
    Effect.flatMap(({ config }) =>
      pipe(
        effectFromTaskEither(Parser.parseFiles(files)(config)),
        Effect.mapError((error) => new Error(`[PARSE ERROR] ${error}`))
      )
    )
  )

// -------------------------------------------------------------------------------------
// typeCheckExamples
// -------------------------------------------------------------------------------------

const typeCheckExamples = (modules: ReadonlyArray<Module>): Program<void> =>
  pipe(
    getExampleFiles(modules),
    Effect.flatMap(handleImports),
    Effect.flatMap((examples) =>
      examples.length === 0
        ? cleanExamples
        : pipe(
            writeExamples(examples),
            Effect.flatMap(() => writeTsConfigJson),
            Effect.flatMap(() => spawnTsNode),
            Effect.flatMap(() => cleanExamples)
          )
    )
  )

const concatAllFiles = Monoid.concatAll(ReadonlyArray.getMonoid<_.File>())

const getExampleFiles = (modules: ReadonlyArray<Module>): Program<ReadonlyArray<_.File>> =>
  pipe(
    Config,
    Effect.map(({ config }) =>
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
                    NodePath.join(config.outDir, 'examples', `${prefix}-${id}-${documentable.name}-${i}.ts`),
                    `${content}\n`,
                    true
                  )
                )
              )

          const moduleExamples = getDocumentableExamples('module')(module)
          const methods = pipe(
            module.classes,
            ReadonlyArray.flatMap((c) =>
              concatAllFiles([
                pipe(c.methods, ReadonlyArray.flatMap(getDocumentableExamples(`${c.name}-method`))),
                pipe(c.staticMethods, ReadonlyArray.flatMap(getDocumentableExamples(`${c.name}-staticmethod`)))
              ])
            )
          )
          const interfaces = pipe(module.interfaces, ReadonlyArray.flatMap(getDocumentableExamples('interface')))
          const typeAliases = pipe(module.typeAliases, ReadonlyArray.flatMap(getDocumentableExamples('typealias')))
          const constants = pipe(module.constants, ReadonlyArray.flatMap(getDocumentableExamples('constant')))
          const functions = pipe(module.functions, ReadonlyArray.flatMap(getDocumentableExamples('function')))

          return concatAllFiles([moduleExamples, methods, interfaces, typeAliases, constants, functions])
        })
      )
    )
  )

const addAssertImport = (code: string): string =>
  code.indexOf('assert.') !== -1 ? `import * as assert from 'assert'\n${code}` : code

const replaceProjectName = (source: string): Program<string> =>
  pipe(
    Config,
    Effect.map(({ config }) => {
      const importRegex = (projectName: string) =>
        new RegExp(`from (?<quote>['"])${projectName}(?:/lib)?(?:/(?<path>.*))?\\k<quote>`, 'g')

      const out = source.replace(importRegex(config.projectName), (...args) => {
        const groups: { path?: string } = args[args.length - 1]
        return `from '../../src${groups.path ? `/${groups.path}` : ''}'`
      })

      return out
    })
  )

const handleImports = (files: ReadonlyArray<_.File>): Program<ReadonlyArray<_.File>> =>
  Effect.forEach(files, (file) =>
    pipe(
      replaceProjectName(file.content),
      Effect.map(addAssertImport),
      Effect.map((content) => _.createFile(file.path, content, file.overwrite))
    )
  )

const getExampleIndex = (examples: ReadonlyArray<_.File>): Program<_.File> => {
  const content = pipe(
    examples,
    ReadonlyArray.foldMap(S.Monoid)((example) => `import './${NodePath.basename(example.path, '.ts')}'\n`)
  )
  return pipe(
    Config,
    Effect.map(({ config }) => _.createFile(NodePath.join(config.outDir, 'examples', 'index.ts'), `${content}\n`, true))
  )
}

const cleanExamples: Program<void> = pipe(
  Config,
  Effect.flatMap(({ config }) => _.remove(NodePath.join(config.outDir, 'examples')))
)

const spawnTsNode: Program<void> = pipe(
  _.debug('Type checking examples...'),
  Effect.flatMap(() => Config),
  Effect.flatMap(({ config }) => {
    const command = process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node'
    const executable = NodePath.join(process.cwd(), config.outDir, 'examples', 'index.ts')
    return _.spawn(command, executable)
  })
)

const writeFiles = (files: ReadonlyArray<_.File>): Effect.Effect<never, Error, void> =>
  Effect.forEachDiscard(files, writeFile)

const writeExamples = (examples: ReadonlyArray<_.File>): Program<void> =>
  pipe(
    _.debug('Writing examples...'),
    Effect.flatMap(() => getExampleIndex(examples)),
    Effect.map((index) => pipe(examples, ReadonlyArray.prepend(index))),
    Effect.flatMap(writeFiles)
  )

const writeTsConfigJson: Program<void> = pipe(
  _.debug('Writing examples tsconfig...'),
  Effect.flatMap(() => Config),
  Effect.flatMap(({ config }) =>
    writeFile(
      _.createFile(
        NodePath.join(process.cwd(), config.outDir, 'examples', 'tsconfig.json'),
        JSON.stringify(
          {
            compilerOptions: config.examplesCompilerOptions
          },
          null,
          2
        ),
        true
      )
    )
  )
)

// -------------------------------------------------------------------------------------
// getMarkdown
// -------------------------------------------------------------------------------------

const getMarkdown = (modules: ReadonlyArray<Module>): Program<ReadonlyArray<_.File>> =>
  pipe(
    Effect.Do(),
    Effect.bind('home', () => getHome),
    Effect.bind('index', () => getModulesIndex),
    Effect.bind('yml', () => getConfigYML),
    Effect.flatMap(({ home, index, yml }) =>
      pipe(
        getModuleMarkdownFiles(modules),
        Effect.map((files) => [home, index, yml].concat(files))
      )
    )
  )

const getHome: Program<_.File> = pipe(
  Config,
  Effect.map(({ config }) =>
    _.createFile(
      NodePath.join(process.cwd(), config.outDir, 'index.md'),
      `---
title: Home
nav_order: 1
---
`,
      false
    )
  )
)

const getModulesIndex: Program<_.File> = pipe(
  Config,
  Effect.map(({ config }) =>
    _.createFile(
      NodePath.join(process.cwd(), config.outDir, 'modules', 'index.md'),
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

const getConfigYML: Program<_.File> = pipe(
  Config,
  Effect.flatMap(({ config }) => {
    const filePath = NodePath.join(process.cwd(), config.outDir, '_config.yml')
    return pipe(
      _.exists(filePath),
      Effect.flatMap((exists) =>
        exists
          ? pipe(
              _.readFile(filePath),
              Effect.map((content) => _.createFile(filePath, resolveConfigYML(content, config), true))
            )
          : Effect.succeed(
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

const getMarkdownOutputPath = (module: Module): Program<string> =>
  pipe(
    Config,
    Effect.map(({ config }) => NodePath.join(config.outDir, 'modules', `${module.path.slice(1).join(NodePath.sep)}.md`))
  )

const getModuleMarkdownFiles = (modules: ReadonlyArray<Module>): Program<ReadonlyArray<_.File>> =>
  Effect.forEachWithIndex(modules, (module, order) =>
    pipe(
      Effect.Do(),
      Effect.bind('outputPath', () => getMarkdownOutputPath(module)),
      Effect.bind('content', () => Effect.succeed(printModule(module, order + 1))),
      Effect.map(({ content, outputPath }) => _.createFile(outputPath, content, true))
    )
  )

// -------------------------------------------------------------------------------------
// writeMarkdown
// -------------------------------------------------------------------------------------

const writeMarkdown = (files: ReadonlyArray<_.File>): Program<void> =>
  pipe(
    Config,
    Effect.map(({ config }) => NodePath.join(config.outDir, '**/*.ts.md')),
    Effect.tap((outPattern) => _.debug(`Cleaning up docs folder: deleting ${outPattern}`)),
    Effect.flatMap((outPattern) => _.remove(outPattern)),
    Effect.tap(() => _.debug('Writing markdown files...')),
    Effect.flatMap(() => writeFiles(files))
  )
