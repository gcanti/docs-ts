"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Task_1 = require("fp-ts/lib/Task");
var TaskEither_1 = require("fp-ts/lib/TaskEither");
var parser = require("./parser");
var path = require("path");
var Array_1 = require("fp-ts/lib/Array");
var Monoid_1 = require("fp-ts/lib/Monoid");
var markdown = require("./markdown");
var Either_1 = require("fp-ts/lib/Either");
var child_process_1 = require("child_process");
var IO_1 = require("fp-ts/lib/IO");
var IOEither_1 = require("fp-ts/lib/IOEither");
var outDir = 'docs';
var srcDir = 'src';
var file = function (path, content, overwrite) { return ({ path: path, content: content, overwrite: overwrite }); };
function readFiles(M, paths) {
    return Array_1.array.traverse(TaskEither_1.taskEither)(paths, function (path) { return M.readFile(path).map(function (content) { return file(path, content, false); }); });
}
function writeFile(M, file) {
    var writeFile = M.writeFile(file.path, file.content);
    return TaskEither_1.right(M.existsFile(file.path)).chain(function (exists) {
        if (exists) {
            if (file.overwrite) {
                return TaskEither_1.right(M.log("Overwriting file " + file.path)).chain(function () { return writeFile; });
            }
            else {
                return TaskEither_1.right(M.log("File " + file.path + " already exists"));
            }
        }
        else {
            return TaskEither_1.right(M.log("Writing file " + file.path)).chain(function () { return writeFile; });
        }
    });
}
function writeFiles(M, files) {
    return Array_1.array
        .traverse(TaskEither_1.taskEither)(files, function (file) { return writeFile(M, file); })
        .map(function () { return undefined; });
}
function getPackageJSON(M) {
    return M.readFile(path.join(process.cwd(), 'package.json')).chain(function (s) {
        var json = JSON.parse(s);
        var name = json.name;
        return TaskEither_1.right(M.log("Detected project name: " + name)).map(function () { return ({
            name: name
        }); });
    });
}
function readSources(M) {
    var srcPattern = path.join(srcDir, '**/*.ts');
    return TaskEither_1.right(M.getFilenames(srcPattern)).chain(function (paths) {
        return TaskEither_1.right(M.log(paths.length + " modules found")).chain(function () { return readFiles(M, paths); });
    });
}
function parseModules(files) {
    return TaskEither_1.fromEither(Either_1.fromValidation(parser.run(files).mapFailure(function (errors) { return errors.join('\n'); })));
}
var foldExamples = Monoid_1.fold(Monoid_1.getArrayMonoid());
function getExampleFiles(modules) {
    return Array_1.array.chain(modules, function (module) {
        var prefix = module.path.join('-');
        function getDocumentableExamples(documentable) {
            return documentable.example.fold(Array_1.empty, function (content) {
                return [file(path.join(outDir, 'examples', prefix + '-' + documentable.name + '.ts'), content + '\n', true)];
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
}
function addAssertImport(code) {
    return code.indexOf('assert.') !== -1 ? "import * as assert from 'assert'\n" + code : code;
}
function handleImports(files, projectName) {
    function replaceProjectName(source) {
        var root = new RegExp("from '" + projectName + "'", 'g');
        var module = new RegExp("from '" + projectName + "/lib/", 'g');
        return source.replace(root, "from '../../src'").replace(module, "from '../../src/");
    }
    return files.map(function (f) {
        var handleProjectImports = replaceProjectName(f.content);
        var handleAssert = addAssertImport(handleProjectImports);
        return file(f.path, handleAssert, f.overwrite);
    });
}
function getExampleIndex(examples) {
    var content = examples.map(function (example) { return "import './" + path.basename(example.path) + "'"; }).join('\n') + '\n';
    return file(path.join(outDir, 'examples', 'index.ts'), content, true);
}
function typecheck(M, modules, projectName) {
    var examplePattern = path.join(outDir, 'examples');
    var clean = TaskEither_1.right(M.log("Clean up examples...")).chain(function () { return TaskEither_1.right(M.clean(examplePattern)); });
    var examples = handleImports(getExampleFiles(modules), projectName);
    if (examples.length === 0) {
        return clean.map(function () { return modules; });
    }
    var files = [getExampleIndex(examples)].concat(examples);
    var typecheckExamples = TaskEither_1.fromIOEither(new IOEither_1.IOEither(new IO_1.IO(function () {
        var status = child_process_1.spawnSync('ts-node', [path.join(outDir, 'examples', 'index.ts')], { stdio: 'inherit' }).status;
        return status === 0 ? Either_1.right(undefined) : Either_1.left('Type checking error');
    })));
    return writeFiles(M, files)
        .chain(function () { return TaskEither_1.right(M.log("Type checking examples...")).chain(function () { return typecheckExamples; }); })
        .chain(function () { return clean; })
        .map(function () { return modules; });
}
var home = file(path.join(outDir, 'index.md'), "---\ntitle: Home\nnav_order: 1\n---\n", false);
var modulesIndex = file(path.join(outDir, 'modules', 'index.md'), "---\ntitle: Modules\nhas_children: true\npermalink: /docs/modules\nnav_order: 2\n---\n", false);
function getConfigYML(projectName) {
    return file(path.join(outDir, '_config.yml'), "remote_theme: pmarsceill/just-the-docs\n\n# Enable or disable the site search\nsearch_enabled: true\n\n# Aux links for the upper right navigation\naux_links:\n  '" + projectName + " on GitHub':\n    - '//github.com/gcanti/" + projectName + "'\n", false);
}
var counter = 1;
function getMarkdownOutpuPath(module) {
    return path.join(outDir, 'modules', module.path.slice(1).join(path.sep) + '.md');
}
function getModuleMarkdownFiles(modules) {
    return modules.map(function (module) { return file(getMarkdownOutpuPath(module), markdown.printModule(module, counter++), true); });
}
function getMarkdownFiles(modules, projectName) {
    return [home, modulesIndex, getConfigYML(projectName)].concat(getModuleMarkdownFiles(modules));
}
function writeMarkdownFiles(M, files) {
    var outPattern = path.join(outDir, '**/*.ts.md');
    return TaskEither_1.right(M.log("Deleting " + outPattern))
        .chain(function () { return TaskEither_1.right(M.clean(outPattern)); })
        .chain(function () { return writeFiles(M, files); });
}
function onLeft(M, e) {
    return M.log(e);
}
function onRight() {
    return Task_1.task.of(undefined);
}
function main(M) {
    return getPackageJSON(M)
        .chain(function (pkg) {
        return readSources(M)
            .chain(parseModules)
            .chain(function (modules) { return typecheck(M, modules, pkg.name); })
            .map(function (modules) { return getMarkdownFiles(modules, pkg.name); })
            .chain(function (markdownFiles) { return writeMarkdownFiles(M, markdownFiles); });
    })
        .foldTask(function (e) { return onLeft(M, e); }, onRight);
}
exports.main = main;
