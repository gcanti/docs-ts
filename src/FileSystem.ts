/**
 * @since 0.6.0
 */
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as fs from 'fs-extra'
import * as glob from 'glob'
import * as rimraf from 'rimraf'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Represents operations that can be performed on a file system.
 *
 * @category model
 * @since 0.6.0
 */
export interface FileSystem {
  readonly readFile: (path: string) => TE.TaskEither<string, string>
  readonly writeFile: (path: string, content: string) => TE.TaskEither<string, void>
  readonly exists: (path: string) => TE.TaskEither<string, boolean>
  readonly remove: (pattern: string) => TE.TaskEither<string, void>
  readonly search: (pattern: string, exclude: ReadonlyArray<string>) => TE.TaskEither<string, ReadonlyArray<string>>
}

/**
 * Represents a file which can be optionally overwriteable.
 *
 * @category model
 * @since 0.6.0
 */
export interface File {
  readonly path: string
  readonly content: string
  readonly overwrite: boolean
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.6.0
 */
export const File = (path: string, content: string, overwrite: boolean = false): File => ({
  path,
  content,
  overwrite
})

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * @internal
 */
export const toErrorMsg = (err: Error): string => String(err.message)

/**
 * Reads a file.
 *
 * @category utils
 * @since 0.6.0
 */
export const readFile: (path: string, encoding: string) => TE.TaskEither<Error, string> = TE.taskify<
  string,
  string,
  Error,
  string
>(fs.readFile)

/**
 * Similar to `writeFile` (i.e. it overwrites), except that if the parent directory does not exist, it's created.
 *
 * @category utils
 * @since 0.6.0
 */
export const writeFile: (
  path: string,
  data: string,
  options: {
    readonly encoding?: string
    readonly flag?: string
    readonly mode?: number
  }
) => TE.TaskEither<Error, void> = TE.taskify<string, string, fs.WriteFileOptions, Error, void>(fs.outputFile)

/**
 * @category utils
 * @since 0.6.0
 */
export const exists: (path: string) => TE.TaskEither<Error, boolean> = TE.taskify<string, Error, boolean>(fs.pathExists)

/**
 * Removes a file or directory based upon the specified pattern. The directory can have contents.
 * If the path does not exist, silently does nothing.
 *
 * @category utils
 * @since 0.6.0
 */
export const remove: (path: string, options: rimraf.Options) => TE.TaskEither<Error, void> = TE.taskify<
  string,
  rimraf.Options,
  Error,
  void
>(rimraf)

/**
 * Searches for files matching the specified glob pattern.
 *
 * @category utils
 * @since 0.6.0
 */
export const search: (pattern: string, options: glob.IOptions) => TE.TaskEither<Error, ReadonlyArray<string>> =
  TE.taskify<string, glob.IOptions, Error, ReadonlyArray<string>>(glob)

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 0.6.0
 */
export const FileSystem: FileSystem = {
  readFile: (path) => pipe(readFile(path, 'utf8'), TE.mapLeft(toErrorMsg)),
  writeFile: (path, content) => pipe(writeFile(path, content, { encoding: 'utf8' }), TE.mapLeft(toErrorMsg)),
  exists: flow(exists, TE.mapLeft(toErrorMsg)),
  remove: (pattern) => pipe(remove(pattern, {}), TE.mapLeft(toErrorMsg)),
  search: (pattern, exclude) => pipe(search(pattern, { ignore: exclude }), TE.mapLeft(toErrorMsg))
}
