import * as TE from 'fp-ts/lib/TaskEither'
import * as parser from './parser'
import * as path from 'path'
import * as A from 'fp-ts/lib/Array'
import { fold } from 'fp-ts/lib/Monoid'
import * as markdown from './markdown'
import * as E from 'fp-ts/lib/Either'
import { spawnSync } from 'child_process'
import { pipe } from 'fp-ts/lib/pipeable'
import * as RTE from 'fp-ts/lib/ReaderTaskEither'

/**
 * capabilities
 */
export interface Eff<A> extends TE.TaskEither<string, A> {}

export interface MonadFileSystem {
  readonly getFilenames: (pattern: string) => Eff<Array<string>>
  readonly readFile: (path: string) => Eff<string>
  readonly writeFile: (path: string, content: string) => Eff<void>
  readonly existsFile: (path: string) => Eff<boolean>
  readonly clean: (pattern: string) => Eff<void>
}

export interface MonadLog {
  readonly info: (message: string) => Eff<void>
  readonly log: (message: string) => Eff<void>
  readonly debug: (message: string) => Eff<void>
}

export interface MonadApp extends MonadFileSystem, MonadLog {}

/**
 * App effect
 */
export interface App<A> extends RTE.ReaderTaskEither<MonadApp, string, A> {}

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

const file = (path: string, content: string, overwrite: boolean): File => ({ path, content, overwrite })

const traverse = A.array.traverse(TE.taskEither)

function readFiles(paths: Array<string>): App<Array<File>> {
  return M =>
    traverse(paths, path =>
      pipe(
        M.readFile(path),
        TE.map(content => file(path, content, false))
      )
    )
}

function writeFile(file: File): App<void> {
  return M => {
    const writeFile = M.writeFile(file.path, file.content)
    return pipe(
      M.existsFile(file.path),
      TE.chain(exists => {
        if (exists) {
          if (file.overwrite) {
            return pipe(
              M.debug(`Overwriting file ${file.path}`),
              TE.chain(() => writeFile)
            )
          } else {
            return M.debug(`File ${file.path} already exists, skipping creation`)
          }
        } else {
          return pipe(
            M.debug('Writing file ' + file.path),
            TE.chain(() => writeFile)
          )
        }
      })
    )
  }
}

function writeFiles(files: Array<File>): App<void> {
  return M =>
    pipe(
      traverse(files, file => writeFile(file)(M)),
      TE.map(() => undefined)
    )
}

const getPackageJSON: App<PackageJSON> = M =>
  pipe(
    M.readFile(path.join(process.cwd(), 'package.json')),
    TE.chain(s => {
      const json = JSON.parse(s)
      const name = json.name
      const homepage = json.homepage
      return pipe(
        M.debug(`Project name detected: ${name}`),
        TE.map(() => ({
          name,
          homepage
        }))
      )
    })
  )

const readSources: App<Array<File>> = M => {
  const srcPattern = path.join(srcDir, '**', '*.ts')
  return pipe(
    M.getFilenames(srcPattern),
    TE.map(paths => A.array.map(paths, path.normalize)),
    TE.chain(paths =>
      pipe(
        M.info(`${paths.length} modules found`),
        TE.chain(() => readFiles(paths)(M))
      )
    )
  )
}

function parseModules(files: Array<File>): App<Array<parser.Module>> {
  return M =>
    pipe(
      M.log('Parsing modules...'),
      TE.chain(() =>
        TE.fromEither(
          pipe(
            parser.run(files),
            E.mapLeft(errors => errors.join('\n'))
          )
        )
      )
    )
}

const foldFiles = fold(A.getMonoid<File>())

function getExampleFiles(modules: Array<parser.Module>): Array<File> {
  return A.array.chain(modules, module => {
    const prefix = module.path.join('-')
    function getDocumentableExamples(documentable: parser.Documentable): Array<File> {
      return documentable.examples.map((content, i) =>
        file(path.join(outDir, 'examples', prefix + '-' + documentable.name + '-' + i + '.ts'), content + '\n', true)
      )
    }
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

    return foldFiles([methods, interfaces, typeAliases, constants, functions])
  })
}

function addAssertImport(code: string): string {
  return code.indexOf('assert.') !== -1 ? `import * as assert from 'assert'\n` + code : code
}

function handleImports(files: Array<File>, projectName: string): Array<File> {
  function replaceProjectName(source: string): string {
    const root = new RegExp(`from '${projectName}'`, 'g')
    const module = new RegExp(`from '${projectName}/lib/`, 'g')
    return source.replace(root, `from '../../src'`).replace(module, `from '../../src/`)
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

function typecheck(projectName: string): (modules: Array<parser.Module>) => App<void> {
  return modules => M => {
    const examplePattern = path.join(outDir, 'examples')

    const clean = pipe(
      M.debug(`Clean up examples: deleting ${examplePattern}...`),
      TE.chain(() => M.clean(examplePattern))
    )

    const examples = handleImports(getExampleFiles(modules), projectName)

    if (examples.length === 0) {
      return clean
    }

    const files = [getExampleIndex(examples), ...examples]

    const typecheckExamples: Eff<void> = TE.fromIOEither(() => {
      const { status } = spawnSync('ts-node', [path.join(outDir, 'examples', 'index.ts')], { stdio: 'inherit' })
      return status === 0 ? E.right(undefined) : E.left('Type checking error')
    })

    return pipe(
      M.log(`Writing examples...`),
      TE.chain(() => writeFiles(files)(M)),
      TE.chain(() => M.log(`Type checking examples...`)),
      TE.chain(() => typecheckExamples),
      TE.chain(() => clean)
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

function getMarkdownOutpuPath(module: parser.Module): string {
  return path.join(outDir, 'modules', module.path.slice(1).join(path.sep) + '.md')
}

function getModuleMarkdownFiles(modules: Array<parser.Module>): Array<File> {
  return modules.map(module => file(getMarkdownOutpuPath(module), markdown.printModule(module, counter++), true))
}

function getMarkdownFiles(projectName: string, homepage: string): (modules: Array<parser.Module>) => Array<File> {
  return modules => [home, modulesIndex, getConfigYML(projectName, homepage), ...getModuleMarkdownFiles(modules)]
}

function writeMarkdownFiles(files: Array<File>): App<void> {
  return M => {
    const outPattern = path.join(outDir, '**/*.ts.md')
    return pipe(
      M.log(`Writing markdown...`),
      TE.chain(() => M.debug(`Clean up docs folder: deleting ${outPattern}...`)),
      TE.chain(() => M.clean(outPattern)),
      TE.chain(() => writeFiles(files)(M))
    )
  }
}

function checkHomepage(pkg: PackageJSON): E.Either<string, string> {
  return pkg.homepage === undefined ? E.left('Missing homepage in package.json') : E.right(pkg.homepage)
}

export const main: App<void> = pipe(
  getPackageJSON,
  RTE.chain(pkg =>
    pipe(
      RTE.fromEither(checkHomepage(pkg)),
      RTE.chain(homepage =>
        pipe(
          readSources,
          RTE.chain(parseModules),
          RTE.chainFirst(typecheck(pkg.name)),
          RTE.map(getMarkdownFiles(pkg.name, homepage)),
          RTE.chain(writeMarkdownFiles)
        )
      )
    )
  )
)
