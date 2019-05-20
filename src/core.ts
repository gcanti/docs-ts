import { Task } from 'fp-ts/lib/Task'
import { TaskEither, taskEither, fromEither, fromIOEither, fromLeft } from 'fp-ts/lib/TaskEither'
import * as parser from './parser'
import * as path from 'path'
import { array } from 'fp-ts/lib/Array'
import { getArrayMonoid, fold } from 'fp-ts/lib/Monoid'
import * as markdown from './markdown'
import { fromValidation, right as rightEither, left as leftEither } from 'fp-ts/lib/Either'
import { spawnSync } from 'child_process'
import { IO } from 'fp-ts/lib/IO'
import { IOEither } from 'fp-ts/lib/IOEither'
import { MonadTask2 } from 'fp-ts/lib/MonadTask'

export interface App<A> extends TaskEither<string, A> {}

export interface MonadFileSystem {
  getFilenames: (pattern: string) => Task<Array<string>>
  readFile: (path: string) => App<string>
  writeFile: (path: string, content: string) => App<void>
  existsFile: (path: string) => Task<boolean>
  clean: (pattern: string) => Task<void>
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

function readFiles(M: MonadFileSystem, paths: Array<string>): App<Array<File>> {
  return array.traverse(taskEither)(paths, path => M.readFile(path).map(content => file(path, content, false)))
}

function writeFile(M: MonadApp, file: File): App<void> {
  const writeFile = M.writeFile(file.path, file.content)
  return M.fromTask<string, boolean>(M.existsFile(file.path)).chain(exists => {
    if (exists) {
      if (file.overwrite) {
        return M.log(`Overwriting file ${file.path}`).chain(() => writeFile)
      } else {
        return M.log(`File ${file.path} already exists, skipping creation`)
      }
    } else {
      return M.log(`Writing file ${file.path}`).chain(() => writeFile)
    }
  })
}

function writeFiles(M: MonadApp, files: Array<File>): App<void> {
  return array
    .traverse(taskEither)(files, file => writeFile(M, file))
    .map(() => undefined)
}

function getPackageJSON(M: MonadFileSystem & MonadLog): App<PackageJSON> {
  return M.readFile(path.join(process.cwd(), 'package.json')).chain(s => {
    const json = JSON.parse(s)
    const name = json.name
    const homepage = json.homepage
    return M.log(`Project name detected: ${name}`).map(() => ({
      name,
      homepage
    }))
  })
}

function readSources(M: MonadApp): App<Array<File>> {
  const srcPattern = path.join(srcDir, '**', '*.ts')
  return M.fromTask<string, Array<string>>(M.getFilenames(srcPattern))
    .map(paths => array.map(paths, path.normalize))
    .chain(paths => M.log(`${paths.length} modules found`).chain(() => readFiles(M, paths)))
}

function parseModules(M: MonadLog, files: Array<File>): App<Array<parser.Module>> {
  return M.log('Parsing modules...').chain(() =>
    fromEither(fromValidation(parser.run(files).mapFailure(errors => errors.join('\n'))))
  )
}

const foldExamples = fold(getArrayMonoid<File>())

function getExampleFiles(modules: Array<parser.Module>): Array<File> {
  return array.chain(modules, module => {
    const prefix = module.path.join('-')
    function getDocumentableExamples(documentable: parser.Documentable): Array<File> {
      return documentable.examples.map((content, i) =>
        file(path.join(outDir, 'examples', prefix + '-' + documentable.name + '-' + i + '.ts'), content + '\n', true)
      )
    }
    const methods = array.chain(module.classes, c =>
      foldExamples([
        array.chain(c.methods, getDocumentableExamples),
        array.chain(c.staticMethods, getDocumentableExamples)
      ])
    )
    const interfaces = array.chain(module.interfaces, getDocumentableExamples)
    const typeAliases = array.chain(module.typeAliases, getDocumentableExamples)
    const constants = array.chain(module.constants, getDocumentableExamples)
    const functions = array.chain(module.functions, getDocumentableExamples)

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
  const clean = M.log(`Clean up examples: deleting ${examplePattern}...`).chain(() =>
    M.fromTask(M.clean(examplePattern))
  )
  const examples = handleImports(getExampleFiles(modules), projectName)
  if (examples.length === 0) {
    return clean.map(() => modules)
  }
  const files = [getExampleIndex(examples), ...examples]

  const typecheckExamples: App<void> = fromIOEither(
    new IOEither(
      new IO(() => {
        const { status } = spawnSync('ts-node', [path.join(outDir, 'examples', 'index.ts')], { stdio: 'inherit' })
        return status === 0 ? rightEither(undefined) : leftEither('Type checking error')
      })
    )
  )

  return writeFiles(M, files)
    .chain(() => M.log(`Type checking examples...`).chain(() => typecheckExamples))
    .chain(() => clean)
    .map(() => modules)
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
  return M.log(`Clean up docs folder: deleting ${outPattern}...`)
    .chain(() => M.fromTask(M.clean(outPattern)))
    .chain(() => writeFiles(M, files))
}

function checkHomepage(pkg: PackageJSON): App<string> {
  return pkg.homepage === undefined ? fromLeft('Missing homepage in package.json') : taskEither.of(pkg.homepage)
}

export function main(M: MonadApp): App<void> {
  return getPackageJSON(M).chain(pkg => {
    return checkHomepage(pkg).chain(homepage =>
      readSources(M)
        .chain(modules => parseModules(M, modules))
        .chain(modules => typecheck(M, modules, pkg.name))
        .map(modules => getMarkdownFiles(modules, pkg.name, homepage))
        .chain(markdownFiles => writeMarkdownFiles(M, markdownFiles))
    )
  })
}
