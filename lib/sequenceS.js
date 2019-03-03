"use strict";
/**
 * @file Internal helper
 */
Object.defineProperty(exports, "__esModule", { value: true });
function sequenceS(F) {
    return function (r) {
        var keys = Object.keys(r);
        var fst = keys[0];
        var others = keys.slice(1);
        var fr = F.map(r[fst], function (a) {
            var _a;
            return (_a = {}, _a[fst] = a, _a);
        });
        var _loop_1 = function (key) {
            fr = F.ap(F.map(fr, function (r) { return function (a) {
                r[key] = a;
                return r;
            }; }), r[key]);
        };
        for (var _i = 0, others_1 = others; _i < others_1.length; _i++) {
            var key = others_1[_i];
            _loop_1(key);
        }
        return fr;
    };
}
exports.sequenceS = sequenceS;
