/**
 * @since 0.9.0
 */
import * as Effect from '@effect/io/Effect'
import chalk from 'chalk'

/**
 * @since 0.9.0
 */
export const debug = (message: string): Effect.Effect<never, never, void> =>
  Effect.sync(() => console.log(chalk.gray(`[DEBUG] ${message}`)))

/**
 * @since 0.9.0
 */
export const info = (message: string): Effect.Effect<never, never, void> =>
  Effect.sync(() => console.info(`[INFO]  ${message}`))
