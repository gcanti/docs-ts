import * as T from 'fp-ts/lib/Task'
import * as TE from 'fp-ts/lib/TaskEither'
import * as parser from './parser'
import * as path from 'path'
import * as A from 'fp-ts/lib/Array'
import { fold } from 'fp-ts/lib/Monoid'
import * as markdown from './markdown'
import * as E from 'fp-ts/lib/Either'
import { spawnSync } from 'child_process'
import { MonadTask2 } from 'fp-ts/lib/MonadTask'
import { pipe } from 'fp-ts/lib/pipeable'

export interface App<A> extends TE.TaskEither<string, A> {}

export interface MonadFileSystem {
  getFilenames: (pattern: string) => T.Task<Array<string>>
  readFile: (path: string) => App<string>
  writeFile: (path: string, content: string) => App<void>
  existsFile: (path: string) => T.Task<boolean>
  clean: (pattern: string) => T.Task<void>
}

export interface MonadLog {
  log: (message: string) => App<void>
}

/**
 * App capabilities
 */
export interface MonadApp extends MonadFileSystem, MonadLog, MonadTask2<'TaskEither'> {}

const outDir = 'docs'
const srcDir = 'src'

interface PackageJSON {
  name: string
  homepage?: string
}

interface File {
  path: string
  content: string
  overwrite: boolean
}

const file = (path: string, content: string, overwrite: boolean): File => ({ path, content, overwrite })

const traverse = A.array.traverse(TE.taskEither)

function readFiles(M: MonadFileSystem, paths: Array<string>): App<Array<File>> {
  return traverse(paths, path =>
    pipe(
      M.readFile(path),
      TE.map(content => file(path, content, false))
    )
  )
}

function writeFile(M: MonadApp, file: File): App<void> {
  const writeFile = M.writeFile(file.path, file.content)
  return pipe(
    M.fromTask<string, boolean>(M.existsFile(file.path)),
    TE.chain(exists => {
      if (exists) {
        if (file.overwrite) {
          return pipe(
            M.log(`Overwriting file ${file.path}`),
            TE.chain(() => writeFile)
          )
        } else {
          return M.log(`File ${file.path} already exists, skipping creation`)
        }
      } else {
        return pipe(
          M.log(`Writing file ${file.path}`),
          TE.chain(() => writeFile)
        )
      }
    })
  )
}

function writeFiles(M: MonadApp, files: Array<File>): App<void> {
  return pipe(
    traverse(files, file => writeFile(M, file)),
    TE.map(() => undefined)
  )
}

function getPackageJSON(M: MonadFileSystem & MonadLog): App<PackageJSON> {
  return pipe(
    M.readFile(path.join(process.cwd(), 'package.json')),
    TE.chain(s => {
      const json = JSON.parse(s)
      const name = json.name
      const homepage = json.homepage
      return pipe(
        M.log(`Project name detected: ${name}`),
        TE.map(() => ({
          name,
          homepage
        }))
      )
    })
  )
}

function readSources(M: MonadApp): App<Array<File>> {
  const srcPattern = path.join(srcDir, '**', '*.ts')
  return pipe(
    M.fromTask<string, Array<string>>(M.getFilenames(srcPattern)),
    TE.map(paths => A.array.map(paths, path.normalize)),
    TE.chain(paths =>
      pipe(
        M.log(`${paths.length} modules found`),
        TE.chain(() => readFiles(M, paths))
      )
    )
  )
}

function parseModules(M: MonadLog, files: Array<File>): App<Array<parser.Module>> {
  return pipe(
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

const foldExamples = fold(A.getMonoid<File>())

function getExampleFiles(modules: Array<parser.Module>): Array<File> {
  return A.array.chain(modules, module => {
    const prefix = module.path.join('-')
    function getDocumentableExamples(documentable: parser.Documentable): Array<File> {
      return documentable.examples.map((content, i) =>
        file(path.join(outDir, 'examples', prefix + '-' + documentable.name + '-' + i + '.ts'), content + '\n', true)
      )
    }
    const methods = A.array.chain(module.classes, c =>
      foldExamples([
        A.array.chain(c.methods, getDocumentableExamples),
        A.array.chain(c.staticMethods, getDocumentableExamples)
      ])
    )
    const interfaces = A.array.chain(module.interfaces, getDocumentableExamples)
    const typeAliases = A.array.chain(module.typeAliases, getDocumentableExamples)
    const constants = A.array.chain(module.constants, getDocumentableExamples)
    const functions = A.array.chain(module.functions, getDocumentableExamples)

    return foldExamples([methods, interfaces, typeAliases, constants, functions])
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

function typecheck(M: MonadApp, modules: Array<parser.Module>, projectName: string): App<Array<parser.Module>> {
  const examplePattern = path.join(outDir, 'examples')
  const clean = pipe(
    M.log(`Clean up examples: deleting ${examplePattern}...`),
    TE.chain(() => M.fromTask(M.clean(examplePattern)))
  )
  const examples = handleImports(getExampleFiles(modules), projectName)
  if (examples.length === 0) {
    return pipe(
      clean,
      TE.map(() => modules)
    )
  }
  const files = [getExampleIndex(examples), ...examples]

  const typecheckExamples: App<void> = TE.fromIOEither(() => {
    const { status } = spawnSync('ts-node', [path.join(outDir, 'examples', 'index.ts')], { stdio: 'inherit' })
    return status === 0 ? E.right(undefined) : E.left('Type checking error')
  })

  return pipe(
    writeFiles(M, files),
    TE.chain(() => M.log(`Type checking examples...`)),
    TE.chain(() => typecheckExamples),
    TE.chain(() => clean),
    TE.map(() => modules)
  )
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

function getMarkdownFiles(modules: Array<parser.Module>, projectName: string, homepage: string): Array<File> {
  return [home, modulesIndex, getConfigYML(projectName, homepage), ...getModuleMarkdownFiles(modules)]
}

function writeMarkdownFiles(M: MonadApp, files: Array<File>): App<void> {
  const outPattern = path.join(outDir, '**/*.ts.md')
  return pipe(
    M.log(`Clean up docs folder: deleting ${outPattern}...`),
    TE.chain(() => M.fromTask(M.clean(outPattern))),
    TE.chain(() => writeFiles(M, files))
  )
}

function checkHomepage(pkg: PackageJSON): App<string> {
  return pkg.homepage === undefined ? TE.left('Missing homepage in package.json') : TE.right(pkg.homepage)
}

export function main(M: MonadApp): App<void> {
  return pipe(
    getPackageJSON(M),
    TE.chain(pkg =>
      pipe(
        checkHomepage(pkg),
        TE.chain(homepage =>
          pipe(
            readSources(M),
            TE.chain(modules => parseModules(M, modules)),
            TE.chain(modules => typecheck(M, modules, pkg.name)),
            TE.map(modules => getMarkdownFiles(modules, pkg.name, homepage)),
            TE.chain(markdownFiles => writeMarkdownFiles(M, markdownFiles))
          )
        )
      )
    )
  )
}
