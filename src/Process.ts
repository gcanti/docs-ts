/**
 * @since 0.9.0
 */
import * as Effect from '@effect/io/Effect'

/**
 * @since 0.9.0
 */
export const cwd = Effect.sync(() => process.cwd())
