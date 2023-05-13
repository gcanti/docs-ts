/**
 * @since 0.9.0
 */

import { pipe } from '@effect/data/Function'
import * as Effect from '@effect/io/Effect'
import chalk from 'chalk'
import * as Monoid from 'fp-ts/Monoid'
import * as ReadonlyArray from 'fp-ts/ReadonlyArray'
import * as S from 'fp-ts/string'
import * as NodePath from 'path'

import * as _ from './internal'
import { printModule } from './Markdown'
import { Documentable, Module } from './Module'
import * as Parser from './Parser'
import { Config } from './Service'

/**
 * @category main
 * @since 0.9.0
 */
export const main = pipe(
  _.getConfig,
  Effect.flatMap((config) =>
    pipe(
      _.info('reading modules...'),
      Effect.flatMap(() => readFiles),
      Effect.tap(() => _.info('parsing modules...')),
      Effect.flatMap(getModules),
      Effect.tap(() => _.info('typechecking examples...')),
      Effect.tap(typeCheckExamples),
      Effect.tap(() => _.info('creating markdown files...')),
      Effect.flatMap(getMarkdown),
      Effect.tap(() => _.info('writing markdown files...')),
      Effect.flatMap(writeMarkdown),
      Effect.provideService(Config, { config })
    )
  )
)

// -------------------------------------------------------------------------------------
// readFiles
// -------------------------------------------------------------------------------------

const join = (...paths: Array<string>): string => NodePath.normalize(NodePath.join(...paths))

const readFiles = pipe(
  Config,
  Effect.flatMap(({ config }) => _.glob(join(config.srcDir, '**', '*.ts'), config.exclude)),
  Effect.tap((paths) => _.info(chalk.bold(`${paths.length} module(s) found`))),
  Effect.flatMap(
    Effect.forEachPar((path) => Effect.map(_.readFile(path), (content) => _.createFile(path, content, false)))
  )
)

const writeFile = (file: _.File): Effect.Effect<Config, Error, void> =>
  pipe(
    Config,
    Effect.flatMap((Config) => {
      const fileName = NodePath.relative(NodePath.join(process.cwd(), Config.config.outDir), file.path)

      const overwrite = pipe(
        _.debug(`overwriting file ${chalk.black(fileName)}`),
        Effect.flatMap(() => _.writeFile(file.path, file.content))
      )

      const skip = _.debug(`file ${chalk.black(fileName)} already exists, skipping creation`)

      const write = _.writeFile(file.path, file.content)

      return Effect.ifEffect(_.exists(file.path), file.overwrite ? overwrite : skip, write)
    })
  )

// -------------------------------------------------------------------------------------
// parse
// -------------------------------------------------------------------------------------

const getModules = (files: ReadonlyArray<_.File>) =>
  pipe(
    Parser.parseFiles(files),
    Effect.mapError((errors) => new Error(`[PARSE ERROR] ${errors.map((errors) => errors.join('\n')).join('\n')}`))
  )

// -------------------------------------------------------------------------------------
// typeCheckExamples
// -------------------------------------------------------------------------------------

const typeCheckExamples = (modules: ReadonlyArray<Module>) =>
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

const getExampleFiles = (modules: ReadonlyArray<Module>) =>
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
                    join(config.outDir, 'examples', `${prefix}-${id}-${documentable.name}-${i}.ts`),
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

const replaceProjectName = (source: string) =>
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

const handleImports = (files: ReadonlyArray<_.File>) =>
  Effect.forEach(files, (file) =>
    pipe(
      replaceProjectName(file.content),
      Effect.map(addAssertImport),
      Effect.map((content) => _.createFile(file.path, content, file.overwrite))
    )
  )

const getExampleIndex = (examples: ReadonlyArray<_.File>) => {
  const content = pipe(
    examples,
    ReadonlyArray.foldMap(S.Monoid)((example) => `import './${NodePath.basename(example.path, '.ts')}'\n`)
  )
  return pipe(
    Config,
    Effect.map(({ config }) => _.createFile(join(config.outDir, 'examples', 'index.ts'), `${content}\n`, true))
  )
}

const cleanExamples = pipe(
  Config,
  Effect.flatMap(({ config }) => _.remove(join(config.outDir, 'examples')))
)

const spawnTsNode = pipe(
  _.debug('Type checking examples...'),
  Effect.flatMap(() => Config),
  Effect.flatMap(({ config }) => {
    const command = process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node'
    const executable = join(process.cwd(), config.outDir, 'examples', 'index.ts')
    return _.spawn(command, executable)
  })
)

const writeFiles = (files: ReadonlyArray<_.File>): Effect.Effect<Config, Error, void> =>
  Effect.forEachDiscard(files, writeFile)

const writeExamples = (examples: ReadonlyArray<_.File>) =>
  pipe(
    _.debug('Writing examples...'),
    Effect.flatMap(() => getExampleIndex(examples)),
    Effect.map((index) => pipe(examples, ReadonlyArray.prepend(index))),
    Effect.flatMap(writeFiles)
  )

const writeTsConfigJson = pipe(
  _.debug('Writing examples tsconfig...'),
  Effect.flatMap(() => Config),
  Effect.flatMap(({ config }) =>
    writeFile(
      _.createFile(
        join(process.cwd(), config.outDir, 'examples', 'tsconfig.json'),
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

const getMarkdown = (modules: ReadonlyArray<Module>) =>
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

const getHome = pipe(
  Config,
  Effect.map(({ config }) =>
    _.createFile(
      join(process.cwd(), config.outDir, 'index.md'),
      `---
title: Home
nav_order: 1
---
`,
      false
    )
  )
)

const getModulesIndex = pipe(
  Config,
  Effect.map(({ config }) =>
    _.createFile(
      join(process.cwd(), config.outDir, 'modules', 'index.md'),
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

const getConfigYML = pipe(
  Config,
  Effect.flatMap(({ config }) => {
    const filePath = join(process.cwd(), config.outDir, '_config.yml')
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

const getMarkdownOutputPath = (module: Module) =>
  pipe(
    Config,
    Effect.map(({ config }) => join(config.outDir, 'modules', `${module.path.slice(1).join(NodePath.sep)}.md`))
  )

const getModuleMarkdownFiles = (modules: ReadonlyArray<Module>) =>
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

const writeMarkdown = (files: ReadonlyArray<_.File>) =>
  pipe(
    Config,
    Effect.map(({ config }) => join(config.outDir, '**/*.ts.md')),
    Effect.tap((pattern) => _.debug(`deleting ${chalk.black(pattern)}`)),
    Effect.flatMap((pattern) => _.remove(pattern)),
    Effect.flatMap(() => writeFiles(files))
  )
