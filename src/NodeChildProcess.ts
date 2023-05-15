/**
 * @since 0.9.0
 */
import * as NodeChildProcess from 'node:child_process'

import * as Either from '@effect/data/Either'
import { flow } from '@effect/data/Function'

/**
 * Executes a command like:
 *
 * ```sh
 * ts-node docs/examples/index.ts
 * ```
 *
 * where `command = ts-node` and `executable = docs/examples/index.ts`
 *
 * @since 0.9.0
 */
export const spawn: (command: string, executable: string) => Either.Either<Error, void> = flow(
  Either.liftThrowable(
    (command: string, executable: string) =>
      NodeChildProcess.spawnSync(command, [executable], { stdio: 'pipe', encoding: 'utf8' }),
    (e) => (e instanceof Error ? e : new Error(String(e)))
  ),
  Either.flatMap(({ status, stderr }) => (status === 0 ? Either.right(undefined) : Either.left(new Error(stderr))))
)
