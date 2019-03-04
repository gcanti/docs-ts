import * as core from './core'
import { Task, fromIO as fromIOTask } from 'fp-ts/lib/Task'
import { IO } from 'fp-ts/lib/IO'
import * as glob from 'glob'
import * as fs from 'fs-extra'
import { fromIO } from 'fp-ts/lib/TaskEither'
import * as rimraf from 'rimraf'
import { log } from 'fp-ts/lib/Console'

const monadApp: core.MonadApp = {
  getFilenames: (pattern: string) => fromIOTask(new IO(() => glob.sync(pattern))),
  readFile: (path: string) => fromIO(new IO(() => fs.readFileSync(path, { encoding: 'utf8' }))),
  writeFile: (path: string, content: string) => fromIO(new IO(() => fs.outputFileSync(path, content))),
  existsFile: (path: string) => fromIOTask(new IO(() => fs.existsSync(path))),
  clean: (pattern: string) => fromIOTask(new IO(() => rimraf.sync(pattern))),
  log: (message: string) => fromIOTask(log(message)),
  exit: (code: 0 | 1) => fromIOTask(new IO(() => process.exit(code)))
}

export const main: Task<void> = core.main(monadApp)
