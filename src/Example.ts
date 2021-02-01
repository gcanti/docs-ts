/**
 * @since 0.6.0
 */
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import { spawnSync } from 'child_process'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Represents a file containing examples specified in the documentation of a module
 * or its exports which can be "run" to determine if they pass the TypeScript type
 * checker.
 *
 * @category model
 * @since 0.6.0
 */
export interface Example {
  readonly run: (command: string, executablePath: string) => TE.TaskEither<string, void>
}

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * @category utils
 * @since 0.6.0
 */
export const run = (command: string, executablePath: string): TE.TaskEither<string, void> =>
  pipe(
    TE.fromEither(E.tryCatch(() => spawnSync(command, [executablePath], { stdio: 'pipe', encoding: 'utf8' }), String)),
    TE.chain(({ status, stderr }) => (status === 0 ? TE.right(undefined) : TE.left(stderr)))
  )

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 0.6.0
 */
export const Example: Example = {
  run
}
