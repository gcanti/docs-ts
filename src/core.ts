/**
 * @file core
 */

import { array, empty } from 'fp-ts/lib/Array'
import { identity, tuple } from 'fp-ts/lib/function'
import { IO, io } from 'fp-ts/lib/IO'
import { fold, getArrayMonoid } from 'fp-ts/lib/Monoid'
import { fromFoldable, map } from 'fp-ts/lib/Record'
import { failure, success, Validation } from 'fp-ts/lib/Validation'
import * as path from 'path'
import * as ts from 'typescript'
import { check } from './check'
import * as markdown from './markdown'
import * as parser from './parser'

export interface MonadProject {
  readOptions: IO<ts.CompilerOptions>
  readProjectName: IO<string>
  readPaths: IO<Array<string>>
}

export interface MonadFileSystem {
  readFile: (path: string) => IO<string>
  writeFile: (path: string, content: string) => IO<void>
  exists: (path: string) => IO<boolean>
  clean: (patterm: string) => IO<void>
}

export interface MonadLog {
  log: (message: string) => IO<void>
}

/**
 * App capabilities
 */
export interface MonadApp extends MonadFileSystem, MonadProject, MonadLog {}

function getMarkdownOutpuPath(outDir: string, module: parser.Module): string {
  return path.join(outDir, 'modules', module.path.slice(1).join(path.sep) + '.md')
}

type Example = [string, string]

/**
 * @internal
 */
export function fixExamples(examples: Record<string, string>, projectName: string): Record<string, string> {
  function replaceProjectName(source: string): string {
    const root = new RegExp(`from '${projectName}'`, 'g')
    const module = new RegExp(`from '${projectName}/lib/`, 'g')
    return source.replace(root, `from './src'`).replace(module, `from './src/`)
  }

  return map(examples, source => {
    const prelude = source.indexOf('assert.') !== -1 ? `import * as assert from 'assert'\n` : ''
    const mangledSource = replaceProjectName(source)
    return prelude + mangledSource
  })
}

function typecheckModules(
  modules: Array<parser.Module>,
  projectName: string,
  options: ts.CompilerOptions
): Validation<Array<string>, Array<parser.Module>> {
  if (!doTypeCheckExamples) {
    return success(modules)
  }
  const examples = getExamples(modules)
  const fixedExamples = fixExamples(examples, projectName)
  const failures = check(fixedExamples, options)
  return failures.length > 0 ? failure(failures) : success(modules)
}

const foldExamples = fold(getArrayMonoid<Example>())

/**
 * @internal
 */
export function getExamples(modules: Array<parser.Module>): Record<string, string> {
  const sources = array.chain(modules, module => {
    const prefix = module.path.join('-')
    function getDocumentableExamples(documentable: parser.Documentable): Array<Example> {
      return documentable.example.fold(empty, source => {
        const name = prefix + '-' + documentable.name + '.ts'
        return [tuple(name, source)]
      })
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
  return fromFoldable(array)(sources, identity)
}

function readFilesFromPaths(M: MonadFileSystem, paths: Array<string>): IO<Array<parser.File>> {
  return array.traverse(io)(paths, path => M.readFile(path).map(content => ({ path, content })))
}

let counter = 1

const nextCounter = new IO(() => counter++)

function getFile(module: parser.Module): IO<parser.File> {
  return nextCounter.map(counter => ({
    path: getMarkdownOutpuPath(outDir, module),
    content: markdown.printModule(module, counter)
  }))
}

const compilerOptionsOverrides: ts.CompilerOptions = { noEmit: true }
const outDir = 'docs'
const doTypeCheckExamples = true

const P = parser.monadParser

function writeModules(M: MonadFileSystem & MonadLog, modules: Array<parser.Module>): IO<void> {
  return array
    .traverse(io)(modules, module =>
      getFile(module).chain(file =>
        M.log(`Printing module ${file.path}`).applySecond(M.writeFile(file.path, file.content))
      )
    )
    .map(() => undefined)
}

function addIndex(M: MonadFileSystem & MonadLog): IO<void> {
  const indexPath = path.join(outDir, 'index.md')
  return M.exists(indexPath).chain(b =>
    !b
      ? M.log(`Adding index.md to ${outDir}...`).chain(() =>
          M.writeFile(
            indexPath,
            `---
title: Home
nav_order: 1
---
`
          )
        )
      : io.of(undefined)
  )
}

function addModulesIndex(M: MonadFileSystem & MonadLog): IO<void> {
  const indexPath = path.join(outDir, 'modules', 'index.md')
  return M.exists(indexPath).chain(b =>
    !b
      ? M.log(`Adding modules/index.md to ${outDir}...`).chain(() =>
          M.writeFile(
            indexPath,
            `---
title: Modules
has_children: true
permalink: /docs/modules
nav_order: 2
---
`
          )
        )
      : io.of(undefined)
  )
}

function addConfigYML(M: MonadFileSystem & MonadLog, projectName: string): IO<void> {
  const indexPath = path.join(outDir, '_config.yml')
  return M.exists(indexPath).chain(b =>
    !b
      ? M.log(`Adding _config.yml to ${outDir}...`).chain(() =>
          M.writeFile(
            indexPath,
            `remote_theme: pmarsceill/just-the-docs

# Enable or disable the site search
search_enabled: true

# Aux links for the upper right navigation
aux_links:
  '${projectName} on GitHub':
    - '//github.com/gcanti/${projectName}'
`
          )
        )
      : io.of(undefined)
  )
}

export function main(M: MonadApp): IO<void> {
  return M.readOptions.chain(projectOptions =>
    M.readProjectName.chain(projectName =>
      M.readPaths.chain(paths => {
        const cleanPattern = path.join(outDir, '**/*.ts.md')
        return M.log(`Removing files ${cleanPattern}...`)
          .chain(() => M.clean(cleanPattern))
          .chain(() => addIndex(M))
          .chain(() => addModulesIndex(M))
          .chain(() => addConfigYML(M, projectName))
          .chain(() => {
            return readFilesFromPaths(M, paths).chain(files => {
              const options: ts.CompilerOptions = { ...projectOptions, ...compilerOptionsOverrides }
              const eModules = P.chain(parser.run(files), modules => typecheckModules(modules, projectName, options))
              const eWrite = eModules.map(modules => writeModules(M, modules))
              return eWrite.getOrElseL(errors => M.log(`Errors: ${errors.join('\n')}`))
            })
          })
      })
    )
  )
}
