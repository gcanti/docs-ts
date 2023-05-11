/**
 * @since 0.9.0
 */
import * as Effect from '@effect/io/Effect'
import * as E from 'fp-ts/Either'
import { constVoid, flow, pipe } from 'fp-ts/function'
import * as Monoid from 'fp-ts/Monoid'
import * as RTE from 'fp-ts/ReaderTaskEither'
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
  Effect.flatMap((config) => {
    const program: Program<void> = pipe(
      readSourceFiles,
      RTE.flatMap(parseFiles),
      RTE.tap(typeCheckExamples),
      RTE.flatMap(getMarkdownFiles),
      RTE.flatMap(writeMarkdownFiles)
    )
    return effectFromTaskEither(program(config))
  })
)

/**
 * @category model
 * @since 0.9.0
 */
export interface Program<A> extends RTE.ReaderTaskEither<_.Config, Error, A> {}

// -------------------------------------------------------------------------------------
// filesystem
// -------------------------------------------------------------------------------------

const readFile = (path: string): TaskEither.TaskEither<Error, _.File> =>
  pipe(
    _.toTaskEither(_.readFile(path)),
    TaskEither.map((content) => _.createFile(path, content, false))
  )

const readFiles: (paths: ReadonlyArray<string>) => TaskEither.TaskEither<Error, ReadonlyArray<_.File>> =
  ReadonlyArray.traverse(TaskEither.ApplicativePar)(readFile)

const writeFile = (file: _.File): TaskEither.TaskEither<Error, void> => {
  const overwrite: TaskEither.TaskEither<Error, void> = pipe(
    _.toTaskEither(_.debug(`Overwriting file ${file.path}`)),
    TaskEither.flatMap(() => _.toTaskEither(_.writeFile(file.path, file.content)))
  )

  const skip: TaskEither.TaskEither<Error, void> = _.toTaskEither(
    _.debug(`File ${file.path} already exists, skipping creation`)
  )

  const write: TaskEither.TaskEither<Error, void> = _.toTaskEither(_.writeFile(file.path, file.content))

  return pipe(
    _.toTaskEither(_.exists(file.path)),
    TaskEither.flatMap((exists) => (exists ? (file.overwrite ? overwrite : skip) : write))
  )
}

const writeFiles: (files: ReadonlyArray<_.File>) => TaskEither.TaskEither<Error, void> = flow(
  ReadonlyArray.traverse(TaskEither.ApplicativePar)(writeFile),
  TaskEither.map(constVoid)
)

const readSourcePaths: Program<ReadonlyArray<string>> = (config) =>
  pipe(
    _.toTaskEither(_.search(NodePath.join(config.srcDir, '**', '*.ts'), config.exclude)),
    TaskEither.map(ReadonlyArray.map(NodePath.normalize)),
    TaskEither.tap((paths) => _.toTaskEither(_.info(`${paths.length} module(s) found`)))
  )

const readSourceFiles: Program<ReadonlyArray<_.File>> = pipe(
  readSourcePaths,
  RTE.chainTaskEitherK((paths) => readFiles(paths))
)

// -------------------------------------------------------------------------------------
// parsers
// -------------------------------------------------------------------------------------

const parseFiles = (files: ReadonlyArray<_.File>): Program<ReadonlyArray<Module>> =>
  pipe(
    _.toReaderTaskEither(_.debug('Parsing files...')),
    RTE.flatMap(() =>
      pipe(
        Parser.parseFiles(files),
        RTE.mapLeft((error) => new Error(`[PARSE ERROR] ${error}`))
      )
    )
  )

// -------------------------------------------------------------------------------------
// examples
// -------------------------------------------------------------------------------------

const concatAllFiles = Monoid.concatAll(ReadonlyArray.getMonoid<_.File>())

