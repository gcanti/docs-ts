/**
 * @file examples type-checking
 */
import { Option } from 'fp-ts/lib/Option';
import * as ts from 'typescript';
export declare function getProgram(source: Record<string, string>, options: ts.CompilerOptions): ts.Program;
export declare const defaultOptions: ts.CompilerOptions;
export declare function evaluate(source: string): Option<unknown>;
export declare function transpile(source: string, options: ts.CompilerOptions): string;
export declare function check(sources: Record<string, string>, options: ts.CompilerOptions): Array<string>;
