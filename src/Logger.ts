/**
 * @since 0.6.0
 */
import * as C from 'fp-ts/Console'
import * as D from 'fp-ts/Date'
import * as M from 'fp-ts/Monoid'
import * as S from 'fp-ts/Show'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import * as L from 'logging-ts/lib/Task'
import chalk from 'chalk'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.6.0
 */
export interface Logger {
  readonly debug: (message: string) => TE.TaskEither<string, void>
  readonly error: (message: string) => TE.TaskEither<string, void>
  readonly info: (message: string) => TE.TaskEither<string, void>
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

const getLoggerEntry = (withColor: (...message: ReadonlyArray<string>) => string): L.LoggerTask<LogEntry> => entry =>
  T.fromIO(C.log(withColor(showEntry.show(entry))))

const debugLogger = L.filter(getLoggerEntry(chalk.cyan), e => e.level === 'DEBUG')

const errorLogger = L.filter(getLoggerEntry(chalk.bold.red), e => e.level === 'ERROR')

const infoLogger = L.filter(getLoggerEntry(chalk.bold.magenta), e => e.level === 'INFO')

const mainLogger = pipe([debugLogger, errorLogger, infoLogger], M.fold(L.getMonoid<LogEntry>()))

const logWithLevel = (level: LogLevel) => (message: string): T.Task<void> =>
  pipe(
    T.fromIO(D.create),
    T.chain(date => mainLogger({ message, date, level }))
  )

/**
 * @category constructors
 * @since 0.6.0
 */
export const debug: (message: string) => T.Task<void> = logWithLevel('DEBUG')

/**
 * @category constructors
 * @since 0.6.0
 */
export const error: (message: string) => T.Task<void> = logWithLevel('ERROR')

/**
 * @category constructors
 * @since 0.6.0
 */
export const info: (message: string) => T.Task<void> = logWithLevel('INFO')

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

const showDate: S.Show<Date> = {
  show: date => `${date.toLocaleDateString()} | ${date.toLocaleTimeString()}`
}

/**
 * @category instances
 * @since 0.6.0
 */
export const showEntry: S.Show<LogEntry> = {
  show: ({ message, date, level }) => `${showDate.show(date)} | ${level} | ${message}`
}

const toErrorMsg = (err: Error): string => String(err.message)

/**
 * @category instances
 * @since 0.6.0
 */
export const Logger: Logger = {
  debug: message => pipe(TE.fromTask<Error, void>(debug(message)), TE.mapLeft(toErrorMsg)),
  error: message => pipe(TE.fromTask<Error, void>(error(message)), TE.mapLeft(toErrorMsg)),
  info: message => pipe(TE.fromTask<Error, void>(info(message)), TE.mapLeft(toErrorMsg))
}
