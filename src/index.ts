/**
 * @since 0.2.0
 */
import chalk from 'chalk'
import * as Console from 'fp-ts/Console'
import * as IO from 'fp-ts/IO'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import * as Core from './Core'
import { capabilities } from './Production'

const exit =
  (code: 0 | 1): IO.IO<void> =>
  () =>
    process.exit(code)

const handleResult: (program: TE.TaskEither<string, void>) => T.Task<void> = TE.matchE(
  (e) => T.fromIO(IO.flatMap(Console.log(chalk.bold.red(e)), () => exit(1))),
  () => T.fromIO(IO.flatMap(Console.log(chalk.bold.green('Docs generation succeeded!')), () => exit(0)))
)

/**
 * @category main
 * @since 0.6.0
 */
export const main: T.Task<void> = handleResult(Core.main(capabilities))
