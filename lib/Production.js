"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capabilities = void 0;
var FileSystem_1 = require("./FileSystem");
var Logger_1 = require("./Logger");
var Spawn_1 = require("./Spawn");
/**
 * @category production
 * @since 0.8.0
 */
exports.capabilities = {
    spawn: Spawn_1.spawn,
    fileSystem: FileSystem_1.FileSystem,
    logger: Logger_1.Logger,
    addFile: function (file) { return function (project) { return project.addSourceFileAtPath(file.path); }; }
};
