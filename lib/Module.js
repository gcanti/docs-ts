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
exports.ordModule = exports.Export = exports.TypeAlias = exports.Function = exports.Interface = exports.Property = exports.Method = exports.Constant = exports.Class = exports.Module = exports.Documentable = void 0;
/**
 * @since 0.6.0
 */
var function_1 = require("fp-ts/function");
var Ord = require("fp-ts/Ord");
var S = require("fp-ts/string");
// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------
/**
 * @category constructors
 * @since 0.6.0
 */
var Documentable = function (name, description, since, deprecated, examples, category) { return ({ name: name, description: description, since: since, deprecated: deprecated, examples: examples, category: category }); };
exports.Documentable = Documentable;
/**
 * @category constructors
 * @since 0.6.0
 */
var Module = function (documentable, path, classes, interfaces, functions, typeAliases, constants, exports) { return (__assign(__assign({}, documentable), { path: path, classes: classes, interfaces: interfaces, functions: functions, typeAliases: typeAliases, constants: constants, exports: exports })); };
exports.Module = Module;
/**
 * @category constructors
 * @since 0.6.0
 */
var Class = function (documentable, signature, methods, staticMethods, properties) { return (__assign(__assign({ _tag: 'Class' }, documentable), { signature: signature, methods: methods, staticMethods: staticMethods, properties: properties })); };
exports.Class = Class;
/**
 * @category constructors
 * @since 0.6.0
 */
var Constant = function (documentable, signature) { return (__assign(__assign({ _tag: 'Constant' }, documentable), { signature: signature })); };
exports.Constant = Constant;
/**
 * @category constructors
 * @since 0.6.0
 */
var Method = function (documentable, signatures) { return (__assign(__assign({}, documentable), { signatures: signatures })); };
exports.Method = Method;
/**
 * @category constructors
 * @since 0.6.0
 */
var Property = function (documentable, signature) { return (__assign(__assign({}, documentable), { signature: signature })); };
exports.Property = Property;
/**
 * @category constructors
 * @since 0.6.0
 */
var Interface = function (documentable, signature) { return (__assign(__assign({ _tag: 'Interface' }, documentable), { signature: signature })); };
exports.Interface = Interface;
/**
 * @category constructors
 * @since 0.6.0
 */
var Function = function (documentable, signatures) { return (__assign(__assign({ _tag: 'Function' }, documentable), { signatures: signatures })); };
exports.Function = Function;
/**
 * @category constructors
 * @since 0.6.0
 */
var TypeAlias = function (documentable, signature) { return (__assign(__assign({ _tag: 'TypeAlias' }, documentable), { signature: signature })); };
exports.TypeAlias = TypeAlias;
/**
 * @category constructors
 * @since 0.6.0
 */
var Export = function (documentable, signature) { return (__assign(__assign({ _tag: 'Export' }, documentable), { signature: signature })); };
exports.Export = Export;
// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------
/**
 * @category instances
 * @since 0.6.0
 */
exports.ordModule = (0, function_1.pipe)(S.Ord, Ord.contramap(function (module) { return module.path.join('/').toLowerCase(); }));
