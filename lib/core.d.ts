import { Task } from 'fp-ts/lib/Task';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import { MonadTask2 } from 'fp-ts/lib/MonadTask';
export interface App<A> extends TaskEither<string, A> {
}
export interface MonadFileSystem {
    getFilenames: (pattern: string) => Task<Array<string>>;
    readFile: (path: string) => App<string>;
    writeFile: (path: string, content: string) => App<void>;
    existsFile: (path: string) => Task<boolean>;
    clean: (pattern: string) => Task<void>;
}
export interface MonadLog {
    log: (message: string) => App<void>;
}
export interface MonadProcess {
    exit: (code: 0 | 1) => Task<void>;
}
/**
 * App capabilities
 */
export interface MonadApp extends MonadFileSystem, MonadLog, MonadProcess, MonadTask2<'TaskEither'> {
}
export declare function main(M: MonadApp): App<void>;
