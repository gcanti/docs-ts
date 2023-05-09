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
exports.main = void 0;
/**
 * @since 0.6.0
 */
var E = require("fp-ts/Either");
var function_1 = require("fp-ts/function");
var Json = require("fp-ts/Json");
var M = require("fp-ts/Monoid");
var RTE = require("fp-ts/ReaderTaskEither");
var RA = require("fp-ts/ReadonlyArray");
var S = require("fp-ts/string");
var TE = require("fp-ts/TaskEither");
var D = require("io-ts/Decoder");
var path = require("path");
var Config = require("./Config");
var FileSystem_1 = require("./FileSystem");
var Markdown_1 = require("./Markdown");
var P = require("./Parser");
var CONFIG_FILE_NAME = 'docs-ts.json';
var PackageJSONDecoder = (0, function_1.pipe)(D.struct({
    name: D.string,
    homepage: D.string
}));
// -------------------------------------------------------------------------------------
// files
// -------------------------------------------------------------------------------------
var readFile = function (path) {
    return (0, function_1.pipe)(RTE.ask(), RTE.chainTaskEitherK(function (_a) {
        var fileSystem = _a.fileSystem;
        return fileSystem.readFile(path);
    }), RTE.map(function (content) { return (0, FileSystem_1.File)(path, content, false); }));
};
var readFiles = RA.traverse(RTE.ApplicativePar)(readFile);
var writeFile = function (file) {
    var overwrite = (0, function_1.pipe)(RTE.ask(), RTE.chainTaskEitherK(function (_a) {
        var fileSystem = _a.fileSystem, logger = _a.logger;
        return (0, function_1.pipe)(logger.debug("Overwriting file ".concat(file.path)), TE.flatMap(function () { return fileSystem.writeFile(file.path, file.content); }));
    }));
    var skip = (0, function_1.pipe)(RTE.ask(), RTE.chainTaskEitherK(function (_a) {
        var logger = _a.logger;
        return logger.debug("File ".concat(file.path, " already exists, skipping creation"));
    }));
    var write = (0, function_1.pipe)(RTE.ask(), RTE.chainTaskEitherK(function (_a) {
        var fileSystem = _a.fileSystem;
        return fileSystem.writeFile(file.path, file.content);
    }));
    return (0, function_1.pipe)(RTE.ask(), RTE.flatMap(function (_a) {
        var fileSystem = _a.fileSystem;
        return RTE.fromTaskEither(fileSystem.exists(file.path));
    }), RTE.flatMap(function (exists) { return (exists ? (file.overwrite ? overwrite : skip) : write); }));
};
var writeFiles = (0, function_1.flow)(RA.traverse(RTE.ApplicativePar)(writeFile), RTE.map(function_1.constVoid));
var readPackageJSON = (0, function_1.pipe)(RTE.ask(), RTE.chainTaskEitherK(function (_a) {
    var fileSystem = _a.fileSystem, logger = _a.logger;
    return (0, function_1.pipe)(fileSystem.readFile(path.join(process.cwd(), 'package.json')), TE.mapLeft(function () { return "Unable to read package.json in \"".concat(process.cwd(), "\""); }), TE.chainEitherK(function (packageJsonSource) {
        return (0, function_1.pipe)(packageJsonSource, Json.parse, E.mapLeft(function (u) { return E.toError(u).message; }));
    }), TE.flatMap(function (json) {
        return (0, function_1.pipe)(PackageJSONDecoder.decode(json), TE.fromEither, TE.mapLeft(function (decodeError) { return "Unable to decode package.json:\n".concat(D.draw(decodeError)); }));
    }), TE.flatMap(function (_a) {
        var name = _a.name, homepage = _a.homepage;
        return (0, function_1.pipe)(logger.debug("Project name detected: ".concat(name)), TE.map(function () { return ({ name: name, homepage: homepage }); }));
    }));
}));
var readSourcePaths = (0, function_1.pipe)(RTE.ask(), RTE.chainTaskEitherK(function (_a) {
    var fileSystem = _a.fileSystem, logger = _a.logger, settings = _a.settings;
    return (0, function_1.pipe)(fileSystem.search(path.join(settings.srcDir, '**', '*.ts'), settings.exclude), TE.map(RA.map(path.normalize)), TE.tap(function (paths) { return (0, function_1.pipe)(logger.info("Found ".concat(paths.length, " modules"))); }));
}));
var readSourceFiles = (0, function_1.pipe)(RTE.ask(), RTE.flatMap(function (C) {
    return (0, function_1.pipe)(readSourcePaths, RTE.chainTaskEitherK(function (paths) { return (0, function_1.pipe)(C, readFiles(paths)); }));
}));
// -------------------------------------------------------------------------------------
// parsers
// -------------------------------------------------------------------------------------
var parseFiles = function (files) {
    return (0, function_1.pipe)(RTE.ask(), RTE.tap(function (_a) {
        var logger = _a.logger;
        return RTE.fromTaskEither(logger.debug('Parsing files...'));
    }), RTE.flatMap(function () { return P.parseFiles(files); }));
};
// -------------------------------------------------------------------------------------
// examples
// -------------------------------------------------------------------------------------
var foldFiles = M.concatAll(RA.getMonoid());
var getExampleFiles = function (modules) {
    return (0, function_1.pipe)(RTE.ask(), RTE.map(function (env) {
        return (0, function_1.pipe)(modules, RA.flatMap(function (module) {
            var prefix = module.path.join('-');
            var getDocumentableExamples = function (id) {
                return function (documentable) {
                    return (0, function_1.pipe)(documentable.examples, RA.mapWithIndex(function (i, content) {
                        return (0, FileSystem_1.File)(path.join(env.settings.outDir, 'examples', "".concat(prefix, "-").concat(id, "-").concat(documentable.name, "-").concat(i, ".ts")), "".concat(content, "\n"), true);
                    }));
                };
            };
            var moduleExamples = getDocumentableExamples('module')(module);
            var methods = (0, function_1.pipe)(module.classes, RA.flatMap(function (c) {
                return foldFiles([
                    (0, function_1.pipe)(c.methods, RA.flatMap(getDocumentableExamples("".concat(c.name, "-method")))),
                    (0, function_1.pipe)(c.staticMethods, RA.flatMap(getDocumentableExamples("".concat(c.name, "-staticmethod"))))
                ]);
            }));
            var interfaces = (0, function_1.pipe)(module.interfaces, RA.flatMap(getDocumentableExamples('interface')));
            var typeAliases = (0, function_1.pipe)(module.typeAliases, RA.flatMap(getDocumentableExamples('typealias')));
            var constants = (0, function_1.pipe)(module.constants, RA.flatMap(getDocumentableExamples('constant')));
            var functions = (0, function_1.pipe)(module.functions, RA.flatMap(getDocumentableExamples('function')));
            return foldFiles([moduleExamples, methods, interfaces, typeAliases, constants, functions]);
        }));
    }));
};
var addAssertImport = function (code) {
    return code.indexOf('assert.') !== -1 ? "import * as assert from 'assert'\n".concat(code) : code;
};
var replaceProjectName = function (source) {
    return (0, function_1.pipe)(RTE.ask(), RTE.map(function (_a) {
        var settings = _a.settings;
        var importRegex = function (projectName) {
            return new RegExp("from (?<quote>['\"])".concat(projectName, "(?:/lib)?(?:/(?<path>.*))?\\k<quote>"), 'g');
        };
        return source.replace(importRegex(settings.projectName), function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var groups = args[args.length - 1];
            return "from '../../src".concat(groups.path ? "/".concat(groups.path) : '', "'");
        });
    }));
};
var handleImports = RA.traverse(RTE.ApplicativePar)(function (file) {
    return (0, function_1.pipe)(replaceProjectName(file.content), RTE.map(addAssertImport), RTE.map(function (content) { return (0, FileSystem_1.File)(file.path, content, file.overwrite); }));
});
var getExampleIndex = function (examples) {
    var content = (0, function_1.pipe)(examples, RA.foldMap(S.Monoid)(function (example) { return "import './".concat(path.basename(example.path, '.ts'), "'\n"); }));
    return (0, function_1.pipe)(RTE.ask(), RTE.map(function (env) { return (0, FileSystem_1.File)(path.join(env.settings.outDir, 'examples', 'index.ts'), "".concat(content, "\n"), true); }));
};
var cleanExamples = (0, function_1.pipe)(RTE.ask(), RTE.chainTaskEitherK(function (_a) {
    var fileSystem = _a.fileSystem, settings = _a.settings;
    return fileSystem.remove(path.join(settings.outDir, 'examples'));
}));
var spawnTsNode = (0, function_1.pipe)(RTE.ask(), RTE.tap(function (_a) {
    var logger = _a.logger;
    return RTE.fromTaskEither(logger.debug('Type checking examples...'));
}), RTE.chainTaskEitherK(function (_a) {
    var spawn = _a.spawn, settings = _a.settings;
    var command = process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node';
    var executable = path.join(process.cwd(), settings.outDir, 'examples', 'index.ts');
    return spawn(command, executable);
}));
var writeExamples = function (examples) {
    return (0, function_1.pipe)(RTE.ask(), RTE.tap(function (_a) {
        var logger = _a.logger;
        return RTE.fromTaskEither(logger.debug('Writing examples...'));
    }), RTE.flatMap(function (C) {
        return (0, function_1.pipe)(getExampleIndex(examples), RTE.map(function (index) { return (0, function_1.pipe)(examples, RA.prepend(index)); }), RTE.chainTaskEitherK(function (files) { return (0, function_1.pipe)(C, writeFiles(files)); }));
    }));
};
var typeCheckExamples = function (modules) {
    return (0, function_1.pipe)(getExampleFiles(modules), RTE.flatMap(handleImports), RTE.flatMap(function (examples) {
        return examples.length === 0
            ? cleanExamples
            : (0, function_1.pipe)(writeExamples(examples), RTE.flatMap(function () { return spawnTsNode; }), RTE.flatMap(function () { return cleanExamples; }));
    }));
};
// -------------------------------------------------------------------------------------
// markdown
// -------------------------------------------------------------------------------------
var getHome = (0, function_1.pipe)(RTE.ask(), RTE.map(function (_a) {
    var settings = _a.settings;
    return (0, FileSystem_1.File)(path.join(process.cwd(), settings.outDir, 'index.md'), "---\ntitle: Home\nnav_order: 1\n---\n", false);
}));
var getModulesIndex = (0, function_1.pipe)(RTE.ask(), RTE.map(function (_a) {
    var settings = _a.settings;
    return (0, FileSystem_1.File)(path.join(process.cwd(), settings.outDir, 'modules', 'index.md'), "---\ntitle: Modules\nhas_children: true\npermalink: /docs/modules\nnav_order: 2\n---", false);
}));
var replace = function (searchValue, replaceValue) {
    return function (s) {
        return s.replace(searchValue, replaceValue);
    };
};
var resolveConfigYML = function (previousContent, settings) {
    return (0, function_1.pipe)(previousContent, replace(/^remote_theme:.*$/m, "remote_theme: ".concat(settings.theme)), replace(/^search_enabled:.*$/m, "search_enabled: ".concat(settings.enableSearch)), replace(/^ {2}'\S* on GitHub':\n {4}- '.*'/m, "  '".concat(settings.projectName, " on GitHub':\n    - '").concat(settings.projectHomepage, "'")));
};
var getHomepageNavigationHeader = function (settings) {
    var isGitHub = settings.projectHomepage.toLowerCase().includes('github');
    return isGitHub ? settings.projectName + ' on GitHub' : 'Homepage';
};
var getConfigYML = (0, function_1.pipe)(RTE.ask(), RTE.chainTaskEitherK(function (_a) {
    var fileSystem = _a.fileSystem, settings = _a.settings;
    var filePath = path.join(process.cwd(), settings.outDir, '_config.yml');
    return (0, function_1.pipe)(fileSystem.exists(filePath), TE.flatMap(function (exists) {
        return exists
            ? (0, function_1.pipe)(fileSystem.readFile(filePath), TE.map(function (content) { return (0, FileSystem_1.File)(filePath, resolveConfigYML(content, settings), true); }))
            : TE.of((0, FileSystem_1.File)(filePath, "remote_theme: ".concat(settings.theme, "\n\n# Enable or disable the site search\nsearch_enabled: ").concat(settings.enableSearch, "\n\n# Aux links for the upper right navigation\naux_links:\n  '").concat(getHomepageNavigationHeader(settings), "':\n    - '").concat(settings.projectHomepage, "'"), false));
    }));
}));
var getMarkdownOutputPath = function (module) {
    return (0, function_1.pipe)(RTE.ask(), RTE.map(function (_a) {
        var settings = _a.settings;
        return path.join(settings.outDir, 'modules', "".concat(module.path.slice(1).join(path.sep), ".md"));
    }));
};
var getModuleMarkdownFiles = function (modules) {
    return (0, function_1.pipe)(modules, RTE.traverseArrayWithIndex(function (order, module) {
        return (0, function_1.pipe)(getMarkdownOutputPath(module), RTE.bindTo('outputPath'), RTE.bind('content', function () { return RTE.right((0, Markdown_1.printModule)(module, order + 1)); }), RTE.map(function (_a) {
            var content = _a.content, outputPath = _a.outputPath;
            return (0, FileSystem_1.File)(outputPath, content, true);
        }));
    }));
};
var getMarkdownFiles = function (modules) {
    return (0, function_1.pipe)(RTE.sequenceArray([getHome, getModulesIndex, getConfigYML]), RTE.flatMap(function (meta) {
        return (0, function_1.pipe)(getModuleMarkdownFiles(modules), RTE.map(function (files) { return RA.getMonoid().concat(meta, files); }));
    }));
};
var writeMarkdownFiles = function (files) {
    return (0, function_1.pipe)(RTE.ask(), RTE.chainFirst(function (_a) {
        var fileSystem = _a.fileSystem, logger = _a.logger, settings = _a.settings;
        var outPattern = path.join(settings.outDir, '**/*.ts.md');
        return (0, function_1.pipe)(logger.debug("Cleaning up docs folder: deleting ".concat(outPattern)), TE.flatMap(function () { return fileSystem.remove(outPattern); }), RTE.fromTaskEither);
    }), RTE.chainTaskEitherK(function (C) {
        return (0, function_1.pipe)(C.logger.debug('Writing markdown files...'), TE.flatMap(function () { return (0, function_1.pipe)(C, writeFiles(files)); }));
    }));
};
// -------------------------------------------------------------------------------------
// config
// -------------------------------------------------------------------------------------
var getDefaultSettings = function (projectName, projectHomepage) {
    return {
        projectName: projectName,
        projectHomepage: projectHomepage,
        srcDir: 'src',
        outDir: 'docs',
        theme: 'pmarsceill/just-the-docs',
        enableSearch: true,
        enforceDescriptions: false,
        enforceExamples: false,
        enforceVersion: true,
        exclude: [],
        compilerOptions: {}
    };
};
var hasConfiguration = (0, function_1.pipe)(RTE.ask(), RTE.chainTaskEitherK(function (_a) {
    var fileSystem = _a.fileSystem, logger = _a.logger;
    return (0, function_1.pipe)(logger.debug('Checking for configuration file...'), TE.flatMap(function () { return fileSystem.exists(path.join(process.cwd(), CONFIG_FILE_NAME)); }));
}));
var readConfiguration = (0, function_1.pipe)(RTE.ask(), RTE.flatMap(function () { return readFile(path.join(process.cwd(), CONFIG_FILE_NAME)); }));
var parseConfiguration = function (defaultSettings) {
    return function (file) {
        return (0, function_1.pipe)(RTE.ask(), RTE.chainTaskEitherK(function (_a) {
            var logger = _a.logger;
            return (0, function_1.pipe)((0, function_1.pipe)(Json.parse(file.content), E.mapLeft(toErrorMsg)), TE.fromEither, TE.tap(function () { return logger.info("Found configuration file"); }), TE.tap(function () { return logger.debug("Parsing configuration file found at: ".concat(file.path)); }), TE.flatMap(function (json) { return TE.fromEither(Config.decode(json)); }), TE.bimap(function (decodeError) { return "Invalid configuration file detected:\n".concat(decodeError); }, function (config) { return (__assign(__assign({}, defaultSettings), config)); }));
        }));
    };
};
var useDefaultSettings = function (defaultSettings) {
    return (0, function_1.pipe)(RTE.ask(), RTE.chainTaskEitherK(function (_a) {
        var logger = _a.logger;
        return (0, function_1.pipe)(logger.info('No configuration file detected, using default settings'), TE.map(function () { return defaultSettings; }));
    }));
};
var getDocsConfiguration = function (projectName, projectHomepage) {
    return (0, function_1.pipe)(hasConfiguration, RTE.bindTo('hasConfig'), RTE.bind('defaultSettings', function () { return RTE.right(getDefaultSettings(projectName, projectHomepage)); }), RTE.flatMap(function (_a) {
        var defaultSettings = _a.defaultSettings, hasConfig = _a.hasConfig;
        return hasConfig
            ? (0, function_1.pipe)(readConfiguration, RTE.flatMap(parseConfiguration(defaultSettings)))
            : useDefaultSettings(defaultSettings);
    }));
};
// -------------------------------------------------------------------------------------
// program
// -------------------------------------------------------------------------------------
/**
 * @category program
 * @since 0.6.0
 */
exports.main = (0, function_1.pipe)(RTE.ask(), RTE.flatMap(function (capabilities) {
    return (0, function_1.pipe)(readPackageJSON, RTE.flatMap(function (pkg) {
        return (0, function_1.pipe)(getDocsConfiguration(pkg.name, pkg.homepage), RTE.chainTaskEitherK(function (settings) {
            var program = (0, function_1.pipe)(readSourceFiles, RTE.flatMap(parseFiles), RTE.tap(typeCheckExamples), RTE.flatMap(getMarkdownFiles), RTE.flatMap(writeMarkdownFiles));
            return program(__assign(__assign({}, capabilities), { settings: settings }));
        }));
    }));
}));
// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------
var toErrorMsg = (0, function_1.flow)(E.toError, function (err) { return String(err.message); });
