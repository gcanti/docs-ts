/**
 * @since 0.9.0
 */
import * as NodeChildProcess from 'node:child_process'
import * as NodePath from 'node:path'

import * as Either from '@effect/data/Either'
import { flow, pipe } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import * as Effect from '@effect/io/Effect'
import * as Schema from '@effect/schema/Schema'
import * as TreeFormatter from '@effect/schema/TreeFormatter'
import chalk from 'chalk'
import * as fs from 'fs-extra'
import * as Glob from 'glob'
import * as rimraf from 'rimraf'

import * as Process from './Process'
import * as Service from './Service'

// -------------------------------------------------------------------------------------
// spawn
// -------------------------------------------------------------------------------------

/**
 * Executes a command like:
 *
 * ```sh
 * ts-node examples/index.ts
 * ```
 *
 * where `command = ts-node` and `executable = examples/index.ts`
 *
 * @internal
 */
export const spawn: (command: string, executable: string) => Either.Either<Error, void> = flow(
  Either.liftThrowable(
    (command: string, executable: string) =>
      NodeChildProcess.spawnSync(command, [executable], { stdio: 'pipe', encoding: 'utf8' }),
    (e) => (e instanceof Error ? e : new Error(String(e)))
  ),
  Either.flatMap(({ status, stderr }) => (status === 0 ? Either.right(undefined) : Either.left(new Error(stderr))))
)

// -------------------------------------------------------------------------------------
// Logger
// -------------------------------------------------------------------------------------

/** @internal */
export const debug = (message: string): Effect.Effect<never, never, void> =>
  Effect.sync(() => console.log(chalk.gray(`[DEBUG] ${message}`)))

/** @internal */
export const info = (message: string): Effect.Effect<never, never, void> =>
  Effect.sync(() => console.info(`[INFO]  ${message}`))

// -------------------------------------------------------------------------------------
// FileSystem
// -------------------------------------------------------------------------------------

/**
 * Represents a file which can be optionally overwriteable.
 *
 * @category model
 * @since 0.9.0
 */
export interface File {
  readonly path: string
  readonly content: string
  readonly overwrite: boolean
}

/**
 * By default files are readonly (`overwrite = false`).
 *
 * @category constructors
 * @since 0.9.0
 */
export const createFile = (path: string, content: string, overwrite = false): File => ({
  path,
  content,
  overwrite
})

/** @internal */
export const readFile = (path: string): Effect.Effect<never, Error, string> =>
  Effect.async((resume) =>
    fs.readFile(path, 'utf8', (error, data) => {
      if (error) {
        resume(Effect.fail(error))
      } else {
        resume(Effect.succeed(data))
      }
    })
  )

/** @internal */
export const writeFile = (path: string, content: string): Effect.Effect<never, Error, void> =>
  Effect.async((resume) =>
    fs.outputFile(path, content, { encoding: 'utf8' }, (error) => {
      if (error) {
        resume(Effect.fail(error))
      } else {
        resume(Effect.succeed(undefined))
      }
    })
  )

/** @internal */
export const remove = (path: string): Effect.Effect<never, Error, void> =>
  Effect.async((resume) =>
    rimraf(path, {}, (error) => {
      if (error) {
        resume(Effect.fail(error))
      } else {
        resume(Effect.succeed(undefined))
      }
    })
  )

/** @internal */
export const glob = (pattern: string, exclude: ReadonlyArray<string>): Effect.Effect<never, Error, Array<string>> =>
  Effect.async((resume) =>
    Glob(pattern, { ignore: exclude }, (error, data) => {
      if (error) {
        resume(Effect.fail(error))
      } else {
        resume(Effect.succeed(data))
      }
    })
  )

/** @internal */
export const exists = (path: string): Effect.Effect<never, Error, boolean> =>
  Effect.async((resume) =>
    fs.pathExists(path, (error, data) => {
      if (error) {
        resume(Effect.fail(error))
      } else {
        resume(Effect.succeed(data))
      }
    })
  )

/** read a JSON file and parse the content */
const readJsonFile = (path: string): Effect.Effect<never, Error, unknown> =>
  pipe(
    readFile(path),
    Effect.flatMap(Either.liftThrowable(JSON.parse, (e) => (e instanceof Error ? e : new Error(String(e)))))
  )

const parseJsonFile = <I, A>(path: string, schema: Schema.Schema<I, A>): Effect.Effect<never, Error, A> =>
  pipe(
    readJsonFile(path),
    Effect.flatMap((input) =>
      pipe(
        Schema.parseEither(schema)(input),
        Either.mapLeft((e) => new Error(TreeFormatter.formatErrors(e.errors)))
      )
    )
  )

// -------------------------------------------------------------------------------------
// Config
// -------------------------------------------------------------------------------------

const ConfigSchema = Schema.struct({
  projectHomepage: Schema.string,
  srcDir: Schema.string,
  outDir: Schema.string,
  theme: Schema.string,
  enableSearch: Schema.boolean,
  enforceDescriptions: Schema.boolean,
  enforceExamples: Schema.boolean,
  enforceVersion: Schema.boolean,
  exclude: Schema.array(Schema.string),
  parseCompilerOptions: Schema.record(Schema.string, Schema.unknown),
  examplesCompilerOptions: Schema.record(Schema.string, Schema.unknown)
})

const PartialConfigSchema = Schema.partial(ConfigSchema)

/**
 * @category Config
 * @since 0.9.0
 */
export interface Config extends Schema.To<typeof ConfigSchema> {
  readonly projectName: string
}

const PackageJSONSchema = Schema.struct({
  name: Schema.string,
  homepage: Schema.string
})

const parsePackageJson = pipe(
  Process.cwd,
  Effect.flatMap((cwd) => parseJsonFile(NodePath.join(cwd, 'package.json'), PackageJSONSchema))
)

const getConfigPath = Effect.map(Process.cwd, (cwd) => NodePath.join(cwd, 'docs-ts.json'))

const loadConfig = pipe(
  Effect.ifEffect(
    Effect.flatMap(getConfigPath, exists),
    pipe(
      info(chalk.bold('Configuration file found')),
      Effect.flatMap(() => getConfigPath),
      Effect.flatMap((configPath) => parseJsonFile(configPath, PartialConfigSchema)),
      Effect.map(Option.some)
    ),
    pipe(info(chalk.bold('No configuration file detected, using default configuration')), Effect.as(Option.none()))
  )
)

/** @internal */
export const getConfig: Effect.Effect<never, Error, Service.Config> = pipe(
  Effect.all(parsePackageJson, loadConfig),
  Effect.map(([pkg, config]) => {
    const defaultConfig = getDefaultConfig(pkg.name, pkg.homepage)
    return {
      config: Option.match(
        config,
        () => defaultConfig,
        (config) => ({ ...defaultConfig, ...config })
      )
    }
  })
)

const getDefaultConfig = (projectName: string, projectHomepage: string): Config => {
  return {
    projectName,
    projectHomepage,
    srcDir: 'src',
    outDir: 'docs',
    theme: 'pmarsceill/just-the-docs',
    enableSearch: true,
    enforceDescriptions: false,
    enforceExamples: false,
    enforceVersion: true,
    exclude: [],
    parseCompilerOptions: {},
    examplesCompilerOptions: {}
  }
}