const getExampleFiles =
  (modules: ReadonlyArray<Module>): Program<ReadonlyArray<_.File>> =>
  (config) =>
    TaskEither.of(
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

const addAssertImport = (code: string): string =>
  code.indexOf('assert.') !== -1 ? `import * as assert from 'assert'\n${code}` : code

const replaceProjectName =
  (source: string): Program<string> =>
  (config) => {
    const importRegex = (projectName: string) =>
      new RegExp(`from (?<quote>['"])${projectName}(?:/lib)?(?:/(?<path>.*))?\\k<quote>`, 'g')

    const out = source.replace(importRegex(config.projectName), (...args) => {
      const groups: { path?: string } = args[args.length - 1]
      return `from '../../src${groups.path ? `/${groups.path}` : ''}'`
    })

    return TaskEither.of(out)
  }

const handleImports: (files: ReadonlyArray<_.File>) => Program<ReadonlyArray<_.File>> = ReadonlyArray.traverse(
  RTE.ApplicativePar
)((file) =>
  pipe(
    replaceProjectName(file.content),
    RTE.map(addAssertImport),
    RTE.map((content) => _.createFile(file.path, content, file.overwrite))
  )
)

const getExampleIndex = (examples: ReadonlyArray<_.File>): Program<_.File> => {
  const content = pipe(
    examples,
    ReadonlyArray.foldMap(S.Monoid)((example) => `import './${NodePath.basename(example.path, '.ts')}'\n`)
  )
  return (config) =>
    TaskEither.of(_.createFile(NodePath.join(config.outDir, 'examples', 'index.ts'), `${content}\n`, true))
}

const cleanExamples: Program<void> = (config) => _.toTaskEither(_.remove(NodePath.join(config.outDir, 'examples')))

const spawnTsNode: Program<void> = pipe(
  _.toReaderTaskEither(_.debug('Type checking examples...')),
  RTE.flatMap(() => (config: _.Config) => {
    const command = process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node'
    const executable = NodePath.join(process.cwd(), config.outDir, 'examples', 'index.ts')
    return TaskEither.fromEither(_.spawn(command, executable))
  })
)

const writeExamples = (examples: ReadonlyArray<_.File>): Program<void> =>
  pipe(
    _.toReaderTaskEither(_.debug('Writing examples...')),
    RTE.flatMap(() =>
      pipe(
        getExampleIndex(examples),
        RTE.map((index) => pipe(examples, ReadonlyArray.prepend(index))),
        RTE.chainTaskEitherK((files) => writeFiles(files))
      )
    )
  )

const writeTsConfigJson: Program<void> = pipe(
  _.toReaderTaskEither(_.debug('Writing examples tsconfig...')),
  RTE.flatMap(
    () => (config: _.Config) =>
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

const typeCheckExamples = (modules: ReadonlyArray<Module>): Program<void> =>
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

const getHome: Program<_.File> = (config) =>
  TaskEither.of(
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

const getModulesIndex: Program<_.File> = (config) =>
  TaskEither.of(
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

const getConfigYML: Program<_.File> = (config) => {
  const filePath = NodePath.join(process.cwd(), config.outDir, '_config.yml')
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
}

const getMarkdownOutputPath =
  (module: Module): Program<string> =>
  (config) =>
    TaskEither.of(NodePath.join(config.outDir, 'modules', `${module.path.slice(1).join(NodePath.sep)}.md`))

const getModuleMarkdownFiles = (modules: ReadonlyArray<Module>): Program<ReadonlyArray<_.File>> =>
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

const getMarkdownFiles = (modules: ReadonlyArray<Module>): Program<ReadonlyArray<_.File>> =>
  pipe(
    RTE.sequenceArray([getHome, getModulesIndex, getConfigYML]),
    RTE.flatMap((meta) =>
      pipe(
        getModuleMarkdownFiles(modules),
        RTE.map((files) => ReadonlyArray.getMonoid<_.File>().concat(meta, files))
      )
    )
  )

const writeMarkdownFiles = (files: ReadonlyArray<_.File>): Program<void> =>
  pipe(
    (config: _.Config) => {
      const outPattern = NodePath.join(config.outDir, '**/*.ts.md')
      return _.toTaskEither(
        pipe(
          _.debug(`Cleaning up docs folder: deleting ${outPattern}`),
          Effect.flatMap(() => _.remove(outPattern))
        )
      )
    },
    RTE.chainTaskEitherK(() =>
      pipe(
        _.toTaskEither(_.debug('Writing markdown files...')),
        TaskEither.flatMap(() => writeFiles(files))
      )
    )
  )
