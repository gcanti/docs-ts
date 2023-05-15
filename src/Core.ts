/**
 * @since 0.9.0
 */

import { pipe } from '@effect/data/Function'
import * as ReadonlyArray from '@effect/data/ReadonlyArray'
import * as String from '@effect/data/String'
import * as Effect from '@effect/io/Effect'
import chalk from 'chalk'
import * as NodePath from 'path'

import * as Config from './Config'
import * as Domain from './Domain'
import * as FileSystem from './FileSystem'
import * as Logger from './Logger'
import { printModule } from './Markdown'
import * as NodeChildProcess from './NodeChildProcess'
import * as Parser from './Parser'
import * as Process from './Process'
import * as Service from './Service'

// -------------------------------------------------------------------------------------
// readFiles
// -------------------------------------------------------------------------------------

const join = (...paths: Array<string>): string => NodePath.normalize(NodePath.join(...paths))

const readFiles = pipe(
  Service.Config,
  Effect.flatMap(({ config }) => FileSystem.glob(join(config.srcDir, '**', '*.ts'), config.exclude)),
  Effect.tap((paths) => Logger.info(chalk.bold(`${paths.length} module(s) found`))),
  Effect.flatMap(
    Effect.forEachPar((path) =>
      Effect.map(FileSystem.readFile(path), (content) => FileSystem.createFile(path, content, false))
    )
  )
)

const writeFile = (file: FileSystem.File): Effect.Effect<Service.Config, Error, void> =>
  pipe(
    Effect.all(Service.Config, Process.cwd),
    Effect.flatMap(([Config, cwd]) => {
      const fileName = NodePath.relative(NodePath.join(cwd, Config.config.outDir), file.path)

      const overwrite = pipe(
        Logger.debug(`overwriting file ${chalk.black(fileName)}`),
        Effect.flatMap(() => FileSystem.writeFile(file.path, file.content))
      )

      const skip = Logger.debug(`file ${chalk.black(fileName)} already exists, skipping creation`)

      const write = FileSystem.writeFile(file.path, file.content)

      return Effect.ifEffect(FileSystem.exists(file.path), file.overwrite ? overwrite : skip, write)
    })
  )

// -------------------------------------------------------------------------------------
// parse
// -------------------------------------------------------------------------------------

const getModules = (files: ReadonlyArray<FileSystem.File>) =>
  pipe(
    Parser.parseFiles(files),
    Effect.mapError((errors) => new Error(`[PARSE ERROR] ${errors.map((errors) => errors.join('\n')).join('\n')}`))
  )

// -------------------------------------------------------------------------------------
// typeCheckExamples
// -------------------------------------------------------------------------------------

const typeCheckExamples = (modules: ReadonlyArray<Domain.Module>) =>
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

const combineAllFiles = ReadonlyArray.getMonoid<FileSystem.File>().combineAll

