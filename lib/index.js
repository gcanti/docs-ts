"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
/**
 * @since 0.2.0
 */
var chalk_1 = require("chalk");
var Console = require("fp-ts/Console");
var IO = require("fp-ts/IO");
var T = require("fp-ts/Task");
var TE = require("fp-ts/TaskEither");
var Core = require("./Core");
var Production_1 = require("./Production");
var exit = function (code) {
    return function () {
        return process.exit(code);
    };
};
var handleResult = TE.matchE(function (e) { return T.fromIO(IO.flatMap(Console.log(chalk_1.default.bold.red(e)), function () { return exit(1); })); }, function () { return T.fromIO(IO.flatMap(Console.log(chalk_1.default.bold.green('Docs generation succeeded!')), function () { return exit(0); })); });
/**
 * @category main
 * @since 0.6.0
 */
exports.main = handleResult(Core.main(Production_1.capabilities));
