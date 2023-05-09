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
exports.parseFiles = exports.parseFile = exports.parseModule = exports.parseModuleDocumentation = exports.parseClasses = exports.getConstructorDeclarationSignature = exports.parseExports = exports.parseConstants = exports.parseTypeAliases = exports.parseFunctions = exports.parseInterfaces = exports.parseComment = exports.getCommentInfo = exports.stripImportTypes = void 0;
/**
 * @since 0.6.0
 */
var doctrine = require("doctrine");
var Apply = require("fp-ts/Apply");
var B = require("fp-ts/boolean");
var E = require("fp-ts/Either");
var function_1 = require("fp-ts/function");
var M = require("fp-ts/Monoid");
var O = require("fp-ts/Option");
var Ord = require("fp-ts/Ord");
var Predicate_1 = require("fp-ts/Predicate");
var RE = require("fp-ts/ReaderEither");
var RTE = require("fp-ts/ReaderTaskEither");
var RA = require("fp-ts/ReadonlyArray");
var RNEA = require("fp-ts/ReadonlyNonEmptyArray");
var RR = require("fp-ts/ReadonlyRecord");
var Semigroup = require("fp-ts/Semigroup");
var S = require("fp-ts/string");
var T = require("fp-ts/Task");
var Path = require("path");
var ast = require("ts-morph");
var Module_1 = require("./Module");
// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------
var CommentInfo = function (description, since, deprecated, examples, category) { return ({
    description: description,
    since: since,
    deprecated: deprecated,
    examples: examples,
    category: category
}); };
// -------------------------------------------------------------------------------------
// parsers
// -------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------
var semigroupError = (0, function_1.pipe)(S.Semigroup, Semigroup.intercalate('\n'));
var applicativeParser = RE.getApplicativeReaderValidation(semigroupError);
var sequenceS = Apply.sequenceS(applicativeParser);
var traverse = RA.traverse(applicativeParser);
var every = function (predicates) {
    return M.concatAll((0, function_1.getMonoid)(B.MonoidAll)())(predicates);
};
var some = function (predicates) {
    return M.concatAll((0, function_1.getMonoid)(B.MonoidAny)())(predicates);
};
var ordByName = (0, function_1.pipe)(S.Ord, Ord.contramap(function (_a) {
    var name = _a.name;
    return name;
}));
var sortModules = RA.sort(Module_1.ordModule);
var isNonEmptyString = function (s) { return s.length > 0; };
/**
 * @internal
 */