const getExampleFiles = (modules: ReadonlyArray<Domain.Module>) =>
  pipe(
    Service.Config,
    Effect.map(({ config }) =>
      pipe(
        modules,
        ReadonlyArray.flatMap((module) => {
          const prefix = module.path.join('-')

          const getDocumentableExamples =
            (id: string) =>
            (documentable: Domain.Documentable): ReadonlyArray<FileSystem.File> =>
              pipe(
                documentable.examples,
                ReadonlyArray.map((content, i) =>
                  FileSystem.createFile(
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
              combineAllFiles([
                pipe(c.methods, ReadonlyArray.flatMap(getDocumentableExamples(`${c.name}-method`))),
                pipe(c.staticMethods, ReadonlyArray.flatMap(getDocumentableExamples(`${c.name}-staticmethod`)))
              ])
            )
          )
          const interfaces = pipe(module.interfaces, ReadonlyArray.flatMap(getDocumentableExamples('interface')))
          const typeAliases = pipe(module.typeAliases, ReadonlyArray.flatMap(getDocumentableExamples('typealias')))
          const constants = pipe(module.constants, ReadonlyArray.flatMap(getDocumentableExamples('constant')))
          const functions = pipe(module.functions, ReadonlyArray.flatMap(getDocumentableExamples('function')))

          return combineAllFiles([moduleExamples, methods, interfaces, typeAliases, constants, functions])
        })
      )
    )
  )

const addAssertImport = (code: string): string =>
  code.indexOf('assert.') !== -1 ? `import * as assert from 'assert'\n${code}` : code

const replaceProjectName = (source: string) =>
  pipe(
    Service.Config,
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

const handleImports = (files: ReadonlyArray<FileSystem.File>) =>
  Effect.forEach(files, (file) =>
    pipe(
      replaceProjectName(file.content),
      Effect.map(addAssertImport),
      Effect.map((content) => FileSystem.createFile(file.path, content, file.overwrite))
    )
  )

const getExampleIndex = (examples: ReadonlyArray<FileSystem.File>) => {
  const content = pipe(
    examples,
    ReadonlyArray.combineMap(String.Monoid)((example) => `import './${NodePath.basename(example.path, '.ts')}'\n`)
  )
  return pipe(
    Service.Config,
    Effect.map(({ config }) => FileSystem.createFile(join(config.outDir, 'examples', 'index.ts'), `${content}\n`, true))
  )
}

const cleanExamples = pipe(
  Service.Config,
  Effect.flatMap(({ config }) => FileSystem.remove(join(config.outDir, 'examples')))
)

const spawnTsNode = pipe(
  Logger.debug('Type checking examples...'),
  Effect.flatMap(() => Effect.all(Service.Config, Process.cwd)),
  Effect.flatMap(([Config, cwd]) => {
    const command = process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node'
    const executable = join(cwd, Config.config.outDir, 'examples', 'index.ts')
    return NodeChildProcess.spawn(command, executable)
  })
)

const writeFiles = (files: ReadonlyArray<FileSystem.File>): Effect.Effect<Service.Config, Error, void> =>
  Effect.forEachDiscard(files, writeFile)

const writeExamples = (examples: ReadonlyArray<FileSystem.File>) =>
  pipe(
    Logger.debug('Writing examples...'),
    Effect.flatMap(() => getExampleIndex(examples)),
    Effect.map((index) => pipe(examples, ReadonlyArray.prepend(index))),
    Effect.flatMap(writeFiles)
  )

const writeTsConfigJson = pipe(
  Logger.debug('Writing examples tsconfig...'),
  Effect.flatMap(() => Effect.all(Service.Config, Process.cwd)),
  Effect.flatMap(([Config, cwd]) =>
    writeFile(
      FileSystem.createFile(
        join(cwd, Config.config.outDir, 'examples', 'tsconfig.json'),
        JSON.stringify(
          {
            compilerOptions: Config.config.examplesCompilerOptions
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

const getMarkdown = (modules: ReadonlyArray<Domain.Module>) =>
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
  Effect.all(Service.Config, Process.cwd),
  Effect.map(([Config, cwd]) =>
    FileSystem.createFile(
      join(cwd, Config.config.outDir, 'index.md'),
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
  Effect.all(Service.Config, Process.cwd),
  Effect.map(([Config, cwd]) =>
    FileSystem.createFile(
      join(cwd, Config.config.outDir, 'modules', 'index.md'),
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

const getConfigYML = pipe(
  Effect.all(Service.Config, Process.cwd),
  Effect.flatMap(([Config, cwd]) => {
    const filePath = join(cwd, Config.config.outDir, '_config.yml')
    return pipe(
      FileSystem.exists(filePath),
      Effect.flatMap((exists) =>
        exists
          ? pipe(
              FileSystem.readFile(filePath),
              Effect.map((content) => FileSystem.createFile(filePath, resolveConfigYML(content, Config.config), true))
            )
          : Effect.succeed(
              FileSystem.createFile(
                filePath,
                `remote_theme: ${Config.config.theme}

  # Enable or disable the site search
  search_enabled: ${Config.config.enableSearch}

  # Aux links for the upper right navigation
  aux_links:
  '${getHomepageNavigationHeader(Config.config)}':
    - '${Config.config.projectHomepage}'`,
                false
              )
            )
      )
    )
  })
)

const getMarkdownOutputPath = (module: Domain.Module) =>
  pipe(
    Service.Config,
    Effect.map(({ config }) => join(config.outDir, 'modules', `${module.path.slice(1).join(NodePath.sep)}.md`))
  )

const getModuleMarkdownFiles = (modules: ReadonlyArray<Domain.Module>) =>
  Effect.forEachWithIndex(modules, (module, order) =>
    pipe(
      Effect.Do(),
      Effect.bind('outputPath', () => getMarkdownOutputPath(module)),
      Effect.bind('content', () => Effect.succeed(printModule(module, order + 1))),
      Effect.map(({ content, outputPath }) => FileSystem.createFile(outputPath, content, true))
    )
  )

// -------------------------------------------------------------------------------------
// writeMarkdown
// -------------------------------------------------------------------------------------

const writeMarkdown = (files: ReadonlyArray<FileSystem.File>) =>
  pipe(
    Service.Config,
    Effect.map(({ config }) => join(config.outDir, '**/*.ts.md')),
    Effect.tap((pattern) => Logger.debug(`deleting ${chalk.black(pattern)}`)),
    Effect.flatMap((pattern) => FileSystem.remove(pattern)),
    Effect.flatMap(() => writeFiles(files))
  )

/**
 * @category main
 * @since 0.9.0
 */
export const main = pipe(
  Logger.info('reading modules...'),
  Effect.flatMap(() => readFiles),
  Effect.tap(() => Logger.info('parsing modules...')),
  Effect.flatMap(getModules),
  Effect.tap(() => Logger.info('typechecking examples...')),
  Effect.tap(typeCheckExamples),
  Effect.tap(() => Logger.info('creating markdown files...')),
  Effect.flatMap(getMarkdown),
  Effect.tap(() => Logger.info('writing markdown files...')),
  Effect.flatMap(writeMarkdown),
  Effect.provideServiceEffect(Service.Config, Config.getConfig)
)
