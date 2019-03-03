/**
 * @file examples type-checking
 */
import * as ts from 'typescript';
export declare function getProgram(source: Record<string, string>, options: ts.CompilerOptions): ts.Program;
export declare const defaultOptions: ts.CompilerOptions;
export declare function check(sources: Record<string, string>, options: ts.CompilerOptions): Array<string>;
