"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var core = require("./core");
var Task_1 = require("fp-ts/lib/Task");
var IO_1 = require("fp-ts/lib/IO");
var glob = require("glob");
var fs = require("fs-extra");
var TaskEither_1 = require("fp-ts/lib/TaskEither");
var rimraf = require("rimraf");
var Console_1 = require("fp-ts/lib/Console");
var monadApp = __assign({}, TaskEither_1.taskEither, { getFilenames: function (pattern) { return Task_1.fromIO(new IO_1.IO(function () { return glob.sync(pattern); })); }, readFile: function (path) { return TaskEither_1.fromIO(new IO_1.IO(function () { return fs.readFileSync(path, { encoding: 'utf8' }); })); }, writeFile: function (path, content) { return TaskEither_1.fromIO(new IO_1.IO(function () { return fs.outputFileSync(path, content); })); }, existsFile: function (path) { return Task_1.fromIO(new IO_1.IO(function () { return fs.existsSync(path); })); }, clean: function (pattern) { return Task_1.fromIO(new IO_1.IO(function () { return rimraf.sync(pattern); })); }, log: function (message) { return TaskEither_1.fromIO(Console_1.log(message)); } });
var exit = function (code) { return new IO_1.IO(function () { return process.exit(code); }); };
function onLeft(e) {
    return Task_1.fromIO(Console_1.log(e).chain(function () { return exit(1); }));
}
function onRight() {
    return Task_1.task.of(undefined);
}
exports.main = core.main(monadApp).foldTask(onLeft, onRight);
