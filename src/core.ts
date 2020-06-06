/**
 * @since 0.2.0
 */
import { spawnSync } from 'child_process'
import * as A from 'fp-ts/lib/Array'
import * as E from 'fp-ts/lib/Either'
import { fold } from 'fp-ts/lib/Monoid'
import { pipe } from 'fp-ts/lib/pipeable'
import * as R from 'fp-ts/lib/Reader'
import * as RTE from 'fp-ts/lib/ReaderTaskEither'
import * as TE from 'fp-ts/lib/TaskEither'
import * as path from 'path'
import { Documentable, Module } from './domain'
import * as markdown from './markdown'
import * as P from './parser'

/**
 * capabilities
 *
 * @since 0.2.0
 */
export interface Eff<A> extends TE.TaskEither<string, A> {}

/**
 * @since 0.2.0
 */
export interface MonadFileSystem {
  readonly getFilenames: (pattern: string) => Eff<Array<string>>
  readonly readFile: (path: string) => Eff<string>
  readonly writeFile: (path: string, content: string) => Eff<void>
  readonly existsFile: (path: string) => Eff<boolean>
  readonly clean: (pattern: string) => Eff<void>
}

/**
 * @since 0.2.0
 */
export interface MonadLog {
  readonly info: (message: string) => Eff<void>
  readonly log: (message: string) => Eff<void>
  readonly debug: (message: string) => Eff<void>
}

/**
 * @since 0.2.0
 */
export interface Capabilities extends MonadFileSystem, MonadLog {}

/**
 * App effect
 *
 * @since 0.2.0
 */
export interface Effect<A> extends RTE.ReaderTaskEither<Capabilities, string, A> {}

const outDir = 'docs'
const srcDir = 'src'

interface PackageJSON {
  readonly name: string
  readonly homepage?: string
}

interface File {
  readonly path: string
  readonly content: string
  readonly overwrite: boolean
}

function file(path: string, content: string, overwrite: boolean): File {
  return {
    path,
    content,
    overwrite
  }
}

function readFile(path: string): Effect<File> {
  return C =>
    pipe(
      C.readFile(path),
      TE.map(content => file(path, content, false))
    )
}

function readFiles(paths: Array<string>): Effect<Array<File>> {
  return A.array.traverse(RTE.readerTaskEither)(paths, readFile)
}

function writeFile(file: File): Effect<void> {
  return C => {
    const overwrite = pipe(
      C.debug(`Overwriting file ${file.path}`),
      TE.chain(() => C.writeFile(file.path, file.content))
    )

    const skip = C.debug(`File ${file.path} already exists, skipping creation`)

    const write = pipe(
      C.debug('Writing file ' + file.path),
      TE.chain(() => C.writeFile(file.path, file.content))
    )

    return pipe(
      C.existsFile(file.path),
      TE.chain(exists => (exists ? (file.overwrite ? overwrite : skip) : write))
    )
  }
}

function writeFiles(files: Array<File>): Effect<void> {
  return pipe(
    A.array.traverse(RTE.readerTaskEither)(files, writeFile),
    RTE.map(() => undefined)
  )
}

const getPackageJSON: Effect<PackageJSON> = C =>
  pipe(
    C.readFile(path.join(process.cwd(), 'package.json')),
    TE.chain(s => {
      const json = JSON.parse(s)
      const name = json.name
      return pipe(
        C.debug(`Project name detected: ${name}`),
        TE.map(() => ({
          name,
          homepage: json.homepage
        }))
      )
    })
  )

const srcPattern = path.join(srcDir, '**', '*.ts')

const getSrcPaths: Effect<Array<string>> = C =>
  pipe(
    C.getFilenames(srcPattern),
    TE.map(paths => A.array.map(paths, path.normalize)),
    TE.chainFirst(paths => C.info(`${paths.length} modules found`))
  )

const readSources: Effect<Array<File>> = pipe(getSrcPaths, RTE.chain(readFiles))

function parseFiles(files: Array<File>): Effect<Array<Module>> {
  return C =>
    pipe(
      C.log('Parsing files...'),
      TE.chain(() => TE.fromEither(pipe(P.parseFiles(files))))
    )
}

const foldFiles = fold(A.getMonoid<File>())

function getExampleFiles(modules: Array<Module>): Array<File> {
  return A.array.chain(modules, module => {
    const prefix = module.path.join('-')
    function getDocumentableExamples(documentable: Documentable): Array<File> {
      return documentable.examples.map((content, i) =>
        file(path.join(outDir, 'examples', prefix + '-' + documentable.name + '-' + i + '.ts'), content + '\n', true)
      )
    }
    const moduleExamples = getDocumentableExamples(module)
    const methods = A.array.chain(module.classes, c =>
      foldFiles([
        A.array.chain(c.methods, getDocumentableExamples),
        A.array.chain(c.staticMethods, getDocumentableExamples)
      ])
    )
    const interfaces = A.array.chain(module.interfaces, getDocumentableExamples)
    const typeAliases = A.array.chain(module.typeAliases, getDocumentableExamples)
    const constants = A.array.chain(module.constants, getDocumentableExamples)
    const functions = A.array.chain(module.functions, getDocumentableExamples)

    return foldFiles([moduleExamples, methods, interfaces, typeAliases, constants, functions])
  })
}

