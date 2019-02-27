"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function getProgram(source, options) {
    var host = ts.createCompilerHost(options);
    var originalGetSourceFile = host.getSourceFile;
    var files = [];
    var sourceFiles = {};
    Object.keys(source).forEach(function (k) {
        files.push(k);
        sourceFiles[k] = ts.createSourceFile(k, source[k], ts.ScriptTarget.Latest);
    });
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
function checkSources(sources, options) {
    if (options === void 0) { options = exports.defaultOptions; }
    var program = getProgram(sources, options);
    var allDiagnostics = ts.getPreEmitDiagnostics(program);
    var failures = [];
    allDiagnostics.forEach(function (diagnostic) {
        var sourceFile = diagnostic.file;
        var _a = sourceFile.getLineAndCharacterOfPosition(diagnostic.start), line = _a.line, character = _a.character;
        var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        failures.push({
            source: sourceFile.getFullText(),
            message: sourceFile.fileName + " (" + (line + 1) + "," + (character + 1) + "): " + message
        });
    });
    return failures;
}
exports.checkSources = checkSources;
