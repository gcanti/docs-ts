import { Task } from 'fp-ts/lib/Task';
import { TaskEither } from 'fp-ts/lib/TaskEither';
/**
 * @file core
 */
export interface MonadFileSystem {
    getFilenames: (pattern: string) => Task<Array<string>>;
    readFile: (path: string) => TaskEither<string, string>;
    writeFile: (path: string, content: string) => TaskEither<string, void>;
    existsFile: (path: string) => Task<boolean>;
    clean: (pattern: string) => Task<void>;
}
export interface MonadLog {
    log: (message: string) => Task<void>;
}
export interface MonadProcess {
    exit: (code: 0 | 1) => Task<void>;
}
/**
 * App capabilities
 */
export interface MonadApp extends MonadFileSystem, MonadLog, MonadProcess {
}
export declare function main(M: MonadApp): Task<void>;
