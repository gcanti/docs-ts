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
var Array_1 = require("fp-ts/lib/Array");
var function_1 = require("fp-ts/lib/function");
var IO_1 = require("fp-ts/lib/IO");
var Monoid_1 = require("fp-ts/lib/Monoid");
var Record_1 = require("fp-ts/lib/Record");
var Validation_1 = require("fp-ts/lib/Validation");
var path = require("path");
var check_1 = require("./check");
var markdown = require("./markdown");
var parser = require("./parser");
function getModulePath(module) {
    return module.path.join('/');
}
function getMarkdownOutpuPath(outDir, module) {
    return path.join(outDir, module.path.slice(1).join(path.sep) + '.md');
}
/**
 * @internal
 */
function fixExamples(examples, projectName) {
    function replaceProjectName(source) {
        var root = new RegExp("from '" + projectName + "'", 'g');
        var module = new RegExp("from '" + projectName + "/lib/", 'g');
        return source.replace(root, "from './src'").replace(module, "from './src/");
    }
    return Record_1.map(examples, function (source) {
        var prelude = source.indexOf('assert.') !== -1 ? "import * as assert from 'assert'\n" : '';
        var mangledSource = replaceProjectName(source);
        return prelude + mangledSource;
    });
}
exports.fixExamples = fixExamples;
function typecheckModules(modules, projectName, options) {
    if (!doTypeCheckExamples) {
        return Validation_1.success(modules);
    }
    var examples = getExamples(modules);
    var fixedExamples = fixExamples(examples, projectName);
    var failures = check_1.check(fixedExamples, options);
    return failures.length > 0 ? Validation_1.failure(failures) : Validation_1.success(modules);
}
var foldExamples = Monoid_1.fold(Monoid_1.getArrayMonoid());
/**
 * @internal
 */
function getExamples(modules) {
    var sources = Array_1.array.chain(modules, function (module) {
        var prefix = module.path.join('-');
        function getDocumentableExamples(documentable) {
            return documentable.example.fold(Array_1.empty, function (source) {
                var name = prefix + '-' + documentable.name + '.ts';
                return [function_1.tuple(name, source)];
            });
        }
        var methods = Array_1.array.chain(module.classes, function (c) {
            return foldExamples([
                Array_1.array.chain(c.methods, getDocumentableExamples),
                Array_1.array.chain(c.staticMethods, getDocumentableExamples)
            ]);
        });
        var interfaces = Array_1.array.chain(module.interfaces, getDocumentableExamples);
        var typeAliases = Array_1.array.chain(module.typeAliases, getDocumentableExamples);
        var constants = Array_1.array.chain(module.constants, getDocumentableExamples);
        var functions = Array_1.array.chain(module.functions, getDocumentableExamples);
        return foldExamples([methods, interfaces, typeAliases, constants, functions]);
    });
    return Record_1.fromFoldable(Array_1.array)(sources, function_1.identity);
}
exports.getExamples = getExamples;
function readFilesFromPaths(M, paths) {
    return Array_1.array.traverse(IO_1.io)(paths, function (path) { return M.readFile(path).map(function (content) { return ({ path: path, content: content }); }); });
}
var counter = 1;
var nextCounter = new IO_1.IO(function () { return counter++; });
function getFile(module) {
    return nextCounter.map(function (counter) { return ({
        path: getMarkdownOutpuPath(outDir, module),
        content: markdown.printModule(module, counter)
    }); });
}
var compilerOptionsOverrides = { noEmit: true };
var outDir = 'docs';
var doTypeCheckExamples = true;
var P = parser.monadParser;
function writeModules(M, modules) {
    return Array_1.array
        .traverse(IO_1.io)(modules, function (module) {
        return getFile(module).chain(function (file) {
            return M.log("Printing module " + getModulePath(module)).applySecond(M.writeFile(file.path, file.content));
        });
    })
        .map(function () { return undefined; });
}
function addIndex(M) {
    var indexPath = path.join(outDir, 'index.md');
    return M.exists(indexPath).chain(function (b) {
        return !b
            ? M.log("Adding index.md to " + outDir + "...").chain(function () {
                return M.writeFile(indexPath, "---\ntitle: Home\n---\n");
            })
            : IO_1.io.of(undefined);
    });
}
function addConfigYML(M, projectName) {
    var indexPath = path.join(outDir, '_config.yml');
    return M.exists(indexPath).chain(function (b) {
        return !b
            ? M.log("Adding _config.yml to " + outDir + "...").chain(function () {
                return M.writeFile(indexPath, "remote_theme: pmarsceill/just-the-docs\n\n# Enable or disable the site search\nsearch_enabled: true\n\n# Aux links for the upper right navigation\naux_links:\n  '" + projectName + " on GitHub':\n    - '//github.com/gcanti/" + projectName + "'\n");
            })
            : IO_1.io.of(undefined);
    });
}
function main(M) {
    return M.readOptions.chain(function (projectOptions) {
        return M.readProjectName.chain(function (projectName) {
            return M.readPaths.chain(function (paths) {
                var cleanPattern = path.join(outDir, '!(index.md|_config.yml)');
                return M.log("Removing files " + cleanPattern + "...")
                    .chain(function () { return M.clean(cleanPattern); })
                    .chain(function () { return addIndex(M); })
                    .chain(function () { return addConfigYML(M, projectName); })
                    .chain(function () {
                    return readFilesFromPaths(M, paths).chain(function (files) {
                        var options = __assign({}, projectOptions, compilerOptionsOverrides);
                        var eModules = P.chain(parser.run(files), function (modules) { return typecheckModules(modules, projectName, options); });
                        var eWrite = eModules.map(function (modules) { return writeModules(M, modules); });
                        return eWrite.getOrElseL(function (errors) { return M.log("Errors: " + errors.join('\n')); });
                    });
                });
            });
        });
    });
}
exports.main = main;
