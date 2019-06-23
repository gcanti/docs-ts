import { log } from 'fp-ts/lib/Console'
import * as IO from 'fp-ts/lib/IO'
import { pipe } from 'fp-ts/lib/pipeable'
import * as T from 'fp-ts/lib/Task'
import * as TE from 'fp-ts/lib/TaskEither'
import * as fs from 'fs-extra'
import * as glob from 'glob'
import * as rimraf from 'rimraf'
import * as core from './core'
import chalk from 'chalk'

const monadApp: core.MonadApp = {
  ...TE.taskEither,
  getFilenames: (pattern: string) => TE.rightIO(() => glob.sync(pattern)),
  readFile: (path: string) => TE.rightIO(() => fs.readFileSync(path, { encoding: 'utf8' })),
  writeFile: (path: string, content: string) => TE.rightIO(() => fs.outputFileSync(path, content)),
  existsFile: (path: string) => TE.rightIO(() => fs.existsSync(path)),
  clean: (pattern: string) => TE.rightIO(() => rimraf.sync(pattern)),
  info: (message: string) => TE.rightIO(log(chalk.bold.magenta(message))),
  log: (message: string) => TE.rightIO(log(chalk.cyan(message))),
  debug: (message: string) => TE.rightIO(log(chalk.gray(message)))
}

const exit = (code: 0 | 1): IO.IO<void> => () => process.exit(code)

function onLeft(e: string): T.Task<void> {
  return T.fromIO(
    pipe(
      log(e),
      IO.chain(() => exit(1))
    )
  )
}

function onRight(): T.Task<void> {
  return T.fromIO(log(chalk.bold.green('Docs generation succeeded!')))
}

export const main: T.Task<void> = pipe(
  core.main(monadApp),
  TE.fold(onLeft, onRight)
)
