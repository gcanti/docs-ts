"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = void 0;
/**
 * @since 0.6.0
 */
var E = require("fp-ts/Either");
var function_1 = require("fp-ts/function");
var D = require("io-ts/Decoder");
var ConfigDecoder = D.partial({
    projectHomepage: D.string,
    srcDir: D.string,
    outDir: D.string,
    theme: D.string,
    enableSearch: D.boolean,
    enforceDescriptions: D.boolean,
    enforceExamples: D.boolean,
    enforceVersion: D.boolean,
    exclude: D.array(D.string),
    compilerOptions: D.UnknownRecord
});
/**
 * @since 0.6.4
 */
var decode = function (input) {
    return (0, function_1.pipe)(ConfigDecoder.decode(input), E.mapLeft(D.draw));
};
exports.decode = decode;
