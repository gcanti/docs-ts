import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Traced';
/**
 * @category model
 * @since 0.6.0
 */
export interface ConfigBuilder extends T.Traced<Config, Settings> {
}
/**
 * @category model
 * @since 0.6.4
 */
export interface Config {
    readonly projectHomepage: string;
    readonly srcDir: string;
    readonly outDir: string;
    readonly theme: string;
    readonly enableSearch: boolean;
    readonly enforceDescriptions: boolean;
    readonly enforceExamples: boolean;
    readonly enforceVersion: boolean;
    readonly exclude: ReadonlyArray<string>;
    readonly compilerOptions: Record<string, unknown>;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Settings {
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
    readonly compilerOptions: Record<string, unknown>;
}
/**
 * @category constructors
 * @since 0.6.4
 */
export declare const build: (projectName: string, projectHomepage: string) => ConfigBuilder;
/**
 * @category destructors
 * @since 0.6.0
 */
export declare const resolveSettings: (builder: ConfigBuilder) => Settings;
/**
 * @category combinators
 * @since 0.6.4
 */
export declare const updateProjectHomepage: (projectHomepage: string) => (wa: ConfigBuilder) => ConfigBuilder;
/**
 * @category combinators
 * @since 0.6.0
 */
export declare const updateSourceDir: (srcDir: string) => (wa: ConfigBuilder) => ConfigBuilder;
/**
 * @category combinators
 * @since 0.6.0
 */
export declare const updateOutDir: (outDir: string) => (wa: ConfigBuilder) => ConfigBuilder;
/**
 * @category combinators
 * @since 0.6.0
 */
export declare const updateTheme: (theme: string) => (wa: ConfigBuilder) => ConfigBuilder;
/**
 * @category combinators
 * @since 0.6.0
 */
export declare const updateSearchEnabled: (enableSearch: boolean) => (wa: ConfigBuilder) => ConfigBuilder;
/**
 * @category combinators
 * @since 0.6.0
 */
export declare const updateEnforceDescriptions: (enforceDescriptions: boolean) => (wa: ConfigBuilder) => ConfigBuilder;
/**
 * @category combinators
 * @since 0.6.0
 */
export declare const updateEnforceExamples: (enforceExamples: boolean) => (wa: ConfigBuilder) => ConfigBuilder;
/**
 * @category combinators
 * @since 0.6.0
 */
export declare const updateEnforceVersion: (enforceVersion: boolean) => (wa: ConfigBuilder) => ConfigBuilder;
/**
 * @category combinators
 * @since 0.6.0
 */
export declare const updateExclusions: (exclude: ReadonlyArray<string>) => (wa: ConfigBuilder) => ConfigBuilder;
/**
 * @category utils
 * @since 0.6.4
 */
export declare const decode: (input: unknown) => TE.TaskEither<string, Partial<Config>>;
