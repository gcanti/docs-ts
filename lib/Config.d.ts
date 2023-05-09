/**
 * @since 0.6.0
 */
import * as E from 'fp-ts/Either';
/**
 * @category model
 * @since 0.6.4
 */
export interface Config {
    readonly projectName: string;
    readonly projectHomepage: string;
    readonly srcDir: string;
    readonly outDir: string;
    readonly theme: string;
    readonly enableSearch: boolean;
    readonly enforceDescriptions: boolean;
    readonly enforceExamples: boolean;
    readonly enforceVersion: boolean;
    readonly exclude: ReadonlyArray<string>;
    readonly parseCompilerOptions: Record<string, unknown>;
    readonly examplesCompilerOptions: Record<string, unknown>;
}
/**
 * @since 0.6.4
 */
export declare const decode: (input: unknown) => E.Either<string, Partial<Config>>;
