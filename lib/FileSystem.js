"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystem = exports.File = void 0;
/**
 * @since 0.6.0
 */
var function_1 = require("fp-ts/function");
var TE = require("fp-ts/TaskEither");
var fs = require("fs-extra");
var glob = require("glob");
var rimraf = require("rimraf");
var Logger_1 = require("./Logger");
/**
 * By default files are readonly (`overwrite = false`).
 *
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
var readFile = TE.taskify(fs.readFile);
var writeFile = TE.taskify(fs.outputFile);
var exists = TE.taskify(fs.pathExists);
var remove = TE.taskify(rimraf);
var search = TE.taskify(glob);
/**
 * @category instances
 * @since 0.6.0
 */
exports.FileSystem = {
    readFile: function (path) { return (0, function_1.pipe)(readFile(path, 'utf8'), TE.mapLeft(Logger_1.toErrorMsg)); },
    writeFile: function (path, content) { return (0, function_1.pipe)(writeFile(path, content, { encoding: 'utf8' }), TE.mapLeft(Logger_1.toErrorMsg)); },
    exists: (0, function_1.flow)(exists, TE.mapLeft(Logger_1.toErrorMsg)),
    remove: function (pattern) { return (0, function_1.pipe)(remove(pattern, {}), TE.mapLeft(Logger_1.toErrorMsg)); },
    search: function (pattern, exclude) { return (0, function_1.pipe)(search(pattern, { ignore: exclude }), TE.mapLeft(Logger_1.toErrorMsg)); }
};
