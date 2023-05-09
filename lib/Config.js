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
exports.decode = exports.updateExclusions = exports.updateEnforceVersion = exports.updateEnforceExamples = exports.updateEnforceDescriptions = exports.updateSearchEnabled = exports.updateTheme = exports.updateOutDir = exports.updateSourceDir = exports.updateProjectHomepage = exports.resolveSettings = exports.build = void 0;
/**
 * @since 0.6.0
 */
var function_1 = require("fp-ts/function");
var M = require("fp-ts/Monoid");
var RA = require("fp-ts/ReadonlyArray");
var RR = require("fp-ts/ReadonlyRecord");
var Semigroup = require("fp-ts/Semigroup");
var S = require("fp-ts/string");
var Task = require("fp-ts/Task");
var TE = require("fp-ts/TaskEither");
var T = require("fp-ts/Traced");
var DE = require("io-ts/DecodeError");
var FS = require("io-ts/FreeSemigroup");
var TD = require("io-ts/TaskDecoder");
// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------
var getMonoidSetting = function (empty) { return (__assign(__assign({}, Semigroup.last()), { empty: empty })); };
var monoidConfig = M.struct({
    projectHomepage: getMonoidSetting(''),
    srcDir: getMonoidSetting('src'),
    outDir: getMonoidSetting('docs'),
    theme: getMonoidSetting('pmarsceill/just-the-docs'),
    enableSearch: getMonoidSetting(true),
    enforceDescriptions: getMonoidSetting(false),
    enforceExamples: getMonoidSetting(false),
    enforceVersion: getMonoidSetting(true),
    exclude: getMonoidSetting(RA.empty),
    compilerOptions: getMonoidSetting({})
});
var C = T.getComonad(monoidConfig);
/**
 * @category constructors
 * @since 0.6.4
 */
var build = function (projectName, projectHomepage) {
    return function (config) { return (__assign(__assign({}, config), { projectName: projectName, projectHomepage: config.projectHomepage.length === 0 ? projectHomepage : config.projectHomepage })); };
};
exports.build = build;
// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------
/**
 * @category destructors
 * @since 0.6.0
 */
exports.resolveSettings = C.extract;
// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------
/**
 * @category combinators
 * @since 0.6.4
 */
var updateProjectHomepage = function (projectHomepage) {
    return function (wa) {
        return C.extend(wa, function (builder) {
            return builder(__assign(__assign({}, monoidConfig.empty), { projectHomepage: projectHomepage }));
        });
    };
};
exports.updateProjectHomepage = updateProjectHomepage;
/**
 * @category combinators
 * @since 0.6.0
 */
var updateSourceDir = function (srcDir) {
    return function (wa) {
        return C.extend(wa, function (builder) {
            return builder(__assign(__assign({}, monoidConfig.empty), { srcDir: srcDir }));
        });
    };
};
exports.updateSourceDir = updateSourceDir;
/**
 * @category combinators
 * @since 0.6.0
 */
var updateOutDir = function (outDir) {
    return function (wa) {
        return C.extend(wa, function (builder) {
            return builder(__assign(__assign({}, monoidConfig.empty), { outDir: outDir }));
        });
    };
};
exports.updateOutDir = updateOutDir;
/**
 * @category combinators
 * @since 0.6.0
 */
var updateTheme = function (theme) {
    return function (wa) {
        return C.extend(wa, function (builder) {
            return builder(__assign(__assign({}, monoidConfig.empty), { theme: theme }));
        });
    };
};
exports.updateTheme = updateTheme;
/**
 * @category combinators
 * @since 0.6.0
 */
var updateSearchEnabled = function (enableSearch) {
    return function (wa) {
        return C.extend(wa, function (builder) {
            return builder(__assign(__assign({}, monoidConfig.empty), { enableSearch: enableSearch }));
        });
    };
};
exports.updateSearchEnabled = updateSearchEnabled;
/**
 * @category combinators
 * @since 0.6.0
 */
var updateEnforceDescriptions = function (enforceDescriptions) {
    return function (wa) {
        return C.extend(wa, function (builder) {
            return builder(__assign(__assign({}, monoidConfig.empty), { enforceDescriptions: enforceDescriptions }));
        });
    };
};
exports.updateEnforceDescriptions = updateEnforceDescriptions;
/**
 * @category combinators
 * @since 0.6.0
 */
var updateEnforceExamples = function (enforceExamples) {
    return function (wa) {
        return C.extend(wa, function (builder) {
            return builder(__assign(__assign({}, monoidConfig.empty), { enforceExamples: enforceExamples }));
        });
    };
};
exports.updateEnforceExamples = updateEnforceExamples;
/**
 * @category combinators
 * @since 0.6.0
 */
var updateEnforceVersion = function (enforceVersion) {
    return function (wa) {
        return C.extend(wa, function (builder) {
            return builder(__assign(__assign({}, monoidConfig.empty), { enforceVersion: enforceVersion }));
        });
    };
};
exports.updateEnforceVersion = updateEnforceVersion;
/**
 * @category combinators
 * @since 0.6.0
 */
var updateExclusions = function (exclude) {
    return function (wa) {
        return C.extend(wa, function (builder) {
            return builder(__assign(__assign({}, monoidConfig.empty), { exclude: exclude }));
        });
    };
};
exports.updateExclusions = updateExclusions;
// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------
var validConfigurationkeys = RR.keys(monoidConfig.empty);
var semigroupError = DE.getSemigroup();
var validation = TE.getApplicativeTaskValidation(Task.ApplyPar, semigroupError);
var decodeValidKeys = function (record) {
    return (0, function_1.pipe)(record, RR.traverseWithIndex(validation)(function (key, value) {
        return RA.elem(S.Eq)(key)(validConfigurationkeys)
            ? TE.right(value)
            : TE.left(FS.of(DE.leaf(key, "a valid configuration property")));
    }));
};
/**
 * @category utils
 * @since 0.6.4
 */
var decode = function (input) {
    var configDecoder = (0, function_1.pipe)(TD.UnknownRecord, TD.parse(decodeValidKeys), TD.compose(TD.partial({
        projectHomepage: TD.string,
        srcDir: TD.string,
        outDir: TD.string,
        theme: TD.string,
        enableSearch: TD.boolean,
        enforceDescriptions: TD.boolean,
        enforceExamples: TD.boolean,
        enforceVersion: TD.boolean,
        exclude: TD.array(TD.string),
        compilerOptions: TD.UnknownRecord
    })));
    return (0, function_1.pipe)(configDecoder.decode(input), TE.mapLeft(TD.draw));
};
exports.decode = decode;
