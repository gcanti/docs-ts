/**
 * @since 0.9.0
 */
import * as Effect from '@effect/io/Effect'
import * as fs from 'fs-extra'
import * as Glob from 'glob'
import * as rimraf from 'rimraf'

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
