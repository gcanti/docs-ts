"use strict";
/**
 * @file production instance
 */
Object.defineProperty(exports, "__esModule", { value: true });
var IO_1 = require("fp-ts/lib/IO");
var fs = require("fs-extra");
var glob = require("glob");
var path = require("path");
var ts = require("typescript");
var core = require("./core");
var rimraf = require("rimraf");
var Console = require("fp-ts/lib/Console");
var srcDir = 'src/**/*.ts';
/**
 * App instance
 */
var app = {
    readOptions: new IO_1.IO(function () {
        var config = ts.readConfigFile('tsconfig.json', ts.sys.readFile).config;
        var options = ts.parseJsonConfigFileContent(config, ts.sys, process.cwd()).options;
        return options;
    }),
    readProjectName: new IO_1.IO(function () { return require(path.join(process.cwd(), 'package.json')).name; }),
    readPaths: new IO_1.IO(function () { return glob.sync(srcDir); }),
    readFile: function (path) { return new IO_1.IO(function () { return fs.readFileSync(path, { encoding: 'utf8' }); }); },
    writeFile: function (path, content) { return new IO_1.IO(function () { return fs.outputFileSync(path, content); }); },
    exists: function (path) { return new IO_1.IO(function () { return fs.existsSync(path); }); },
    clean: function (pattern) { return new IO_1.IO(function () { return rimraf.sync(pattern); }); },
    log: Console.log
};
exports.main = core.main(app);
