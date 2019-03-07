/**
 * @file markdown utilities
 */
import { Module, Example } from './parser';
export declare function printExamples(examples: Array<Example>): string;
export declare function printHeader(title: string, order: number): string;
export declare function printModule(module: Module, counter: number): string;
