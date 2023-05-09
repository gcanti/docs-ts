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
exports.showMarkdown = exports.monoidMarkdown = exports.semigroupMarkdown = exports.printModule = exports.printTypeAlias = exports.printInterface = exports.printFunction = exports.printExport = exports.printConstant = exports.printClass = exports.fold = exports.Strikethrough = exports.PlainTexts = exports.PlainText = exports.Paragraph = exports.Newline = exports.Header = exports.Fence = exports.Bold = void 0;
var Foldable_1 = require("fp-ts/Foldable");
var function_1 = require("fp-ts/function");
var M = require("fp-ts/Monoid");
var O = require("fp-ts/Option");
var RA = require("fp-ts/ReadonlyArray");
var RNEA = require("fp-ts/ReadonlyNonEmptyArray");
var RR = require("fp-ts/ReadonlyRecord");
var S = require("fp-ts/string");
var prettier = require("prettier");
// eslint-disable-next-line @typescript-eslint/no-var-requires
var toc = require('markdown-toc');
// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------
/**
 * @category constructors
 * @since 0.6.0
 */
var Bold = function (content) { return ({
    _tag: 'Bold',
    content: content
}); };
exports.Bold = Bold;
/**
 * @category constructors
 * @since 0.6.0
 */
var Fence = function (language, content) { return ({
    _tag: 'Fence',
    language: language,
    content: content
}); };
exports.Fence = Fence;
/**
 * @category constructors
 * @since 0.6.0
 */
var Header = function (level, content) { return ({
    _tag: 'Header',
    level: level,
    content: content
}); };
exports.Header = Header;
/**
 * @category constructors
 * @since 0.6.0
 */
exports.Newline = {
    _tag: 'Newline'
};
/**
 * @category constructors
 * @since 0.6.0
 */
var Paragraph = function (content) { return ({
    _tag: 'Paragraph',
    content: content
}); };
exports.Paragraph = Paragraph;
/**
 * @category constructors
 * @since 0.6.0
 */
var PlainText = function (content) { return ({
    _tag: 'PlainText',
    content: content
}); };
exports.PlainText = PlainText;
/**
 * @category constructors
 * @since 0.6.0
 */
var PlainTexts = function (content) { return ({
    _tag: 'PlainTexts',
    content: content
}); };
exports.PlainTexts = PlainTexts;
/**
 * @category constructors
 * @since 0.6.0
 */
var Strikethrough = function (content) { return ({
    _tag: 'Strikethrough',
    content: content
}); };
exports.Strikethrough = Strikethrough;
// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------
/**
 * @category destructors
 * @since 0.6.0
 */
