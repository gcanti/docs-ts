import * as S from 'fp-ts/Show';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
/**
 * @category model
 * @since 0.6.0
 */
export interface Logger {
    readonly debug: (message: string) => TE.TaskEither<string, void>;
    readonly error: (message: string) => TE.TaskEither<string, void>;
    readonly info: (message: string) => TE.TaskEither<string, void>;
}
/**
 * @category model
 * @since 0.6.0
 */
export type LogLevel = 'DEBUG' | 'ERROR' | 'INFO';
/**
 * @category model
 * @since 0.6.0
 */
export interface LogEntry {
    readonly message: string;
    readonly date: Date;
    readonly level: LogLevel;
}
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const LogEntry: (message: string, date: Date, level: LogLevel) => LogEntry;
/**
 * @category utils
 * @since 0.6.0
 */
export declare const debug: (message: string) => T.Task<void>;
/**
 * @category utils
 * @since 0.6.0
 */
export declare const error: (message: string) => T.Task<void>;
/**
 * @category utils
 * @since 0.6.0
 */
export declare const info: (message: string) => T.Task<void>;
/**
 * @category instances
 * @since 0.6.0
 */
export declare const showEntry: S.Show<LogEntry>;
/**
 * @category instances
 * @since 0.6.0
 */
export declare const Logger: Logger;
