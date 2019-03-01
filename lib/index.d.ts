import * as parser from './parser';
import { IO } from 'fp-ts/lib/IO';
import { Validation } from 'fp-ts/lib/Validation';
import * as ts from 'typescript';
export declare function getExamples(nodes: Array<parser.Node>): Record<string, string>;
export declare function checkExamples(examples: Record<string, string>, options: ts.CompilerOptions): Validation<Array<string>, void>;
export declare function mangleExamples(examples: Record<string, string>, projectName: string): Record<string, string>;
export declare function main(): IO<void>;
