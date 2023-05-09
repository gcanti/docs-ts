import * as RTE from 'fp-ts/ReaderTaskEither';
import * as TE from 'fp-ts/TaskEither';
import * as ast from 'ts-morph';
import * as Config from './Config';
import { File, FileSystem } from './FileSystem';
import { Logger } from './Logger';
/**
 * @category model
 * @since 0.6.0
 */
export interface Capabilities {
    /**
     * Executes a command like:
     *
     * ```sh
     * ts-node examples/index.ts
     * ```
     *
     * where `command = ts-node` and `executable = examples/index.ts`
     */
    readonly spawn: (command: string, executable: string) => TE.TaskEither<string, void>;
    readonly fileSystem: FileSystem;
    readonly logger: Logger;
    readonly addFile: (file: File) => (project: ast.Project) => void;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Program<A> extends RTE.ReaderTaskEither<Capabilities, string, A> {
}
/**
 * @category model
 * @since 0.6.0
 */
export interface EnvironmentWithConfig extends Capabilities {
    readonly config: Config.Config;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface ProgramWithConfig<A> extends RTE.ReaderTaskEither<EnvironmentWithConfig, string, A> {
}
/**
 * @category program
 * @since 0.6.0
 */
export declare const main: Program<void>;
