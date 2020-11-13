/**
 * @since 0.2.0
 */
import chalk from 'chalk'
import { log } from 'fp-ts/Console'
import * as IO from 'fp-ts/IO'
import { pipe } from 'fp-ts/pipeable'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'

import * as Core from './Core'
import { FileSystem } from './FileSystem'
import { Logger } from './Logger'

const capabilities: Core.Capabilities = {
  ...FileSystem,
  ...Logger
}

const exit = (code: 0 | 1): IO.IO<void> => () => process.exit(code)

const onLeft = (e: string): T.Task<void> =>
  T.fromIO(
    pipe(
      log(chalk.bold.red(e)),
      IO.chain(() => exit(1))
    )
  )

const onRight: T.Task<void> = T.fromIO(log(chalk.bold.green('Docs generation succeeded!')))

/**
 * @since 0.6.0
 */
export const main: T.Task<void> = pipe(
  Core.main(capabilities),
  TE.fold(onLeft, () => onRight)
)
