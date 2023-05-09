"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystem = exports.search = exports.remove = exports.exists = exports.writeFile = exports.readFile = exports.toErrorMsg = exports.File = void 0;
/**
 * @since 0.6.0
 */
var function_1 = require("fp-ts/function");
var TE = require("fp-ts/TaskEither");
var fs = require("fs-extra");
var glob = require("glob");
var rimraf = require("rimraf");
// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------
/**
 * @category constructors
 * @since 0.6.0
 */
var File = function (path, content, overwrite) {
    if (overwrite === void 0) { overwrite = false; }
    return ({
        path: path,
        content: content,
        overwrite: overwrite
    });
};
exports.File = File;
// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------
/**
 * @internal
 */
var toErrorMsg = function (err) { return String(err.message); };
exports.toErrorMsg = toErrorMsg;
/**
 * Reads a file.
 *
 * @category utils
 * @since 0.6.0
 */
exports.readFile = TE.taskify(fs.readFile);
/**
 * Similar to `writeFile` (i.e. it overwrites), except that if the parent directory does not exist, it's created.
 *
 * @category utils
 * @since 0.6.0
 */
exports.writeFile = TE.taskify(fs.outputFile);
/**
 * @category utils
 * @since 0.6.0
 */
exports.exists = TE.taskify(fs.pathExists);
/**
 * Removes a file or directory based upon the specified pattern. The directory can have contents.
 * If the path does not exist, silently does nothing.
 *
 * @category utils
 * @since 0.6.0
 */
exports.remove = TE.taskify(rimraf);
/**
 * Searches for files matching the specified glob pattern.
 *
 * @category utils
 * @since 0.6.0
 */
exports.search = TE.taskify(glob);
// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------
/**
 * @category instances
 * @since 0.6.0
 */
exports.FileSystem = {
    readFile: function (path) { return (0, function_1.pipe)((0, exports.readFile)(path, 'utf8'), TE.mapLeft(exports.toErrorMsg)); },
    writeFile: function (path, content) { return (0, function_1.pipe)((0, exports.writeFile)(path, content, { encoding: 'utf8' }), TE.mapLeft(exports.toErrorMsg)); },
    exists: (0, function_1.flow)(exports.exists, TE.mapLeft(exports.toErrorMsg)),
    remove: function (pattern) { return (0, function_1.pipe)((0, exports.remove)(pattern, {}), TE.mapLeft(exports.toErrorMsg)); },
    search: function (pattern, exclude) { return (0, function_1.pipe)((0, exports.search)(pattern, { ignore: exclude }), TE.mapLeft(exports.toErrorMsg)); }
};
