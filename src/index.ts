/**
 * @since 0.2.0
 */
import chalk from 'chalk'
import { log } from 'fp-ts/Console'
import * as IO from 'fp-ts/IO'
import { pipe } from 'fp-ts/pipeable'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import * as ast from 'ts-morph'

import * as Core from './Core'
import * as Parser from './Parser'
import { Example } from './Example'
import { FileSystem } from './FileSystem'
import { Logger } from './Logger'

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

const exitProcess = (code: 0 | 1): IO.IO<void> => () => process.exit(code)

const onLeft = (e: string): T.Task<void> =>
  T.fromIO(
    pipe(
      log(chalk.bold.red(e)),
      IO.chain(() => exitProcess(1))
    )
  )

const onRight: T.Task<void> = pipe(
  T.fromIO(log(chalk.bold.green('Docs generation succeeded!'))),
  T.chain(() => T.fromIO(exitProcess(0)))
)

/**
 * @category utils
 * @since 0.6.0
 */
export const exit: (program: TE.TaskEither<string, void>) => T.Task<void> = TE.fold(onLeft, () => onRight)

/**
 * @category utils
 * @since 0.6.7
 */
export const compilerOptions: ast.ProjectOptions['compilerOptions'] = {
  strict: true
}

const capabilities: Core.Capabilities = {
  example: Example,
  fileSystem: FileSystem,
  logger: Logger,
  ast: {
    project: new ast.Project({
      compilerOptions
    }),
    addFile: Parser.addFileToProject
  }
}

/**
 * @category utils
 * @since 0.6.0
 */
export const main: T.Task<void> = pipe(Core.main(capabilities), exit)
