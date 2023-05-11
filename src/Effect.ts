/**
 * @since 0.8.1
 */
import * as Effect from '@effect/io/Effect'
import * as Schema from '@effect/schema/Schema'
import * as TaskEither from 'fp-ts/TaskEither'
import * as fs from 'fs-extra'

// -------------------------------------------------------------------------------------
// adapters
// -------------------------------------------------------------------------------------

/**
 * @since 0.8.1
 */
export const toTaskEither =
  <E, A>(eff: Effect.Effect<never, E, A>): TaskEither.TaskEither<E, A> =>
  () =>
    Effect.runPromiseEither(eff)

// -------------------------------------------------------------------------------------
// FileSystem
// -------------------------------------------------------------------------------------

/**
 * @since 0.8.1
 */
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

const UnknownRecordSchema = Schema.record(Schema.string, Schema.unknown)

/**
 * Represents the content of the configuration file `docs-ts.json`
 * @since 0.8.1
 */
export const ConfigSchema = Schema.struct({
  projectName: Schema.string,
  projectHomepage: Schema.string,
  srcDir: Schema.string,
  outDir: Schema.string,
  theme: Schema.string,
  enableSearch: Schema.boolean,
  enforceDescriptions: Schema.boolean,
  enforceExamples: Schema.boolean,
  enforceVersion: Schema.boolean,
  exclude: Schema.array(Schema.string),
  parseCompilerOptions: UnknownRecordSchema,
  examplesCompilerOptions: UnknownRecordSchema
})

/**
 * Represents the content of the configuration file `docs-ts.json`
 * @since 0.8.1
 */
export interface Config extends Schema.To<typeof ConfigSchema> {}
