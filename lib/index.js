"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var parser = require("./parser");
var Console_1 = require("fp-ts/lib/Console");
var IO_1 = require("fp-ts/lib/IO");
var markdown = require("./markdown");
var path = require("path");
var fs = require("fs-extra");
var Tree_1 = require("fp-ts/lib/Tree");
var Validation_1 = require("fp-ts/lib/Validation");
var Array_1 = require("fp-ts/lib/Array");
var Ord_1 = require("fp-ts/lib/Ord");
var Record_1 = require("fp-ts/lib/Record");
var function_1 = require("fp-ts/lib/function");
var Foldable2v_1 = require("fp-ts/lib/Foldable2v");
var check_1 = require("./check");
function writeFileSync(path, content) {
    try {
        return Validation_1.success(Console_1.log("Printing module " + path).applySecond(new IO_1.IO(function () { return fs.outputFileSync(path, content); })));
    }
    catch (e) {
        return Validation_1.failure(["Cannot open file " + path + ": " + e]);
    }
}
function getOutpuPath(outDir, node) {
    return parser.fold(node, function (p) { return path.join(outDir, p.slice(1).join(path.sep) + path.sep + 'index.md'); }, function (p) { return path.join(outDir, p.slice(1).join(path.sep) + '.md'); });
}
function getExamples(nodes) {
    var toArray = function (prefix, x) {
        return x.example.foldL(function () { return Array_1.empty; }, function (source) { return [function_1.tuple(prefix + '-' + x.name + '.ts', "import * as assert from 'assert'\n" + source)]; });
    };
    var sources = Array_1.array.chain(nodes, function (node) {
        switch (node.type) {
            case 'Index':
                return Array_1.empty;
            case 'Module':
                return Array_1.array.chain(node.functions, function (f) { return toArray(node.path.join('-'), f); });
        }
    });
    return Record_1.fromFoldable(Array_1.array)(sources, function_1.identity);
}
function checkExamples(nodes) {
    var examples = getExamples(nodes);
    var failures = check_1.checkSources(examples);
    if (failures.length > 0) {
        return Validation_1.failure(failures.map(function (f) { return f.message; }));
    }
    else {
        return Validation_1.success(undefined);
    }
}
/**
 * @since 0.0.1
 */
function main(pattern, outDir) {
    var counter = 1;
    function writeNode(node) {
        switch (node.type) {
            case 'Index':
                return Validation_1.success(Console_1.log("Detected directory " + node.path.join('/')));
            case 'Module':
                var header = markdown.header(node.path.slice(1).join('/'), counter++);
                return writeFileSync(getOutpuPath(outDir, node), header + markdown.run(node));
        }
    }
    return parser.monadValidation
        .chain(parser.run(pattern), function (forest) {
        var nodes = Array_1.array.chain(forest, function (t) { return Foldable2v_1.toArray(Tree_1.tree)(t); });
        return parser.monadValidation.chain(checkExamples(nodes), function () {
            var sorted = Array_1.sort(Ord_1.contramap(function (node) { return node.path.join('/').toLowerCase(); }, Ord_1.ordString))(nodes);
            return Array_1.array.traverse(parser.monadValidation)(sorted, writeNode);
        });
    })
        .map(function (a) {
        return Array_1.array
            .sequence(IO_1.io)(a)
            .map(function () { return undefined; });
    })
        .fold(function (errors) { return Console_1.log("Errors: " + errors.join('\n')).applySecond(new IO_1.IO(function () { return process.exit(1); })); }, function (a) { return a.map(function () { return undefined; }); });
}
exports.main = main;