function addAssertImport(code: string): string {
  return code.indexOf('assert.') !== -1 ? `import * as assert from 'assert'\n` + code : code
}

function handleImports(files: Array<File>, projectName: string): Array<File> {
  function replaceProjectName(source: string): string {
    // Matches imports of the form:
    // import { foo } from 'projectName'
    const root = new RegExp(`from '${projectName}'`, 'g')
    // Matches imports of the form:
    // import { foo } from 'projectName/lib/...'
    const module = new RegExp(`from '${projectName}/lib/`, 'g')
    // Matches imports of the form:
    // import { foo } from 'projectName/...'
    const other = new RegExp(`from '${projectName}/`, 'g')
    return source
      .replace(root, `from '../../src'`)
      .replace(module, `from '../../src/`)
      .replace(other, `from '../../src/`)
  }
  return files.map(f => {
    const handleProjectImports = replaceProjectName(f.content)
    const handleAssert = addAssertImport(handleProjectImports)
    return file(f.path, handleAssert, f.overwrite)
  })
}

function getExampleIndex(examples: Array<File>): File {
  const content = examples.map(example => `import './${path.basename(example.path)}'`).join('\n') + '\n'
  return file(path.join(outDir, 'examples', 'index.ts'), content, true)
}

const examplePattern = path.join(outDir, 'examples')

const cleanExamples: Effect<void> = C =>
  pipe(
    C.debug(`Clean up examples: deleting ${examplePattern}...`),
    TE.chain(() => C.clean(examplePattern))
  )

const spawnTsNode: Effect<void> = C =>
  pipe(
    C.log(`Type checking examples...`),
    TE.chain(() =>
      TE.fromIOEither(() => {
        const { status } = spawnSync('ts-node', [path.join(outDir, 'examples', 'index.ts')], { stdio: 'inherit' })
        return status === 0 ? E.right(undefined) : E.left('Type checking error')
      })
    )
  )

function writeExamples(examples: Array<File>): Effect<void> {
  return pipe(
    RTE.ask<Capabilities>(),
    RTE.chain(C =>
      pipe(
        R.reader.of(C.log(`Writing examples...`)),
        RTE.chain(() => writeFiles([getExampleIndex(examples), ...examples]))
      )
    )
  )
}

function typecheckExamples(projectName: string): (modules: Array<Module>) => Effect<void> {
  return modules => {
    const examples = handleImports(getExampleFiles(modules), projectName)
    return examples.length === 0
      ? cleanExamples
      : pipe(
          writeExamples(examples),
          RTE.chain(() => spawnTsNode),
          RTE.chain(() => cleanExamples)
        )
  }
}

const home: File = file(
  path.join(outDir, 'index.md'),
  `---
title: Home
nav_order: 1
---
`,
  false
)

const modulesIndex: File = file(
  path.join(outDir, 'modules', 'index.md'),
  `---
title: Modules
has_children: true
permalink: /docs/modules
nav_order: 2
---
`,
  false
)

const configYMLPath = path.join(outDir, '_config.yml')

function getConfigYML(projectName: string, homepage: string): File {
  return file(
    configYMLPath,
    `remote_theme: pmarsceill/just-the-docs

# Enable or disable the site search
search_enabled: true

# Aux links for the upper right navigation
aux_links:
  '${projectName} on GitHub':
    - '${homepage}'
`,
    false
  )
}

let counter = 1

function getMarkdownOutpuPath(module: Module): string {
  return path.join(outDir, 'modules', module.path.slice(1).join(path.sep) + '.md')
}

function getModuleMarkdownFiles(modules: Array<Module>): Array<File> {
  return modules.map(module => file(getMarkdownOutpuPath(module), markdown.printModule(module, counter++), true))
}

function getMarkdownFiles(projectName: string, homepage: string): (modules: Array<Module>) => Array<File> {
  return modules => [home, modulesIndex, getConfigYML(projectName, homepage), ...getModuleMarkdownFiles(modules)]
}

const outPattern = path.join(outDir, '**/*.ts.md')

function writeMarkdownFiles(files: Array<File>): Effect<void> {
  const cleanOut: Effect<void> = C =>
    pipe(
      C.log(`Writing markdown...`),
      TE.chain(() => C.debug(`Clean up docs folder: deleting ${outPattern}...`)),
      TE.chain(() => C.clean(outPattern))
    )

  return pipe(
    cleanOut,
    RTE.chain(() => writeFiles(files))
  )
}

function checkHomepage(pkg: PackageJSON): E.Either<string, string> {
  return pkg.homepage === undefined ? E.left('Missing homepage in package.json') : E.right(pkg.homepage)
}

/**
 * @since 0.2.0
 */
export const main: Effect<void> = pipe(
  getPackageJSON,
  RTE.chain(pkg =>
    pipe(
      RTE.fromEither(checkHomepage(pkg)),
      RTE.chain(homepage =>
        pipe(
          readSources,
          RTE.chain(parseFiles),
          RTE.chainFirst(typecheckExamples(pkg.name)),
          RTE.map(getMarkdownFiles(pkg.name, homepage)),
          RTE.chain(writeMarkdownFiles)
        )
      )
    )
  )
)