var fold = function (patterns) {
    var f = function (x) {
        switch (x._tag) {
            case 'Bold':
                return patterns.Bold(x.content);
            case 'Fence':
                return patterns.Fence(x.language, x.content);
            case 'Header':
                return patterns.Header(x.level, x.content);
            case 'Newline':
                return patterns.Newline();
            case 'Paragraph':
                return patterns.Paragraph(x.content);
            case 'PlainText':
                return patterns.PlainText(x.content);
            case 'PlainTexts':
                return patterns.PlainTexts(x.content);
            case 'Strikethrough':
                return patterns.Strikethrough(x.content);
            default:
                return (0, function_1.absurd)(x);
        }
    };
    return f;
};
exports.fold = fold;
// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------
var foldS = M.concatAll(S.Monoid);
var foldMarkdown = function (as) { return (0, function_1.pipe)(as, M.concatAll(exports.monoidMarkdown)); };
var CRLF = (0, exports.PlainTexts)(RA.replicate(2, exports.Newline));
var intercalateCRLF = function (xs) { return (0, Foldable_1.intercalate)(exports.monoidMarkdown, RA.Foldable)(CRLF, xs); };
var intercalateNewline = function (xs) { return (0, Foldable_1.intercalate)(S.Monoid, RA.Foldable)('\n', xs); };
var h1 = function (content) { return (0, exports.Header)(1, content); };
var h2 = function (content) { return (0, exports.Header)(2, content); };
var h3 = function (content) { return (0, exports.Header)(3, content); };
var ts = function (code) { return (0, exports.Fence)('ts', (0, exports.PlainText)(code)); };
var since = O.fold(function () { return exports.monoidMarkdown.empty; }, function (v) { return foldMarkdown([CRLF, (0, exports.PlainText)("Added in v".concat(v))]); });
var title = function (s, deprecated, type) {
    var title = s.trim() === 'hasOwnProperty' ? "".concat(s, " (function)") : s;
    var markdownTitle = deprecated ? (0, exports.Strikethrough)((0, exports.PlainText)(title)) : (0, exports.PlainText)(title);
    return (0, function_1.pipe)(O.fromNullable(type), O.fold(function () { return markdownTitle; }, function (t) { return foldMarkdown([markdownTitle, (0, exports.PlainText)(" ".concat(t))]); }));
};
var description = (0, function_1.flow)(O.fold(function () { return exports.monoidMarkdown.empty; }, exports.PlainText), exports.Paragraph);
var signature = function (s) {
    return (0, function_1.pipe)(RA.of(ts(s)), RA.prepend((0, exports.Paragraph)((0, exports.Bold)((0, exports.PlainText)('Signature')))), foldMarkdown);
};
var signatures = function (ss) {
    return (0, function_1.pipe)(RA.of(ts(intercalateNewline(ss))), RA.prepend((0, exports.Paragraph)((0, exports.Bold)((0, exports.PlainText)('Signature')))), foldMarkdown);
};
var examples = (0, function_1.flow)(RA.map(function (code) { return (0, function_1.pipe)(RA.of(ts(code)), RA.prepend((0, exports.Bold)((0, exports.PlainText)('Example'))), intercalateCRLF); }), intercalateCRLF);
var staticMethod = function (m) {
    return (0, exports.Paragraph)(foldMarkdown([
        h3(title(m.name, m.deprecated, '(static method)')),
        description(m.description),
        signatures(m.signatures),
        examples(m.examples),
        since(m.since)
    ]));
};
var method = function (m) {
    return (0, exports.Paragraph)(foldMarkdown([
        h3(title(m.name, m.deprecated, '(method)')),
        description(m.description),
        signatures(m.signatures),
        examples(m.examples),
        since(m.since)
    ]));
};
var propertyToMarkdown = function (p) {
    return (0, exports.Paragraph)(foldMarkdown([
        h3(title(p.name, p.deprecated, '(property)')),
        description(p.description),
        signature(p.signature),
        examples(p.examples),
        since(p.since)
    ]));
};
var staticMethods = (0, function_1.flow)(RA.map(staticMethod), intercalateCRLF);
var methods = (0, function_1.flow)(RA.map(method), intercalateCRLF);
var properties = (0, function_1.flow)(RA.map(propertyToMarkdown), intercalateCRLF);
var moduleDescription = function (m) {
    return (0, exports.Paragraph)(foldMarkdown([
        (0, exports.Paragraph)(h2(title(m.name, m.deprecated, 'overview'))),
        description(m.description),
        examples(m.examples),
        since(m.since)
    ]));
};
var meta = function (title, order) {
    return (0, exports.Paragraph)(foldMarkdown([
        (0, exports.PlainText)('---'),
        exports.Newline,
        (0, exports.PlainText)("title: ".concat(title)),
        exports.Newline,
        (0, exports.PlainText)("nav_order: ".concat(order)),
        exports.Newline,
        (0, exports.PlainText)("parent: Modules"),
        exports.Newline,
        (0, exports.PlainText)('---')
    ]));
};
var fromClass = function (c) {
    return (0, exports.Paragraph)(foldMarkdown([
        (0, exports.Paragraph)(foldMarkdown([
            h2(title(c.name, c.deprecated, '(class)')),
            description(c.description),
            signature(c.signature),
            examples(c.examples),
            since(c.since)
        ])),
        staticMethods(c.staticMethods),
        methods(c.methods),
        properties(c.properties)
    ]));
};
var fromConstant = function (c) {
    return (0, exports.Paragraph)(foldMarkdown([
        h2(title(c.name, c.deprecated)),
        description(c.description),
        signature(c.signature),
        examples(c.examples),
        since(c.since)
    ]));
};
var fromExport = function (e) {
    return (0, exports.Paragraph)(foldMarkdown([
        h2(title(e.name, e.deprecated)),
        description(e.description),
        signature(e.signature),
        examples(e.examples),
        since(e.since)
    ]));
};
var fromFunction = function (f) {
    return (0, exports.Paragraph)(foldMarkdown([
        h2(title(f.name, f.deprecated)),
        description(f.description),
        signatures(f.signatures),
        examples(f.examples),
        since(f.since)
    ]));
};
var fromInterface = function (i) {
    return (0, exports.Paragraph)(foldMarkdown([
        h2(title(i.name, i.deprecated, '(interface)')),
        description(i.description),
        signature(i.signature),
        examples(i.examples),
        since(i.since)
    ]));
};
var fromTypeAlias = function (ta) {
    return (0, exports.Paragraph)(foldMarkdown([
        h2(title(ta.name, ta.deprecated, '(type alias)')),
        description(ta.description),
        signature(ta.signature),
        examples(ta.examples),
        since(ta.since)
    ]));
};
var fromPrintable = function (p) {
    switch (p._tag) {
        case 'Class':
            return fromClass(p);
        case 'Constant':
            return fromConstant(p);
        case 'Export':
            return fromExport(p);
        case 'Function':
            return fromFunction(p);
        case 'Interface':
            return fromInterface(p);
        case 'TypeAlias':
            return fromTypeAlias(p);
        default:
            return (0, function_1.absurd)(p);
    }
};
// -------------------------------------------------------------------------------------
// printers
// -------------------------------------------------------------------------------------
var getPrintables = function (module) {
    return (0, function_1.pipe)(M.concatAll(RA.getMonoid())([
        module.classes,
        module.constants,
        module.exports,
        module.functions,
        module.interfaces,
        module.typeAliases
    ]), RNEA.fromReadonlyArray);
};
/**
 * @category printers
 * @since 0.6.0
 */
