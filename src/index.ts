import * as core from './core'
import { Task, fromIO as fromIOTask, task } from 'fp-ts/lib/Task'
import { IO } from 'fp-ts/lib/IO'
import * as glob from 'glob'
import * as fs from 'fs-extra'
import { fromIO, taskEither } from 'fp-ts/lib/TaskEither'
import * as rimraf from 'rimraf'
import { log } from 'fp-ts/lib/Console'

const monadApp: core.MonadApp = {
  ...taskEither,
  getFilenames: (pattern: string) => fromIOTask(new IO(() => glob.sync(pattern))),
  readFile: (path: string) => fromIO(new IO(() => fs.readFileSync(path, { encoding: 'utf8' }))),
  writeFile: (path: string, content: string) => fromIO(new IO(() => fs.outputFileSync(path, content))),
  existsFile: (path: string) => fromIOTask(new IO(() => fs.existsSync(path))),
  clean: (pattern: string) => fromIOTask(new IO(() => rimraf.sync(pattern))),
  log: (message: string) => fromIO(log(message))
}

const exit = (code: 0 | 1) => new IO(() => process.exit(code))

function onLeft(e: string): Task<void> {
  return fromIOTask(log(e).chain(() => exit(1)))
}

function onRight(): Task<void> {
  return task.of(undefined)
}

export const main: Task<void> = core.main(monadApp).foldTask(onLeft, onRight)
