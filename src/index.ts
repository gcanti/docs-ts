/**
 * @since 0.2.0
 */
import { pipe } from '@effect/data/Function'
import * as Effect from '@effect/io/Effect'
import chalk from 'chalk'

import * as Core from './Core'

/**
 * @category main
 * @since 0.6.0
 */
export const main = pipe(
  Core.main,
  Effect.flatMap(() =>
    Effect.sync(() => {
      console.log(chalk.bold.green('[OK] docs generation succeeded'))
      process.exit(0)
    })
  ),
  Effect.catchAll((error) =>
    Effect.sync(() => {
      console.error(chalk.bold.red(error.message))
      process.exit(1)
    })
  )
)
