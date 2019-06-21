import { log } from 'fp-ts/lib/Console'
import * as IO from 'fp-ts/lib/IO'
import { pipe } from 'fp-ts/lib/pipeable'
import * as T from 'fp-ts/lib/Task'
import * as TE from 'fp-ts/lib/TaskEither'
import * as fs from 'fs-extra'
import * as glob from 'glob'
import * as rimraf from 'rimraf'
import * as core from './core'

const monadApp: core.MonadApp = {
  ...TE.taskEither,
  getFilenames: (pattern: string) => T.fromIO(() => glob.sync(pattern)),
  readFile: (path: string) => TE.rightIO(() => fs.readFileSync(path, { encoding: 'utf8' })),
  writeFile: (path: string, content: string) => TE.rightIO(() => fs.outputFileSync(path, content)),
  existsFile: (path: string) => T.fromIO(() => fs.existsSync(path)),
  clean: (pattern: string) => T.fromIO(() => rimraf.sync(pattern)),
  log: (message: string) => TE.rightIO(log(message))
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
  return T.of(undefined)
}

export const main: T.Task<void> = pipe(
  core.main(monadApp),
  TE.fold(onLeft, onRight)
)
