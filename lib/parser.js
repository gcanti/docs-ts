"use strict";
/**
 * @file parser utilities
 */
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
var Array_1 = require("fp-ts/lib/Array");
var Monoid_1 = require("fp-ts/lib/Monoid");
var Option_1 = require("fp-ts/lib/Option");
var Ord_1 = require("fp-ts/lib/Ord");
var Validation_1 = require("fp-ts/lib/Validation");
var ts_simple_ast_1 = require("ts-simple-ast"), ast = ts_simple_ast_1;
var path = require("path");
var sequenceS_1 = require("./sequenceS");
function example(code) {
    return code;
}
exports.example = example;
function documentable(name, description, since, deprecated, examples) {
    return { name: name, description: description, since: since, deprecated: deprecated, examples: examples };
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
function export_(documentable, signature) {
    return __assign({}, documentable, { signature: signature });
}
exports.export_ = export_;
function module(path, description, interfaces, typeAliases, functions, classes, constants, exports, deprecated) {
    return { path: path, description: description, interfaces: interfaces, typeAliases: typeAliases, functions: functions, classes: classes, constants: constants, exports: exports, deprecated: deprecated };
}
exports.module = module;
var ordModule = Ord_1.contramap(function (module) { return module.path.join('/').toLowerCase(); }, Ord_1.ordString);
var sortModules = Array_1.sort(ordModule);
var monoidFailure = Monoid_1.getArrayMonoid();
exports.monadParser = Validation_1.getMonad(monoidFailure);
function run(files) {
    return Array_1.array
        .traverse(exports.monadParser)(files, function (file) { return parse(file.path.split(path.sep), file.content); })
        .map(function (modules) { return sortModules(modules.filter(function (module) { return !module.deprecated; })); });
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
function getExamples(annotation) {
    return annotation.tags.filter(function (tag) { return tag.title === 'example'; }).map(function (tag) { return Option_1.fromNullable(tag.description).getOrElse(''); });
}
function getAnnotationInfo(annotation) {
    return {
        description: getDescription(annotation),
        since: getSince(annotation),
        deprecated: isDeprecated(annotation),
        examples: getExamples(annotation)
    };
}
function parseInterfaceDeclaration(id) {
    var annotation = getAnnotation(id.getJsDocs());
    var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, examples = _a.examples;
    var signature = id.getText();
    return Validation_1.success(interface_(documentable(id.getName(), description, since, deprecated, examples), signature));
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
    var body = f.compilerNode.body;
    if (body === undefined) {
        return text + ' { ... }';
    }
    var end = body.getStart() - f.getStart() - 1;
    return text.substring(0, end) + ' { ... }';
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
    var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, examples = _a.examples;
    var overloads = fd.getOverloads();
    var signatures = overloads.length === 0
        ? [getFunctionDeclarationSignature(fd)]
        : overloads.slice(0, overloads.length - 1).map(function (fd) { return fd.getText(); }).concat([
            getFunctionDeclarationSignature(overloads[overloads.length - 1])
        ]);
    var name = fd.getName();
    if (name === undefined || name.trim() === '') {
        return Validation_1.failure(["Missing function name in module " + moduleName]);
    }
    else {
        return Validation_1.success(func(documentable(name, description, since, deprecated, examples), signatures));
    }
}
function parseFunctionVariableDeclaration(vd) {
    var vs = vd.getParent().getParent();
    var annotation = getAnnotation(vs.getJsDocs());
    var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, examples = _a.examples;
    var signatures = [getFunctionVariableDeclarationSignature(vd)];
    var name = vd.getName();
    return Validation_1.success(func(documentable(name, description, since, deprecated, examples), signatures));
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
    var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, examples = _a.examples;
    var signature = ta.getText();
    var name = ta.getName();
    return Validation_1.success(typeAlias(documentable(name, description, since, deprecated, examples), signature));
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
    var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, examples = _a.examples;
    var signature = getConstantVariableDeclarationSignature(vd);
    var name = vd.getName();
    return Validation_1.success(constant(documentable(name, description, since, deprecated, examples), signature));
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
function parseExportDeclaration(ed) {
    var signature = ed.getText();
    var specifier = ed.getNamedExports()[0];
    var name = specifier.compilerNode.name.text;
    var comments = ed.getLeadingCommentRanges();
    if (comments.length > 0) {
        var text = comments[0].getText();
        var annotation = doctrine.parse(text, { unwrap: true });
        var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, examples = _a.examples;
        return Validation_1.success(export_(documentable(name, description, since, deprecated, examples), signature));
    }
    else {
        return Validation_1.success(export_(documentable(name, Option_1.none, Option_1.none, false, []), signature));
    }
}
function getExports(sourceFile) {
    var exportDeclarations = sourceFile.getExportDeclarations().filter(function (ed) { return ed.getNamedExports().length === 1; });
    return Array_1.array
        .traverse(exports.monadParser)(exportDeclarations, parseExportDeclaration)
        .map(function (exports) { return exports.sort(byName.compare); });
}
exports.getExports = getExports;
function getTypeParameters(typeParameters) {
    return typeParameters.length === 0 ? '' : '<' + typeParameters.map(function (p) { return p.getName(); }).join(', ') + '>';
}
function getConstructorDeclarationSignature(c) {
    var text = c.getText();
    var body = c.compilerNode.body;
    if (body === undefined) {
        return text + ' { ... }';
    }
    var end = body.getStart() - c.getStart() - 1;
    return text.substring(0, end) + ' { ... }';
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
    var body = md.compilerNode.body;
    if (body === undefined) {
        return text + ' { ... }';
    }
    var end = body.getStart() - md.getStart() - 1;
    return text.substring(0, end) + ' { ... }';
}
function parseMethod(md) {
    var name = md.getName();
    var overloads = md.getOverloads();
    var annotation = overloads.length === 0 ? getAnnotation(md.getJsDocs()) : getAnnotation(overloads[0].getJsDocs());
    var _a = getAnnotationInfo(annotation), description = _a.description, since = _a.since, deprecated = _a.deprecated, examples = _a.examples;
    var signatures = overloads.length === 0
        ? [getMethodSignature(md)]
        : overloads.slice(0, overloads.length - 1).map(function (md) { return md.getText(); }).concat([
            getMethodSignature(overloads[overloads.length - 1])
        ]);
    return Validation_1.success(method(documentable(name, description, since, deprecated, examples), signatures));
}
function parseClass(moduleName, c) {
    var name = c.getName();
    if (name === undefined) {
        return Validation_1.failure(["Missing class name in module " + moduleName]);
    }
    else {
        var annotation = getAnnotation(c.getJsDocs());
        var _a = getAnnotationInfo(annotation), description_1 = _a.description, since_1 = _a.since, deprecated_1 = _a.deprecated, examples_1 = _a.examples;
        var signature_1 = getClassDeclarationSignature(c);
        var methods = Array_1.array.traverse(exports.monadParser)(c.getInstanceMethods(), parseMethod);
        var staticMethods = Array_1.array.traverse(exports.monadParser)(c.getStaticMethods(), parseMethod);
        return exports.monadParser.ap(methods.map(function (methods) { return function (staticMethods) {
            return class_(documentable(name, description_1, since_1, deprecated_1, examples_1), signature_1, methods, staticMethods);
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
function getModuleInfo(sourceFile) {
    var x = sourceFile.getStatements();
    if (x.length > 0) {
        var comments = x[0].getLeadingCommentRanges();
        if (comments.length > 0) {
            var text = comments[0].getText();
            var annotation = doctrine.parse(text, { unwrap: true });
            var description = getFile(annotation);
            return {
                description: description,
                deprecated: isDeprecated(annotation)
            };
        }
    }
    return {
        description: Option_1.none,
        deprecated: false
    };
}
exports.getModuleInfo = getModuleInfo;
function parse(path, source) {
    var moduleName = getModuleName(path);
    var sourceFile = getSourceFile(moduleName, source);
    return sequenceS_1.sequenceS(exports.monadParser)({
        interfaces: getInterfaces(sourceFile),
        functions: getFunctions(moduleName, sourceFile),
        typeAliases: getTypeAliases(sourceFile),
        classes: getClasses(moduleName, sourceFile),
        constants: getConstants(sourceFile),
        exports: getExports(sourceFile)
    }).map(function (_a) {
        var interfaces = _a.interfaces, functions = _a.functions, typeAliases = _a.typeAliases, classes = _a.classes, constants = _a.constants, exports = _a.exports;
        var _b = getModuleInfo(sourceFile), description = _b.description, deprecated = _b.deprecated;
        return module(path, description, interfaces, typeAliases, functions, classes, constants, exports, deprecated);
    });
}
exports.parse = parse;
