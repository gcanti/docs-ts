import * as RE from 'fp-ts/ReaderEither';
import * as RTE from 'fp-ts/ReaderTaskEither';
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray';
import * as ast from 'ts-morph';
import { Environment } from './Core';
import { File } from './FileSystem';
import { Class, Constant, Export, Function, Interface, Module, TypeAlias } from './Module';
/**
 * @category model
 * @since 0.6.0
 */
export interface Parser<A> extends RE.ReaderEither<ParserEnv, string, A> {
}
/**
 * @category model
 * @since 0.6.0
 */
export interface ParserEnv extends Environment {
    readonly path: RNEA.ReadonlyNonEmptyArray<string>;
    readonly sourceFile: ast.SourceFile;
}
/**
 * @category parsers
 * @since 0.6.0
 */
export declare const parseInterfaces: Parser<ReadonlyArray<Interface>>;
/**
 * @category parsers
 * @since 0.6.0
 */
export declare const parseFunctions: Parser<ReadonlyArray<Function>>;
/**
 * @category parsers
 * @since 0.6.0
 */
export declare const parseTypeAliases: Parser<ReadonlyArray<TypeAlias>>;
/**
 * @category parsers
 * @since 0.6.0
 */
export declare const parseConstants: Parser<ReadonlyArray<Constant>>;
/**
 * @category parsers
 * @since 0.6.0
 */
export declare const parseExports: Parser<ReadonlyArray<Export>>;
/**
 * @category parsers
 * @since 0.6.0
 */
export declare const parseClasses: Parser<ReadonlyArray<Class>>;
/**
 * @category parsers
 * @since 0.6.0
 */
export declare const parseModule: Parser<Module>;
/**
 * @category parsers
 * @since 0.6.0
 */
export declare const parseFiles: (files: ReadonlyArray<File>) => RTE.ReaderTaskEither<Environment, string, ReadonlyArray<Module>>;
