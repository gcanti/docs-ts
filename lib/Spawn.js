"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawn = void 0;
/**
 * @since 0.6.0
 */
var child_process_1 = require("child_process");
var E = require("fp-ts/Either");
var function_1 = require("fp-ts/function");
var TE = require("fp-ts/TaskEither");
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
var spawn = function (command, executable) {
    return (0, function_1.pipe)(TE.fromEither(E.tryCatch(function () { return (0, child_process_1.spawnSync)(command, [executable], { stdio: 'pipe', encoding: 'utf8' }); }, String)), TE.flatMap(function (_a) {
        var status = _a.status, stderr = _a.stderr;
        return (status === 0 ? TE.right(undefined) : TE.left(stderr));
    }));
};
exports.spawn = spawn;
