"use strict";
/**
 * @file examples type-checking
 */
Object.defineProperty(exports, "__esModule", { value: true });
// import { catOptions } from 'fp-ts/lib/Array'
var Option_1 = require("fp-ts/lib/Option");
var ts = require("typescript");
// const safeEval = require('safe-eval')
function getProgram(source, options) {
    var files = [];
    var sourceFiles = {};
    Object.keys(source).forEach(function (k) {
        files.push(k);
        sourceFiles[k] = ts.createSourceFile(k, source[k], ts.ScriptTarget.Latest);
    });
    var host = ts.createCompilerHost(options);
    var originalGetSourceFile = host.getSourceFile;
    host.getSourceFile = function (file, languageVersion) {
        if (sourceFiles.hasOwnProperty(file)) {
            return sourceFiles[file];
        }
        else {
            return originalGetSourceFile(file, languageVersion);
        }
    };
    return ts.createProgram(files, options, host);
}
exports.getProgram = getProgram;
exports.defaultOptions = {
    module: ts.ModuleKind.CommonJS,
    noImplicitReturns: false,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noFallthroughCasesInSwitch: true,
    noEmitOnError: false,
    strict: true,
    target: ts.ScriptTarget.ES5,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    forceConsistentCasingInFileNames: true,
    lib: ['lib.es2015.d.ts'],
    noEmit: true
};
// const context = { exports: {}, require: require }
function evaluate(source) {
    try {
        // safeEval(source, context)
        // tslint:disable-next-line: no-eval
        eval(source);
        return Option_1.none;
    }
    catch (e) {
        return Option_1.some(e);
    }
}
exports.evaluate = evaluate;
function transpile(source, options) {
    return ts.transpileModule(source, {
        compilerOptions: options
    }).outputText;
}
exports.transpile = transpile;
function check(sources, options) {
    var program = getProgram(sources, options);
    var emitResult = program.emit();
    var allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    var errors = allDiagnostics.map(function (diagnostic) {
        var sourceFile = diagnostic.file;
        var _a = sourceFile.getLineAndCharacterOfPosition(diagnostic.start), line = _a.line, character = _a.character;
        var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        return sourceFile.fileName + " (" + (line + 1) + "," + (character + 1) + "): " + message;
    });
    return errors;
    // if (errors.length > 0) {
    //   return errors
    // }
    // return catOptions(
    //   Object.keys(sources).map(k => {
    //     const code = transpile(sources[k], options)
    //     return evaluate(code).map(e => `${k}: ${String(e)}`)
    //   })
    // )
}
exports.check = check;
