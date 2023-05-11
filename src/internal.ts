/**
 * @since 0.8.1
 */
import * as NodePath from 'node:path'

import * as Either from '@effect/data/Either'
import { pipe } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import * as Effect from '@effect/io/Effect'
import * as Schema from '@effect/schema/Schema'
import * as TreeFormatter from '@effect/schema/TreeFormatter'
import chalk from 'chalk'
import * as ReaderTaskEither from 'fp-ts/ReaderTaskEither'
import * as TaskEither from 'fp-ts/TaskEither'
import * as fs from 'fs-extra'

// -------------------------------------------------------------------------------------
// adapters
// -------------------------------------------------------------------------------------

/** @internal */
export const toTaskEither =
  <E, A>(eff: Effect.Effect<never, E, A>): TaskEither.TaskEither<E, A> =>
  () =>
    Effect.runPromiseEither(eff)

/** @internal */
export const toReaderTaskEither =
  <R, E, A>(eff: Effect.Effect<never, E, A>): ReaderTaskEither.ReaderTaskEither<R, E, A> =>
  () =>
    toTaskEither(eff)

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

/** @internal */
export const PartialConfigSchema = Schema.partial(ConfigSchema)

/**
 * @category Config
 * @since 0.8.1
 */
export interface Config extends Schema.To<typeof ConfigSchema> {
  readonly projectName: string
}

/** @internal */
export const getConfig: Effect.Effect<never, Error, Config> = pipe(
  Effect.Do(),
  Effect.bind('pkg', () => parsePackageJson),
  Effect.bind('config', () => parseConfig),
  Effect.map(({ pkg, config }) => {
    const defaultConfig = getDefaultConfig(pkg.name, pkg.homepage)
    return Option.match(
      config,
      () => defaultConfig,
      (config) => ({ ...defaultConfig, ...config })
    )
  })
)

const PackageJSONSchema = Schema.struct({
  name: Schema.string,
  homepage: Schema.string
})

const parsePackageJson = parseJsonFile(NodePath.join(process.cwd(), 'package.json'), PackageJSONSchema)

const configPath = NodePath.join(process.cwd(), 'docs-ts.json')

const parseConfig = pipe(
  exists(configPath),
  Effect.flatMap((exists) =>
    exists
      ? pipe(
          info('Configuration file found'),
          Effect.flatMap(() => parseJsonFile(configPath, PartialConfigSchema)),
          Effect.map(Option.some)
        )
      : pipe(
          info('No configuration file detected, using default configuration'),
          Effect.map(() => Option.none())
        )
  )
)

/** @internal */
export const getDefaultConfig = (projectName: string, projectHomepage: string): Config => {
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
