import * as TE from 'fp-ts/TaskEither';
/**
 * Executes a command like:
 *
 * ```sh
 * ts-node examples/index.ts
 * ```
 *
 * where `command = ts-node` and `executable = examples/index.ts`
 *
 * @category utils
 * @since 0.6.0
 */
export declare const spawn: (command: string, executable: string) => TE.TaskEither<string, void>;
