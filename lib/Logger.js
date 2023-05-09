"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.toErrorMsg = exports.showEntry = exports.info = exports.error = exports.debug = exports.LogEntry = void 0;
/**
 * @since 0.6.0
 */
var chalk_1 = require("chalk");
var C = require("fp-ts/Console");
var D = require("fp-ts/Date");
var function_1 = require("fp-ts/function");
var M = require("fp-ts/Monoid");
var T = require("fp-ts/Task");
var TE = require("fp-ts/TaskEither");
var L = require("logging-ts/lib/Task");
// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------
/**
 * @category constructors
 * @since 0.6.0
 */
var LogEntry = function (message, date, level) { return ({
    message: message,
    date: date,
    level: level
}); };
exports.LogEntry = LogEntry;
// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------
var getLoggerEntry = function (withColor) {
    return function (entry) {
        return T.fromIO(C.log(withColor(exports.showEntry.show(entry))));
    };
};
var debugLogger = L.filter(getLoggerEntry(chalk_1.default.cyan), function (e) { return e.level === 'DEBUG'; });
var errorLogger = L.filter(getLoggerEntry(chalk_1.default.bold.red), function (e) { return e.level === 'ERROR'; });
var infoLogger = L.filter(getLoggerEntry(chalk_1.default.bold.magenta), function (e) { return e.level === 'INFO'; });
var mainLogger = (0, function_1.pipe)([debugLogger, errorLogger, infoLogger], M.concatAll(L.getMonoid()));
var logWithLevel = function (level) {
    return function (message) {
        return (0, function_1.pipe)(T.fromIO(D.create), T.flatMap(function (date) { return mainLogger({ message: message, date: date, level: level }); }));
    };
};
/**
 * @category utils
 * @since 0.6.0
 */
exports.debug = logWithLevel('DEBUG');
/**
 * @category utils
 * @since 0.6.0
 */
exports.error = logWithLevel('ERROR');
/**
 * @category utils
 * @since 0.6.0
 */
exports.info = logWithLevel('INFO');
// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------
var showDate = {
    show: function (date) { return "".concat(date.toLocaleDateString(), " | ").concat(date.toLocaleTimeString()); }
};
/**
 * @category instances
 * @since 0.6.0
 */
exports.showEntry = {
    show: function (_a) {
        var message = _a.message, date = _a.date, level = _a.level;
        return "".concat(showDate.show(date), " | ").concat(level, " | ").concat(message);
    }
};
/**
 * @internal
 */
var toErrorMsg = function (err) { return String(err.message); };
exports.toErrorMsg = toErrorMsg;
/**
 * @category instances
 * @since 0.6.0
 */
exports.Logger = {
    debug: function (message) { return (0, function_1.pipe)(TE.fromTask((0, exports.debug)(message)), TE.mapLeft(exports.toErrorMsg)); },
    error: function (message) { return (0, function_1.pipe)(TE.fromTask((0, exports.error)(message)), TE.mapLeft(exports.toErrorMsg)); },
    info: function (message) { return (0, function_1.pipe)(TE.fromTask((0, exports.info)(message)), TE.mapLeft(exports.toErrorMsg)); }
};
