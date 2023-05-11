/**
 * @since 0.8.0
 */
import { spawnSync } from 'child_process'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'

/**
 * Executes a command like:
 *
 * ```sh
 * ts-node examples/index.ts
 * ```
 *
 * where `command = ts-node` and `executable = examples/index.ts`
 *
 * @category utils
 * @since 0.6.0
 */
export const spawn = (command: string, executable: string): TE.TaskEither<string, void> =>
  pipe(
    TE.fromEither(E.tryCatch(() => spawnSync(command, [executable], { stdio: 'pipe', encoding: 'utf8' }), String)),
    TE.flatMap(({ status, stderr }) => (status === 0 ? TE.right(undefined) : TE.left(stderr)))
  )
