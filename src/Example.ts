/**
 * @since 0.6.0
 */
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
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
  TE.fromIOEither(() => {
    const { status } = spawnSync(command, [executablePath], { stdio: 'inherit' })
    return status === 0 ? E.right(undefined) : E.left('Type checking error')
  })

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
