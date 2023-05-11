/**
 * @since 0.6.0
 */
import chalk from 'chalk'
import * as C from 'fp-ts/Console'
import * as D from 'fp-ts/Date'
import { pipe } from 'fp-ts/function'
import * as M from 'fp-ts/Monoid'
import * as S from 'fp-ts/Show'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import * as L from 'logging-ts/lib/Task'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.6.0
 */
export interface Logger {
  readonly debug: (message: string) => TE.TaskEither<Error, void>
  readonly error: (message: string) => TE.TaskEither<Error, void>
  readonly info: (message: string) => TE.TaskEither<Error, void>
}

/**
 * @category model
 * @since 0.6.0
 */
export type LogLevel = 'DEBUG' | 'ERROR' | 'INFO'

/**
 * @category model
 * @since 0.6.0
 */
export interface LogEntry {
  readonly message: string
  readonly date: Date
  readonly level: LogLevel
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.6.0
 */
export const LogEntry = (message: string, date: Date, level: LogLevel): LogEntry => ({
  message,
  date,
  level
})

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

const getLoggerEntry =
  (withColor: (...message: ReadonlyArray<string>) => string): L.LoggerTask<LogEntry> =>
  (entry) =>
    T.fromIO(C.log(withColor(showEntry.show(entry))))

const debugLogger = L.filter(getLoggerEntry(chalk.cyan), (e) => e.level === 'DEBUG')

const errorLogger = L.filter(getLoggerEntry(chalk.bold.red), (e) => e.level === 'ERROR')

const infoLogger = L.filter(getLoggerEntry(chalk.bold.magenta), (e) => e.level === 'INFO')

const mainLogger = pipe([debugLogger, errorLogger, infoLogger], M.concatAll(L.getMonoid<LogEntry>()))

const logWithLevel =
  (level: LogLevel) =>
  (message: string): T.Task<void> =>
    pipe(
      T.fromIO(D.create),
      T.flatMap((date) => mainLogger({ message, date, level }))
    )

/**
 * @category utils
 * @since 0.6.0
 */
export const debug: (message: string) => T.Task<void> = logWithLevel('DEBUG')

/**
 * @category utils
 * @since 0.6.0
 */
export const error: (message: string) => T.Task<void> = logWithLevel('ERROR')

/**
 * @category utils
 * @since 0.6.0
 */
export const info: (message: string) => T.Task<void> = logWithLevel('INFO')

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

const showDate: S.Show<Date> = {
  show: (date) => `${date.toLocaleDateString()} | ${date.toLocaleTimeString()}`
}

/**
 * @category instances
 * @since 0.6.0
 */
export const showEntry: S.Show<LogEntry> = {
  show: ({ message, date, level }) => `${showDate.show(date)} | ${level} | ${message}`
}

/**
 * @category instances
 * @since 0.6.0
 */
export const Logger: Logger = {
  debug: (message) => TE.fromTask(debug(message)),
  error: (message) => TE.fromTask(error(message)),
  info: (message) => TE.fromTask(info(message))
}
