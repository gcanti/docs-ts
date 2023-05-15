/**
 * @since 0.9.0
 */
import * as NodePath from 'node:path'

import * as Either from '@effect/data/Either'
import { pipe } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import * as Effect from '@effect/io/Effect'
import * as Schema from '@effect/schema/Schema'
import * as TreeFormatter from '@effect/schema/TreeFormatter'
import chalk from 'chalk'

import * as FileSystem from './FileSystem'
import * as Logger from './Logger'
import * as Process from './Process'
import * as Service from './Service'

/** read a JSON file and parse the content */
const readJsonFile = (path: string): Effect.Effect<never, Error, unknown> =>
  pipe(
    FileSystem.readFile(path),
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
    Effect.flatMap(getConfigPath, FileSystem.exists),
    pipe(
      Logger.info(chalk.bold('Configuration file found')),
      Effect.flatMap(() => getConfigPath),
      Effect.flatMap((configPath) => parseJsonFile(configPath, PartialConfigSchema)),
      Effect.map(Option.some)
    ),
    pipe(
      Logger.info(chalk.bold('No configuration file detected, using default configuration')),
      Effect.as(Option.none())
    )
  )
)

/**
 * @since 0.9.0
 */
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
