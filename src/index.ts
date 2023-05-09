/**
 * @since 0.2.0
 */
import chalk from 'chalk'
import * as Console from 'fp-ts/Console'
import * as IO from 'fp-ts/IO'
import * as Task from 'fp-ts/Task'
import * as TaskEither from 'fp-ts/TaskEither'

import * as Core from './Core'
import { capabilities } from './Production'

const exit =
  (code: 0 | 1): IO.IO<void> =>
  () =>
    process.exit(code)

const handleResult: (program: TaskEither.TaskEither<string, void>) => Task.Task<void> = TaskEither.matchE(
  (error) => Task.fromIO(IO.flatMap(Console.log(chalk.bold.red(error)), () => exit(1))),
  () => Task.fromIO(IO.flatMap(Console.log(chalk.bold.green('Docs generation succeeded!')), () => exit(0)))
)

/**
 * @example
 * assert.deepStrictEqual(1, 1)
 *
 * @category main
 * @since 0.6.0
 */
export const main: Task.Task<void> = handleResult(Core.main(capabilities))
