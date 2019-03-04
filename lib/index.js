"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core = require("./core");
var Task_1 = require("fp-ts/lib/Task");
var IO_1 = require("fp-ts/lib/IO");
var glob = require("glob");
var fs = require("fs-extra");
var TaskEither_1 = require("fp-ts/lib/TaskEither");
var rimraf = require("rimraf");
var Console_1 = require("fp-ts/lib/Console");
var monadApp = {
    getFilenames: function (pattern) { return Task_1.fromIO(new IO_1.IO(function () { return glob.sync(pattern); })); },
    readFile: function (path) { return TaskEither_1.fromIO(new IO_1.IO(function () { return fs.readFileSync(path, { encoding: 'utf8' }); })); },
    writeFile: function (path, content) { return TaskEither_1.fromIO(new IO_1.IO(function () { return fs.outputFileSync(path, content); })); },
    existsFile: function (path) { return Task_1.fromIO(new IO_1.IO(function () { return fs.existsSync(path); })); },
    clean: function (pattern) { return Task_1.fromIO(new IO_1.IO(function () { return rimraf.sync(pattern); })); },
    log: function (message) { return Task_1.fromIO(Console_1.log(message)); },
    exit: function (code) { return Task_1.fromIO(new IO_1.IO(function () { return process.exit(code); })); }
};
exports.main = core.main(monadApp);
