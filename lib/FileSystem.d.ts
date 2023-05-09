import * as TE from 'fp-ts/TaskEither';
/**
 * Represents operations that can be performed on a file system.
 *
 * @category model
 * @since 0.6.0
 */
export interface FileSystem {
    readonly readFile: (path: string) => TE.TaskEither<string, string>;
    /**
     * If the parent directory does not exist, it's created.
     */
    readonly writeFile: (path: string, content: string) => TE.TaskEither<string, void>;
    readonly exists: (path: string) => TE.TaskEither<string, boolean>;
    /**
     * Removes a file or directory based upon the specified pattern. The directory can have contents.
     * If the path does not exist, silently does nothing.
     */
    readonly remove: (pattern: string) => TE.TaskEither<string, void>;
    /**
     * Searches for files matching the specified glob pattern.
     */
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
 * By default files are readonly (`overwrite = false`).
 *
 * @category constructors
 * @since 0.6.0
 */
export declare const File: (path: string, content: string, overwrite?: boolean) => File;
/**
 * @category instances
 * @since 0.6.0
 */
export declare const FileSystem: FileSystem;