var printClass = function (c) { return (0, function_1.pipe)(fromClass(c), exports.showMarkdown.show); };
exports.printClass = printClass;
/**
 * @category printers
 * @since 0.6.0
 */
var printConstant = function (c) { return (0, function_1.pipe)(fromConstant(c), exports.showMarkdown.show); };
exports.printConstant = printConstant;
/**
 * @category printers
 * @since 0.6.0
 */
var printExport = function (e) { return (0, function_1.pipe)(fromExport(e), exports.showMarkdown.show); };
exports.printExport = printExport;
/**
 * @category printers
 * @since 0.6.0
 */
var printFunction = function (f) { return (0, function_1.pipe)(fromFunction(f), exports.showMarkdown.show); };
exports.printFunction = printFunction;
/**
 * @category printers
 * @since 0.6.0
 */
var printInterface = function (i) { return (0, function_1.pipe)(fromInterface(i), exports.showMarkdown.show); };
exports.printInterface = printInterface;
/**
 * @category printers
 * @since 0.6.0
 */
var printTypeAlias = function (f) { return (0, function_1.pipe)(fromTypeAlias(f), exports.showMarkdown.show); };
exports.printTypeAlias = printTypeAlias;
/**
 * @category printers
 * @since 0.6.0
 */
var printModule = function (module, order) {
    var DEFAULT_CATEGORY = 'utils';
    var header = (0, function_1.pipe)(meta(module.path.slice(1).join('/'), order), exports.showMarkdown.show);
    var description = (0, function_1.pipe)((0, exports.Paragraph)(moduleDescription(module)), exports.showMarkdown.show);
    var content = (0, function_1.pipe)(getPrintables(module), O.map((0, function_1.flow)(RNEA.groupBy(function (_a) {
        var category = _a.category;
        return (0, function_1.pipe)(category, O.getOrElse(function () { return DEFAULT_CATEGORY; }));
    }), RR.collect(S.Ord)(function (category, printables) {
        var title = (0, function_1.pipe)(h1((0, exports.PlainText)(category)), exports.showMarkdown.show);
        var documentation = (0, function_1.pipe)(printables, RA.map((0, function_1.flow)(fromPrintable, exports.showMarkdown.show)), RA.sort(S.Ord), intercalateNewline);
        return intercalateNewline([title, documentation]);
    }), RA.sort(S.Ord), intercalateNewline)), O.getOrElse(function () { return ''; }));
    var tableOfContents = function (c) {
        return (0, function_1.pipe)((0, exports.Paragraph)(foldMarkdown([(0, exports.Paragraph)((0, exports.PlainText)('<h2 class="text-delta">Table of contents</h2>')), (0, exports.PlainText)(toc(c).content)])), exports.showMarkdown.show);
    };
    return (0, function_1.pipe)(intercalateNewline([header, description, '---\n', tableOfContents(content), '---\n', content]), prettify);
};
exports.printModule = printModule;
// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------
/**
 * @category instances
 * @since 0.6.0
 */
exports.semigroupMarkdown = {
    concat: function (x, y) { return (0, exports.PlainTexts)([x, y]); }
};
/**
 * @category instances
 * @since 0.6.0
 */
exports.monoidMarkdown = __assign(__assign({}, exports.semigroupMarkdown), { empty: (0, exports.PlainText)('') });
var prettierOptions = {
    parser: 'markdown',
    semi: false,
    singleQuote: true,
    printWidth: 120
};
var prettify = function (s) { return prettier.format(s, prettierOptions); };
var canonicalizeMarkdown = RA.filterMap(function (markdown) {
    return (0, function_1.pipe)(markdown, (0, exports.fold)({
        Bold: function () { return O.some(markdown); },
        Header: function () { return O.some(markdown); },
        Fence: function () { return O.some(markdown); },
        Newline: function () { return O.some(markdown); },
        Paragraph: function () { return O.some(markdown); },
        PlainText: function (content) { return (content.length > 0 ? O.some(markdown) : O.none); },
        PlainTexts: function (content) { return O.some((0, exports.PlainTexts)(canonicalizeMarkdown(content))); },
        Strikethrough: function () { return O.some(markdown); }
    }));
});
var markdownToString = (0, exports.fold)({
    Bold: function (content) { return foldS(['**', markdownToString(content), '**']); },
    Header: function (level, content) { return foldS(['\n', foldS(RA.replicate(level, '#')), ' ', markdownToString(content), '\n\n']); },
    Fence: function (language, content) { return foldS(['```', language, '\n', markdownToString(content), '\n', '```\n\n']); },
    Newline: function () { return '\n'; },
    Paragraph: function (content) { return foldS([markdownToString(content), '\n\n']); },
    PlainText: function (content) { return content; },
    PlainTexts: function (content) { return (0, function_1.pipe)(content, canonicalizeMarkdown, RA.map(markdownToString), foldS); },
    Strikethrough: function (content) { return foldS(['~~', markdownToString(content), '~~']); }
});
/**
 * @category instances
 * @since 0.6.0
 */
exports.showMarkdown = {
    show: (0, function_1.flow)(markdownToString, prettify)
};
