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
var doctrine = require("doctrine");
var Apply_1 = require("fp-ts/lib/Apply");
var Array_1 = require("fp-ts/lib/Array");
var Monoid_1 = require("fp-ts/lib/Monoid");
var Option_1 = require("fp-ts/lib/Option");
var Ord_1 = require("fp-ts/lib/Ord");
var Record_1 = require("fp-ts/lib/Record");
var Traversable2v_1 = require("fp-ts/lib/Traversable2v");
var Tree_1 = require("fp-ts/lib/Tree");
var Validation_1 = require("fp-ts/lib/Validation");
var fs = require("fs");
var glob = require("glob");
var ts_simple_ast_1 = require("ts-simple-ast"), ast = ts_simple_ast_1;
var path = require("path");
function fromPaths(paths) {
    var dir = {};
    var current = dir;
    for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {
        var path_1 = paths_1[_i];
        var names = path_1.split('/');
        for (var _a = 0, names_1 = names; _a < names_1.length; _a++) {
            var name = names_1[_a];
            if (current.hasOwnProperty(name)) {
                current = current[name];
            }
            else {
                current = current[name] = {};
            }
        }
        current = dir;
    }
    return dir;
}
exports.fromPaths = fromPaths;
function directory(path, children) {
    return { type: 'Directory', path: path, children: children };
}
exports.directory = directory;
function file(path) {
    return { type: 'File', path: path };
}
exports.file = file;
function fromDir(dir) {
    function toForest(path, dir) {
        return Object.keys(dir)
            .sort(Ord_1.ordString.compare)
            .map(function (name) { return toTree(path, name, dir[name]); });
    }
    function toTree(parent, name, dir) {
        var path = parent.concat([name]);
        return Record_1.isEmpty(dir) ? new Tree_1.Tree(file(path), []) : new Tree_1.Tree(directory(path, Object.keys(dir)), toForest(path, dir));
    }
    return toForest([], dir);
}
exports.fromDir = fromDir;
function fromPattern(pattern) {
    return fromDir(fromPaths(glob.sync(pattern)));
}
function readFileSync(path) {
    try {
        return Validation_1.success(fs.readFileSync(path, { encoding: 'utf8' }));
    }
    catch (e) {
        return Validation_1.failure(["Cannot open file " + path + ": " + e]);
    }
}
function documentable(name, description, since, deprecated, example) {
    return { name: name, description: description, since: since, deprecated: deprecated, example: example };
}
exports.documentable = documentable;
function interface_(documentable, signature) {
    return __assign({}, documentable, { signature: signature });
}
exports.interface_ = interface_;
function func(documentable, signatures) {
    return __assign({}, documentable, { signatures: signatures });
}
exports.func = func;
function method(documentable, signatures) {
    return __assign({}, documentable, { signatures: signatures });
}
exports.method = method;
function class_(documentable, signature, methods, staticMethods) {
    return __assign({}, documentable, { signature: signature, methods: methods, staticMethods: staticMethods });
}
exports.class_ = class_;
function typeAlias(documentable, signature) {
    return __assign({}, documentable, { signature: signature });
}
exports.typeAlias = typeAlias;
function constant(documentable, signature) {
    return __assign({}, documentable, { signature: signature });
}
exports.constant = constant;
function index(path, children) {
    return { type: 'Index', path: path, children: children };
}
exports.index = index;
function module(path, description, interfaces, typeAliases, functions, classes, constants) {
    return { type: 'Module', path: path, description: description, interfaces: interfaces, typeAliases: typeAliases, functions: functions, classes: classes, constants: constants };
}
exports.module = module;
function fold(fa, onIndex, onModule) {
    switch (fa.type) {
        case 'Index':
            return onIndex(fa.path, fa.children);
        case 'Module':
            return onModule(fa.path, fa.description, fa.interfaces, fa.typeAliases, fa.functions, fa.classes, fa.constants);
    }
}
exports.fold = fold;
var monoidFailure = Monoid_1.getArrayMonoid();
exports.monadParser = Validation_1.getMonad(monoidFailure);
function fromForest(forest) {
    var traverse = Traversable2v_1.getTraversableComposition(Array_1.array, Tree_1.tree).traverse(exports.monadParser);
    return traverse(forest, function (file) {
        return file.type === 'Directory'
            ? Validation_1.success(index(file.path, file.children))
            : exports.monadParser.chain(readFileSync(file.path.join('/')), function (source) { return parse(file, source); });
    });
}
exports.fromForest = fromForest;
function run(pattern) {
    return fromForest(fromPattern(pattern));
}
exports.run = run;
function getSourceFile(name, source) {
    return new ts_simple_ast_1.default().createSourceFile(name + ".ts", source);
}
exports.getSourceFile = getSourceFile;
function getModuleName(p) {
    return path.parse(p[p.length - 1]).name;
}
exports.getModuleName = getModuleName;
function getAnnotation(jsdocs) {
    var content = jsdocs.map(function (doc) { return doc.getText(); }).join('\n');
    return doctrine.parse(content, { unwrap: true });
}
function getDescription(annotation) {
    return Option_1.fromNullable(annotation.description).filter(function (s) { return s !== ''; });
}
function getFile(annotation) {
    return Option_1.fromNullable(annotation.tags.filter(function (tag) { return tag.title === 'file'; })[0]).mapNullable(function (tag) { return tag.description; });
}
function getSince(annotation) {
    return Option_1.fromNullable(annotation.tags.filter(function (tag) { return tag.title === 'since'; })[0]).mapNullable(function (tag) { return tag.description; });
}
function isDeprecated(annotation) {
    return Option_1.fromNullable(annotation.tags.filter(function (tag) { return tag.title === 'deprecated'; })[0]).isSome();
}
function isInternal(annotation) {
    return Option_1.fromNullable(annotation.tags.filter(function (tag) { return tag.title === 'internal'; })[0]).isSome();
}
function getExample(annotation) {
    return Option_1.fromNullable(annotation.tags.filter(function (tag) { return tag.title === 'example'; })[0]).mapNullable(function (tag) { return tag.description; });
}
function getAnnotationInfo(annotation) {
    return {
        description: getDescription(annotation),
        since: getSince(annotation),
        deprecated: isDeprecated(annotation),
        example: getExample(annotation)
    };
}
function parseInterfaceDeclaration(id) {
    var annotation = getAnnotation(id.getJsDocs());
    var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, example = _a.example;
    var signature = id.getText();
    return Validation_1.success(interface_(documentable(id.getName(), description, since, deprecated, example), signature));
}
function getInterfaces(sourceFile) {
    var exportedInterfaceDeclarations = sourceFile.getInterfaces().filter(function (id) { return id.isExported(); });
    return Array_1.array
        .traverse(exports.monadParser)(exportedInterfaceDeclarations, parseInterfaceDeclaration)
        .map(function (interfaces) { return interfaces.sort(byName.compare); });
}
exports.getInterfaces = getInterfaces;
function getFunctionDeclarationSignature(f) {
    var text = f.getText();
    var end = text.indexOf('{');
    return text.substring(0, end === -1 ? text.length : end).trim() + " { ... }";
}
var indexOf = function (big, small) {
    var i = big.indexOf(small);
    return i !== -1 ? Option_1.some(i) : Option_1.none;
};
var lastIndexOf = function (big, small) {
    var i = big.lastIndexOf(small);
    return i !== -1 ? Option_1.some(i) : Option_1.none;
};
function getFunctionVariableDeclarationSignature(vd) {
    var text = vd.getText();
    var end = indexOf(text, ' => {').orElse(function () { return lastIndexOf(text, ' =>'); });
    return "export const " + text.substring(0, end.getOrElse(text.length)) + " => ...";
}
function getFunctionDeclarationAnnotation(fd) {
    var overloads = fd.getOverloads();
    return overloads.length === 0 ? getAnnotation(fd.getJsDocs()) : getAnnotation(overloads[0].getJsDocs());
}
function parseFunctionDeclaration(moduleName, fd) {
    var annotation = getFunctionDeclarationAnnotation(fd);
    var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, example = _a.example;
    var overloads = fd.getOverloads();
    var signature = getFunctionDeclarationSignature(fd);
    var signatures = overloads.length === 0 ? [signature] : overloads.map(function (fd) { return fd.getText(); }).concat([signature]);
    var name = fd.getName();
    if (name === undefined || name.trim() === '') {
        return Validation_1.failure(["Missing function name in module " + moduleName]);
    }
    else {
        return Validation_1.success(func(documentable(name, description, since, deprecated, example), signatures));
    }
}
function parseFunctionVariableDeclaration(vd) {
    var vs = vd.getParent().getParent();
    var annotation = getAnnotation(vs.getJsDocs());
    var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, example = _a.example;
    var signatures = [getFunctionVariableDeclarationSignature(vd)];
    var name = vd.getName();
    return Validation_1.success(func(documentable(name, description, since, deprecated, example), signatures));
}
var byName = Ord_1.contramap(function (x) { return x.name; }, Ord_1.ordString);
function getFunctions(moduleName, sourceFile) {
    var exportedFunctionDeclarations = sourceFile
        .getFunctions()
        .filter(function (fd) { return fd.isExported() && !isInternal(getFunctionDeclarationAnnotation(fd)); });
    var functionDeclarations = Array_1.array.traverse(exports.monadParser)(exportedFunctionDeclarations, function (fd) {
        return parseFunctionDeclaration(moduleName, fd);
    });
    var exportedVariableDeclarations = sourceFile.getVariableDeclarations().filter(function (vd) {
        var vs = vd.getParent().getParent();
        var annotation = getAnnotation(vs.getJsDocs());
        var initializer = vd.getInitializer();
        return (!isInternal(annotation) &&
            initializer !== undefined &&
            vs.isExported() &&
            ast.TypeGuards.isFunctionLikeDeclaration(initializer));
    });
    var variableDeclarations = Array_1.array.traverse(exports.monadParser)(exportedVariableDeclarations, parseFunctionVariableDeclaration);
    var monoidFunc = Validation_1.getMonoid(monoidFailure, Monoid_1.getArrayMonoid());
    return monoidFunc.concat(functionDeclarations, variableDeclarations).map(function (funcs) { return funcs.sort(byName.compare); });
}
exports.getFunctions = getFunctions;
function getTypeAliasesAnnotation(ta) {
    return getAnnotation(ta.getJsDocs());
}
function parseTypeAliasDeclaration(ta) {
    var annotation = getTypeAliasesAnnotation(ta);
    var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, example = _a.example;
    var signature = ta.getText();
    var name = ta.getName();
    return Validation_1.success(typeAlias(documentable(name, description, since, deprecated, example), signature));
}
function getTypeAliases(sourceFile) {
    var exportedTypeAliasDeclarations = sourceFile
        .getTypeAliases()
        .filter(function (ta) { return ta.isExported() && !isInternal(getTypeAliasesAnnotation(ta)); });
    return Array_1.array
        .traverse(exports.monadParser)(exportedTypeAliasDeclarations, function (ta) { return parseTypeAliasDeclaration(ta); })
        .map(function (typeAliases) { return typeAliases.sort(byName.compare); });
}
exports.getTypeAliases = getTypeAliases;
function getConstantVariableDeclarationSignature(vd) {
    var text = vd.getText();
    var end = text.indexOf(' = ');
    return "export const " + text.substring(0, end) + " = ...";
}
function parseConstantVariableDeclaration(vd) {
    var vs = vd.getParent().getParent();
    var annotation = getAnnotation(vs.getJsDocs());
    var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, example = _a.example;
    var signature = getConstantVariableDeclarationSignature(vd);
    var name = vd.getName();
    return Validation_1.success(constant(documentable(name, description, since, deprecated, example), signature));
}
function getConstants(sourceFile) {
    var exportedVariableDeclarations = sourceFile.getVariableDeclarations().filter(function (vd) {
        var vs = vd.getParent().getParent();
        var annotation = getAnnotation(vs.getJsDocs());
        var initializer = vd.getInitializer();
        return (!isInternal(annotation) &&
            initializer !== undefined &&
            vs.isExported() &&
            !ast.TypeGuards.isFunctionLikeDeclaration(initializer));
    });
    return Array_1.array
        .traverse(exports.monadParser)(exportedVariableDeclarations, parseConstantVariableDeclaration)
        .map(function (constants) { return constants.sort(byName.compare); });
}
exports.getConstants = getConstants;
function getTypeParameters(typeParameters) {
    return typeParameters.length === 0 ? '' : '<' + typeParameters.map(function (p) { return p.getName(); }).join(', ') + '>';
}
function getConstructorDeclarationSignature(c) {
    var text = c.getText();
    var end = text.indexOf('{');
    return text.substring(0, end === -1 ? text.length : end).trim() + " { ... }";
}
function getClassDeclarationSignature(c) {
    var dataName = c.getName();
    var typeParameters = getTypeParameters(c.getTypeParameters());
    var constructors = c.getConstructors();
    if (constructors.length > 0) {
        var constructorSignature = getConstructorDeclarationSignature(constructors[0]);
        return "export class " + dataName + typeParameters + " {\n  " + constructorSignature + "\n  ... \n}";
    }
    else {
        return "export class " + dataName + typeParameters + " { ... }";
    }
}
function getMethodSignature(md) {
    var text = md.getText();
    var end = text.indexOf('{');
    return text.substring(0, end).trim() + " { ... }";
}
function parseMethod(md) {
    var name = md.getName();
    var overloads = md.getOverloads();
    var annotation = overloads.length === 0 ? getAnnotation(md.getJsDocs()) : getAnnotation(overloads[0].getJsDocs());
    var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, example = _a.example;
    var signature = getMethodSignature(md);
    var signatures = overloads.length === 0 ? [signature] : overloads.map(function (md) { return md.getText(); }).concat([signature]);
    return Validation_1.success(method(documentable(name, description, since, deprecated, example), signatures));
}
function parseClass(moduleName, c) {
    var name = c.getName();
    if (name === undefined) {
        return Validation_1.failure(["Missing class name in module " + moduleName]);
    }
    else {
        var annotation = getAnnotation(c.getJsDocs());
        var _a = getAnnotationInfo(annotation), description_1 = _a.description, since_1 = _a.since, deprecated_1 = _a.deprecated, example_1 = _a.example;
        var signature_1 = getClassDeclarationSignature(c);
        var methods = Array_1.array.traverse(exports.monadParser)(c.getInstanceMethods(), parseMethod);
        var staticMethods = Array_1.array.traverse(exports.monadParser)(c.getStaticMethods(), parseMethod);
        return exports.monadParser.ap(methods.map(function (methods) { return function (staticMethods) {
            return class_(documentable(name, description_1, since_1, deprecated_1, example_1), signature_1, methods, staticMethods);
        }; }), staticMethods);
    }
}
function getClasses(moduleName, sourceFile) {
    var exportedClasses = sourceFile.getClasses().filter(function (c) { return c.isExported(); });
    return Array_1.array
        .traverse(exports.monadParser)(exportedClasses, function (cd) { return parseClass(moduleName, cd); })
        .map(function (classes) { return classes.sort(byName.compare); });
}
exports.getClasses = getClasses;
function getModuleDescription(sourceFile) {
    var x = sourceFile.getStatements();
    if (x.length > 0) {
        var comments = x[0].getLeadingCommentRanges();
        if (comments.length > 0) {
            var text = comments[0].getText();
            var annotation = doctrine.parse(text, { unwrap: true });
            return getFile(annotation);
        }
        return Option_1.none;
    }
    else {
        return Option_1.none;
    }
}
exports.getModuleDescription = getModuleDescription;
function parse(file, source) {
    var moduleName = getModuleName(file.path);
    var sourceFile = getSourceFile(moduleName, source);
    return Apply_1.sequenceT(exports.monadParser)(getInterfaces(sourceFile), getFunctions(moduleName, sourceFile), getTypeAliases(sourceFile), getClasses(moduleName, sourceFile), getConstants(sourceFile)).map(function (_a) {
        var interfaces = _a[0], functions = _a[1], typeAliases = _a[2], classes = _a[3], constants = _a[4];
        return module(file.path, getModuleDescription(sourceFile), interfaces, typeAliases, functions, classes, constants);
    });
}
exports.parse = parse;
