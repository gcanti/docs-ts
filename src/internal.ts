/**
 * @since 0.8.1
 */
import * as Either from '@effect/data/Either'
import { pipe } from '@effect/data/Function'
import * as Effect from '@effect/io/Effect'
import * as Schema from '@effect/schema/Schema'
import * as TreeFormatter from '@effect/schema/TreeFormatter'
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

// -------------------------------------------------------------------------------------
// Config
// -------------------------------------------------------------------------------------

const CompilerOptions = Schema.record(Schema.string, Schema.unknown)

const Path = Schema.string

const Pattern = Schema.string

const ConfigSchema = Schema.struct({
  projectHomepage: Schema.string,
  srcDir: Path,
  outDir: Path,
  theme: Schema.string,
  enableSearch: Schema.boolean,
  enforceDescriptions: Schema.boolean,
  enforceExamples: Schema.boolean,
  enforceVersion: Schema.boolean,
  exclude: Schema.array(Pattern),
  parseCompilerOptions: CompilerOptions,
  examplesCompilerOptions: CompilerOptions
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
export const parseConfig = (input: unknown): Either.Either<Error, Partial<Config>> =>
  pipe(
    Schema.parseEither(PartialConfigSchema)(input),
    Either.mapLeft((e) => new Error(TreeFormatter.formatErrors(e.errors)))
  )
