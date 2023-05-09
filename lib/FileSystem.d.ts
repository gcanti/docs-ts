import * as TE from 'fp-ts/TaskEither';
import * as glob from 'glob';
import * as rimraf from 'rimraf';
/**
 * Represents operations that can be performed on a file system.
 *
 * @category model
 * @since 0.6.0
 */
export interface FileSystem {
    readonly readFile: (path: string) => TE.TaskEither<string, string>;
    readonly writeFile: (path: string, content: string) => TE.TaskEither<string, void>;
    readonly exists: (path: string) => TE.TaskEither<string, boolean>;
    readonly remove: (pattern: string) => TE.TaskEither<string, void>;
    readonly search: (pattern: string, exclude: ReadonlyArray<string>) => TE.TaskEither<string, ReadonlyArray<string>>;
}
/**
 * Represents a file which can be optionally overwriteable.
 *
 * @category model
 * @since 0.6.0
 */
export interface File {
    readonly path: string;
    readonly content: string;
    readonly overwrite: boolean;
}
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const File: (path: string, content: string, overwrite?: boolean) => File;
/**
 * Reads a file.
 *
 * @category utils
 * @since 0.6.0
 */
export declare const readFile: (path: string, encoding: string) => TE.TaskEither<Error, string>;
/**
 * Similar to `writeFile` (i.e. it overwrites), except that if the parent directory does not exist, it's created.
 *
 * @category utils
 * @since 0.6.0
 */
export declare const writeFile: (path: string, data: string, options: {
    readonly encoding?: string;
    readonly flag?: string;
    readonly mode?: number;
}) => TE.TaskEither<Error, void>;
/**
 * @category utils
 * @since 0.6.0
 */
export declare const exists: (path: string) => TE.TaskEither<Error, boolean>;
/**
 * Removes a file or directory based upon the specified pattern. The directory can have contents.
 * If the path does not exist, silently does nothing.
 *
 * @category utils
 * @since 0.6.0
 */
export declare const remove: (path: string, options: rimraf.Options) => TE.TaskEither<Error, void>;
/**
 * Searches for files matching the specified glob pattern.
 *
 * @category utils
 * @since 0.6.0
 */
export declare const search: (pattern: string, options: glob.IOptions) => TE.TaskEither<Error, ReadonlyArray<string>>;
/**
 * @category instances
 * @since 0.6.0
 */
export declare const FileSystem: FileSystem;