var stripImportTypes = function (s) { return s.replace(/import\("((?!").)*"\)./g, ''); };
exports.stripImportTypes = stripImportTypes;
var getJSDocText = RA.foldRight(function () { return ''; }, function (_, last) { return last.getText(); });
var shouldIgnore = some([
    function (comment) { return (0, function_1.pipe)(comment.tags, RR.lookup('internal'), O.isSome); },
    function (comment) { return (0, function_1.pipe)(comment.tags, RR.lookup('ignore'), O.isSome); }
]);
var isVariableDeclarationList = function (u) { return u.getKind() === ast.ts.SyntaxKind.VariableDeclarationList; };
var isVariableStatement = function (u) { return u.getKind() === ast.ts.SyntaxKind.VariableStatement; };
// -------------------------------------------------------------------------------------
// comments
// -------------------------------------------------------------------------------------
var getSinceTag = function (name, comment) {
    return (0, function_1.pipe)(RE.ask(), RE.chainEitherK(function (env) {
        return (0, function_1.pipe)(comment.tags, RR.lookup('since'), O.flatMap(RNEA.head), O.fold(function () {
            return env.config.enforceVersion
                ? E.left("Missing @since tag in ".concat(env.path.join('/'), "#").concat(name, " documentation"))
                : E.right(O.none);
        }, function (since) { return E.right(O.some(since)); }));
    }));
};
var getCategoryTag = function (name, comment) {
    return (0, function_1.pipe)(RE.ask(), RE.chainEitherK(function (env) {
        return (0, function_1.pipe)(comment.tags, RR.lookup('category'), O.flatMap(RNEA.head), E.fromPredicate((0, Predicate_1.not)(every([O.isNone, function () { return RR.has('category', comment.tags); }])), function () { return "Missing @category value in ".concat(env.path.join('/'), "#").concat(name, " documentation"); }));
    }));
};
var getDescription = function (name, comment) {
    return (0, function_1.pipe)(RE.ask(), RE.chainEitherK(function (env) {
        return (0, function_1.pipe)(comment.description, O.fold(function () {
            return env.config.enforceDescriptions
                ? E.left("Missing description in ".concat(env.path.join('/'), "#").concat(name, " documentation"))
                : E.right(O.none);
        }, function (description) { return E.right(O.some(description)); }));
    }));
};
var getExamples = function (name, comment, isModule) {
    return (0, function_1.pipe)(RE.ask(), RE.chainEitherK(function (env) {
        return (0, function_1.pipe)(comment.tags, RR.lookup('example'), O.map(RA.compact), O.fold(function () {
            return M.concatAll(B.MonoidAll)([env.config.enforceExamples, !isModule])
                ? E.left("Missing examples in ".concat(env.path.join('/'), "#").concat(name, " documentation"))
                : E.right(RA.empty);
        }, function (examples) {
            return M.concatAll(B.MonoidAll)([env.config.enforceExamples, RA.isEmpty(examples), !isModule])
                ? E.left("Missing examples in ".concat(env.path.join('/'), "#").concat(name, " documentation"))
                : E.right(examples);
        }));
    }));
};
/**
 * @internal
 */
var getCommentInfo = function (name, isModule) {
    if (isModule === void 0) { isModule = false; }
    return function (text) {
        return (0, function_1.pipe)(RE.right((0, exports.parseComment)(text)), RE.bindTo('comment'), RE.bind('since', function (_a) {
            var comment = _a.comment;
            return getSinceTag(name, comment);
        }), RE.bind('category', function (_a) {
            var comment = _a.comment;
            return getCategoryTag(name, comment);
        }), RE.bind('description', function (_a) {
            var comment = _a.comment;
            return getDescription(name, comment);
        }), RE.bind('examples', function (_a) {
            var comment = _a.comment;
            return getExamples(name, comment, isModule);
        }), RE.bind('deprecated', function (_a) {
            var comment = _a.comment;
            return RE.right((0, function_1.pipe)(comment.tags, RR.lookup('deprecated'), O.isSome));
        }), RE.map(function (_a) {
            var category = _a.category, deprecated = _a.deprecated, description = _a.description, examples = _a.examples, since = _a.since;
            return CommentInfo(description, since, deprecated, examples, category);
        }));
    };
};
exports.getCommentInfo = getCommentInfo;
/**
 * @internal
 */
var parseComment = function (text) {
    var annotation = doctrine.parse(text, { unwrap: true });
    var tags = (0, function_1.pipe)(annotation.tags, RNEA.groupBy(function (tag) { return tag.title; }), RR.map(RNEA.map(function (tag) { return (0, function_1.pipe)(O.fromNullable(tag.description), O.filter(isNonEmptyString)); })));
    var description = (0, function_1.pipe)(O.fromNullable(annotation.description), O.filter(isNonEmptyString));
    return { description: description, tags: tags };
};
exports.parseComment = parseComment;
// -------------------------------------------------------------------------------------
// interfaces
// -------------------------------------------------------------------------------------
var parseInterfaceDeclaration = function (id) {
    return (0, function_1.pipe)(getJSDocText(id.getJsDocs()), (0, exports.getCommentInfo)(id.getName()), RE.map(function (info) {
        return (0, Module_1.Interface)((0, Module_1.Documentable)(id.getName(), info.description, info.since, info.deprecated, info.examples, info.category), id.getText());
    }));
};
/**
 * @category parsers
 * @since 0.6.0
 */
exports.parseInterfaces = (0, function_1.pipe)(RE.asks(function (env) {
    return env.sourceFile.getInterfaces().filter(function (id) { return id.isExported(); });
}), RE.flatMap((0, function_1.flow)(traverse(parseInterfaceDeclaration), RE.map(RA.sort(ordByName)))));
// -------------------------------------------------------------------------------------
// functions
// -------------------------------------------------------------------------------------
var getFunctionDeclarationSignature = function (f) {
    var text = f.getText();
    return (0, function_1.pipe)(O.fromNullable(f.compilerNode.body), O.fold(function () { return text.replace('export function ', 'export declare function '); }, function (body) {
        var end = body.getStart() - f.getStart() - 1;
        return text.substring(0, end).replace('export function ', 'export declare function ');
    }));
};
var getFunctionDeclarationJSDocs = function (fd) {
    return (0, function_1.pipe)(fd.getOverloads(), RA.foldLeft(function () { return fd.getJsDocs(); }, function (firstOverload) { return firstOverload.getJsDocs(); }));
};
var parseFunctionDeclaration = function (fd) {
    return (0, function_1.pipe)(RE.ask(), RE.chain(function (env) {
        return (0, function_1.pipe)(O.fromNullable(fd.getName()), O.flatMap(O.fromPredicate(function (name) { return name.length > 0; })), RE.fromOption(function () { return "Missing function name in module ".concat(env.path.join('/')); }));
    }), RE.flatMap(function (name) {
        return (0, function_1.pipe)(getJSDocText(getFunctionDeclarationJSDocs(fd)), (0, exports.getCommentInfo)(name), RE.map(function (info) {
            var signatures = (0, function_1.pipe)(fd.getOverloads(), RA.foldRight(function () { return RA.of(getFunctionDeclarationSignature(fd)); }, function (init, last) {
                return (0, function_1.pipe)(init.map(getFunctionDeclarationSignature), RA.append(getFunctionDeclarationSignature(last)));
            }));
            return (0, Module_1.Function)((0, Module_1.Documentable)(name, info.description, info.since, info.deprecated, info.examples, info.category), signatures);
        }));
    }));
};
var parseFunctionVariableDeclaration = function (vd) {
    var vs = vd.getParent().getParent();
    var name = vd.getName();
    return (0, function_1.pipe)(getJSDocText(vs.getJsDocs()), (0, exports.getCommentInfo)(name), RE.map(function (info) {
        var signature = "export declare const ".concat(name, ": ").concat((0, exports.stripImportTypes)(vd.getType().getText(vd)));
        return (0, Module_1.Function)((0, Module_1.Documentable)(name, info.description, info.since, info.deprecated, info.examples, info.category), RA.of(signature));
    }));
};
var getFunctionDeclarations = RE.asks(function (env) { return ({
    functions: (0, function_1.pipe)(env.sourceFile.getFunctions(), RA.filter(every([
        function (fd) { return fd.isExported(); },
        (0, Predicate_1.not)((0, function_1.flow)(getFunctionDeclarationJSDocs, getJSDocText, exports.parseComment, shouldIgnore))
    ]))),
    arrows: (0, function_1.pipe)(env.sourceFile.getVariableDeclarations(), RA.filter(every([
        function (vd) { return isVariableDeclarationList(vd.getParent()); },
        function (vd) { return isVariableStatement(vd.getParent().getParent()); },
        function (vd) {
            return (0, function_1.pipe)(vd.getInitializer(), every([
                (0, function_1.flow)(O.fromNullable, O.flatMap(O.fromPredicate(ast.Node.isFunctionLikeDeclaration)), O.isSome),
                function () {
                    return (0, function_1.pipe)(vd.getParent().getParent().getJsDocs(), (0, Predicate_1.not)((0, function_1.flow)(getJSDocText, exports.parseComment, shouldIgnore)));
                },
                function () { return vd.getParent().getParent().isExported(); }
            ]));
        }
    ])))
}); });
/**
 * @category parsers
 * @since 0.6.0
 */
exports.parseFunctions = (0, function_1.pipe)(getFunctionDeclarations, RE.flatMap(function (_a) {
    var arrows = _a.arrows, functions = _a.functions;
    return sequenceS({
        functionDeclarations: (0, function_1.pipe)(functions, traverse(parseFunctionDeclaration)),
        variableDeclarations: (0, function_1.pipe)(arrows, traverse(parseFunctionVariableDeclaration))
    });
}), RE.map(function (_a) {
    var functionDeclarations = _a.functionDeclarations, variableDeclarations = _a.variableDeclarations;
    return RA.getMonoid().concat(functionDeclarations, variableDeclarations);
}));
// -------------------------------------------------------------------------------------
// type aliases
// -------------------------------------------------------------------------------------
var parseTypeAliasDeclaration = function (ta) {
    return (0, function_1.pipe)(RE.of(ta.getName()), RE.flatMap(function (name) {
        return (0, function_1.pipe)(getJSDocText(ta.getJsDocs()), (0, exports.getCommentInfo)(name), RE.map(function (info) {
            return (0, Module_1.TypeAlias)((0, Module_1.Documentable)(name, info.description, info.since, info.deprecated, info.examples, info.category), ta.getText());
        }));
    }));
};
/**
 * @category parsers
 * @since 0.6.0
 */
exports.parseTypeAliases = (0, function_1.pipe)(RE.asks(function (env) {
    return (0, function_1.pipe)(env.sourceFile.getTypeAliases(), RA.filter(every([
        function (alias) { return alias.isExported(); },
        function (alias) { return (0, function_1.pipe)(alias.getJsDocs(), (0, Predicate_1.not)((0, function_1.flow)(getJSDocText, exports.parseComment, shouldIgnore))); }
    ])));
}), RE.flatMap(traverse(parseTypeAliasDeclaration)), RE.map(RA.sort(ordByName)));
// -------------------------------------------------------------------------------------
// constants
// -------------------------------------------------------------------------------------
var parseConstantVariableDeclaration = function (vd) {
    var vs = vd.getParent().getParent();
    var name = vd.getName();
    return (0, function_1.pipe)(getJSDocText(vs.getJsDocs()), (0, exports.getCommentInfo)(name), RE.map(function (info) {
        var type = (0, exports.stripImportTypes)(vd.getType().getText(vd));
        var signature = "export declare const ".concat(name, ": ").concat(type);
        return (0, Module_1.Constant)((0, Module_1.Documentable)(name, info.description, info.since, info.deprecated, info.examples, info.category), signature);
    }));
};
/**
 * @category parsers
 * @since 0.6.0
 */
exports.parseConstants = (0, function_1.pipe)(RE.asks(function (env) {
    return (0, function_1.pipe)(env.sourceFile.getVariableDeclarations(), RA.filter(every([
        function (vd) { return isVariableDeclarationList(vd.getParent()); },
        function (vd) { return isVariableStatement(vd.getParent().getParent()); },
        function (vd) {
            return (0, function_1.pipe)(vd.getInitializer(), every([
                (0, function_1.flow)(O.fromNullable, O.flatMap(O.fromPredicate((0, Predicate_1.not)(ast.Node.isFunctionLikeDeclaration))), O.isSome),
                function () {
                    return (0, function_1.pipe)(vd.getParent().getParent().getJsDocs(), (0, Predicate_1.not)((0, function_1.flow)(getJSDocText, exports.parseComment, shouldIgnore)));
                },
                function () { return vd.getParent().getParent().isExported(); }
            ]));
        }
    ])));
}), RE.flatMap(traverse(parseConstantVariableDeclaration)));
// -------------------------------------------------------------------------------------
// exports
// -------------------------------------------------------------------------------------
var parseExportSpecifier = function (es) {
    return (0, function_1.pipe)(RE.ask(), RE.flatMap(function (env) {
        return (0, function_1.pipe)(RE.of(es.compilerNode.name.text), RE.bindTo('name'), RE.bind('type', function () { return RE.of((0, exports.stripImportTypes)(es.getType().getText(es))); }), RE.bind('signature', function (_a) {
            var name = _a.name, type = _a.type;
            return RE.of("export declare const ".concat(name, ": ").concat(type));
        }), RE.flatMap(function (_a) {
            var name = _a.name, signature = _a.signature;
            return (0, function_1.pipe)(es.getLeadingCommentRanges(), RA.head, RE.fromOption(function () { return "Missing ".concat(name, " documentation in ").concat(env.path.join('/')); }), RE.flatMap(function (commentRange) { return (0, function_1.pipe)(commentRange.getText(), (0, exports.getCommentInfo)(name)); }), RE.map(function (info) {
                return (0, Module_1.Export)((0, Module_1.Documentable)(name, info.description, info.since, info.deprecated, info.examples, info.category), signature);
            }));
        }));
    }));
};
var parseExportDeclaration = function (ed) {
    return (0, function_1.pipe)(ed.getNamedExports(), traverse(parseExportSpecifier));
};
/**
 * @category parsers
 * @since 0.6.0
 */
exports.parseExports = (0, function_1.pipe)(RE.asks(function (env) { return env.sourceFile.getExportDeclarations(); }), RE.flatMap(traverse(parseExportDeclaration)), RE.map(RA.flatten));
// -------------------------------------------------------------------------------------
// classes
// -------------------------------------------------------------------------------------
var getTypeParameters = function (tps) {
    return tps.length === 0 ? '' : "<".concat(tps.map(function (p) { return p.getName(); }).join(', '), ">");
};
var getMethodSignature = function (md) {
    return (0, function_1.pipe)(O.fromNullable(md.compilerNode.body), O.fold(function () { return md.getText(); }, function (body) {
        var end = body.getStart() - md.getStart() - 1;
        return md.getText().substring(0, end);
    }));
};
var parseMethod = function (md) {
    return (0, function_1.pipe)(RE.of(md.getName()), RE.bindTo('name'), RE.bind('overloads', function () { return RE.of(md.getOverloads()); }), RE.bind('jsdocs', function (_a) {
        var overloads = _a.overloads;
        return RE.of((0, function_1.pipe)(overloads, RA.foldLeft(function () { return md.getJsDocs(); }, function (x) { return x.getJsDocs(); })));
    }), RE.flatMap(function (_a) {
        var jsdocs = _a.jsdocs, overloads = _a.overloads, name = _a.name;
        return shouldIgnore((0, exports.parseComment)(getJSDocText(jsdocs)))
            ? RE.right(O.none)
            : (0, function_1.pipe)(getJSDocText(jsdocs), (0, exports.getCommentInfo)(name), RE.map(function (info) {
                var signatures = (0, function_1.pipe)(overloads, RA.foldRight(function () { return RA.of(getMethodSignature(md)); }, function (init, last) {
                    return (0, function_1.pipe)(init.map(function (md) { return md.getText(); }), RA.append(getMethodSignature(last)));
                }));
                return O.some((0, Module_1.Method)((0, Module_1.Documentable)(name, info.description, info.since, info.deprecated, info.examples, info.category), signatures));
            }));
    }));
};
var parseProperty = function (classname) {
    return function (pd) {
        var name = pd.getName();
        return (0, function_1.pipe)(getJSDocText(pd.getJsDocs()), (0, exports.getCommentInfo)("".concat(classname, "#").concat(name)), RE.map(function (info) {
            var type = (0, exports.stripImportTypes)(pd.getType().getText(pd));
            var readonly = (0, function_1.pipe)(O.fromNullable(pd.getFirstModifierByKind(ast.ts.SyntaxKind.ReadonlyKeyword)), O.fold(function () { return ''; }, function () { return 'readonly '; }));
            var signature = "".concat(readonly).concat(name, ": ").concat(type);
            return (0, Module_1.Property)((0, Module_1.Documentable)(name, info.description, info.since, info.deprecated, info.examples, info.category), signature);
        }));
    };
};
var parseProperties = function (name, c) {
    return (0, function_1.pipe)(c.getProperties(), 
    // take public, instance properties
    RA.filter(every([
        function (prop) { return !prop.isStatic(); },
        function (prop) { return (0, function_1.pipe)(prop.getFirstModifierByKind(ast.ts.SyntaxKind.PrivateKeyword), O.fromNullable, O.isNone); },
        function (prop) { return (0, function_1.pipe)(prop.getJsDocs(), (0, Predicate_1.not)((0, function_1.flow)(getJSDocText, exports.parseComment, shouldIgnore))); }
    ])), traverse(parseProperty(name)));
};
/**
 * @internal
 */
var getConstructorDeclarationSignature = function (c) {
    return (0, function_1.pipe)(O.fromNullable(c.compilerNode.body), O.fold(function () { return c.getText(); }, function (body) {
        var end = body.getStart() - c.getStart() - 1;
        return c.getText().substring(0, end);
    }));
};
exports.getConstructorDeclarationSignature = getConstructorDeclarationSignature;
var getClassName = function (c) {
    return (0, function_1.pipe)(RE.ask(), RE.chain(function (env) {
        return (0, function_1.pipe)(O.fromNullable(c.getName()), RE.fromOption(function () { return "Missing class name in module ".concat(env.path.join('/')); }));
    }));
};
var getClassCommentInfo = function (name, c) {
    return (0, function_1.pipe)(c.getJsDocs(), getJSDocText, (0, exports.getCommentInfo)(name));
};
var getClassDeclarationSignature = function (name, c) {
    return (0, function_1.pipe)(RE.ask(), RE.map(function () { return getTypeParameters(c.getTypeParameters()); }), RE.map(function (typeParameters) {
        return (0, function_1.pipe)(c.getConstructors(), RA.foldLeft(function () { return "export declare class ".concat(name).concat(typeParameters); }, function (head) { return "export declare class ".concat(name).concat(typeParameters, " { ").concat((0, exports.getConstructorDeclarationSignature)(head), " }"); }));
    }));
};
var parseClass = function (c) {
    return (0, function_1.pipe)(getClassName(c), RE.bindTo('name'), RE.bind('info', function (_a) {
        var name = _a.name;
        return getClassCommentInfo(name, c);
    }), RE.bind('signature', function (_a) {
        var name = _a.name;
        return getClassDeclarationSignature(name, c);
    }), RE.bind('methods', function () { return (0, function_1.pipe)(c.getInstanceMethods(), traverse(parseMethod), RE.map(RA.compact)); }), RE.bind('staticMethods', function () { return (0, function_1.pipe)(c.getStaticMethods(), traverse(parseMethod), RE.map(RA.compact)); }), RE.bind('properties', function (_a) {
        var name = _a.name;
        return parseProperties(name, c);
    }), RE.map(function (_a) {
        var methods = _a.methods, staticMethods = _a.staticMethods, properties = _a.properties, info = _a.info, name = _a.name, signature = _a.signature;
        return (0, Module_1.Class)((0, Module_1.Documentable)(name, info.description, info.since, info.deprecated, info.examples, info.category), signature, methods, staticMethods, properties);
    }));
};
var getClasses = RE.asks(function (env) {
    return (0, function_1.pipe)(env.sourceFile.getClasses(), RA.filter(function (c) { return c.isExported(); }));
});
/**
 * @category parsers
 * @since 0.6.0
 */
exports.parseClasses = (0, function_1.pipe)(getClasses, RE.flatMap(traverse(parseClass)), RE.map(RA.sort(ordByName)));
// -------------------------------------------------------------------------------------
// modules
// -------------------------------------------------------------------------------------
var getModuleName = function (path) { return Path.parse(RNEA.last(path)).name; };
/**
 * @internal
 */
exports.parseModuleDocumentation = (0, function_1.pipe)(RE.ask(), RE.chainEitherK(function (env) {
    var name = getModuleName(env.path);
    // if any of the settings enforcing documentation are set to `true`, then
    // a module should have associated documentation
    var isDocumentationRequired = M.concatAll(B.MonoidAny)([
        env.config.enforceDescriptions,
        env.config.enforceVersion
    ]);
    var onMissingDocumentation = function () {
        return isDocumentationRequired
            ? E.left("Missing documentation in ".concat(env.path.join('/'), " module"))
            : E.right((0, Module_1.Documentable)(name, O.none, O.none, false, RA.empty, O.none));
    };
    return (0, function_1.pipe)(env.sourceFile.getStatements(), RA.foldLeft(onMissingDocumentation, function (statement) {
        return (0, function_1.pipe)(statement.getLeadingCommentRanges(), RA.foldLeft(onMissingDocumentation, function (commentRange) {
            return (0, function_1.pipe)((0, exports.getCommentInfo)(name, true)(commentRange.getText())(env), E.map(function (info) {
                return (0, Module_1.Documentable)(name, info.description, info.since, info.deprecated, info.examples, info.category);
            }));
        }));
    }));
}));
/**
 * @category parsers
 * @since 0.6.0
 */
exports.parseModule = (0, function_1.pipe)(RE.ask(), RE.flatMap(function (env) {
    return (0, function_1.pipe)(exports.parseModuleDocumentation, RE.bindTo('documentation'), RE.bind('interfaces', function () { return exports.parseInterfaces; }), RE.bind('functions', function () { return exports.parseFunctions; }), RE.bind('typeAliases', function () { return exports.parseTypeAliases; }), RE.bind('classes', function () { return exports.parseClasses; }), RE.bind('constants', function () { return exports.parseConstants; }), RE.bind('exports', function () { return exports.parseExports; }), RE.map(function (_a) {
        var documentation = _a.documentation, classes = _a.classes, interfaces = _a.interfaces, functions = _a.functions, typeAliases = _a.typeAliases, constants = _a.constants, exports = _a.exports;
        return (0, Module_1.Module)(documentation, env.path, classes, interfaces, functions, typeAliases, constants, exports);
    }));
}));
// -------------------------------------------------------------------------------------
// files
// -------------------------------------------------------------------------------------
/**
 * @internal
 */
var parseFile = function (project) {
    return function (file) {
        return (0, function_1.pipe)(RTE.ask(), RTE.flatMap(function (env) {
            return (0, function_1.pipe)(RTE.right(file.path.split(Path.sep)), RTE.bindTo('path'), RTE.bind('sourceFile', function () {
                return (0, function_1.pipe)(O.fromNullable(project.getSourceFile(file.path)), RTE.fromOption(function () { return "Unable to locate file: ".concat(file.path); }));
            }), RTE.chainEitherK(function (menv) { return (0, exports.parseModule)(__assign(__assign({}, env), menv)); }));
        }));
    };
};
exports.parseFile = parseFile;
var createProject = function (files) {
    return (0, function_1.pipe)(RTE.ask(), RTE.flatMap(function (env) {
        var options = {
            compilerOptions: __assign({ strict: true }, env.config.compilerOptions)
        };
        var project = new ast.Project(options);
        (0, function_1.pipe)(files, RA.map(function (file) { return env.addFile(file)(project); }));
        return RTE.of(project);
    }));
};
/**
 * @category parsers
 * @since 0.6.0
 */
var parseFiles = function (files) {
    return (0, function_1.pipe)(createProject(files), RTE.flatMap(function (project) {
        return (0, function_1.pipe)(files, RA.traverse(RTE.getApplicativeReaderTaskValidation(T.ApplyPar, semigroupError))((0, exports.parseFile)(project)));
    }), RTE.map((0, function_1.flow)(RA.filter(function (module) { return !module.deprecated; }), sortModules)));
};
exports.parseFiles = parseFiles;
