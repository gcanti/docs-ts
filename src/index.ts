import { IO } from 'fp-ts/lib/IO'
import * as fs from 'fs-extra'
import * as glob from 'glob'
import * as path from 'path'
import * as ts from 'typescript'
import * as core from './core'
import * as rimraf from 'rimraf'
import * as Console from 'fp-ts/lib/Console'

const srcDir = 'src/**/*.ts'

/**
 * App instance
 */
const app: core.MonadApp = {
  readOptions: new IO(() => {
    const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile).config
    const { options } = ts.parseJsonConfigFileContent(config, ts.sys, process.cwd())
    return options
  }),
  readProjectName: new IO(() => require(path.join(process.cwd(), 'package.json')).name),
  readPaths: new IO(() => glob.sync(srcDir)),
  readFile: path => new IO(() => fs.readFileSync(path, { encoding: 'utf8' })),
  writeFile: (path, content) => new IO(() => fs.outputFileSync(path, content)),
  exists: path => new IO(() => fs.existsSync(path)),
  clean: pattern => new IO(() => rimraf.sync(pattern)),
  log: Console.log
}

export const main: IO<void> = core.main(app)
