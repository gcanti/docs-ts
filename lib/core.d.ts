/**
 * @file core
 */
import { IO } from 'fp-ts/lib/IO';
import * as ts from 'typescript';
import * as parser from './parser';
export interface MonadProject {
    readOptions: IO<ts.CompilerOptions>;
    readProjectName: IO<string>;
    readPaths: IO<Array<string>>;
}
export interface MonadFileSystem {
    readFile: (path: string) => IO<string>;
    writeFile: (path: string, content: string) => IO<void>;
    exists: (path: string) => IO<boolean>;
    clean: (patterm: string) => IO<void>;
}
export interface MonadLog {
    log: (message: string) => IO<void>;
}
/**
 * App capabilities
 */
export interface MonadApp extends MonadFileSystem, MonadProject, MonadLog {
}
/**
 * @internal
 */
export declare function fixExamples(examples: Record<string, string>, projectName: string): Record<string, string>;
/**
 * @internal
 */
export declare function getExamples(modules: Array<parser.Module>): Record<string, string>;
export declare function main(M: MonadApp): IO<void>;
