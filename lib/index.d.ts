import * as parser from './parser';
import { IO } from 'fp-ts/lib/IO';
export declare function getExamples(nodes: Array<parser.Node>): Record<string, string>;
/**
 * @since 0.0.1
 */
export declare function main(pattern: string, outDir: string): IO<void>;
