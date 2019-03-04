"use strict";
/**
 * @file markdown utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
var prettier = require("prettier");
var toc = require('markdown-toc');
var CRLF = '\n\n';
var h1 = function (title) { return "# " + title; };
var h2 = function (title) { return "## " + title; };
var fence = function (language) { return function (code) { return '```' + language + '\n' + code + '\n' + '```'; }; };
var ts = fence('ts');
var bold = function (code) { return '**' + code + '**'; };
var strike = function (text) { return '~~' + text + '~~'; };
var prettierOptions = {
    parser: 'markdown',
    semi: false,
    singleQuote: true,
    printWidth: 120
};
function handleDeprecated(s, deprecated) {
    return deprecated ? strike(s) : s;
}
function printInterface(i) {
    var s = h1(handleDeprecated(i.name, i.deprecated) + ' (interface)');
    s += printDescription(i.description);
    s += printSignature(i.signature);
    s += printExample(i.example);
    s += printSince(i.since);
    s += CRLF;
    return s;
}
function printTypeAlias(ta) {
    var s = h1(handleDeprecated(ta.name, ta.deprecated) + ' (type alias)');
    s += printDescription(ta.description);
    s += printSignature(ta.signature);
    s += printExample(ta.example);
    s += printSince(ta.since);
    s += CRLF;
    return s;
}
function printConstant(c) {
    var s = h1(handleDeprecated(c.name, c.deprecated) + ' (constant)');
    s += printDescription(c.description);
    s += printSignature(c.signature);
    s += printExample(c.example);
    s += printSince(c.since);
    s += CRLF;
    return s;
}
function printFunction(f) {
    var s = h1(handleDeprecated(f.name, f.deprecated) + ' (function)');
    s += printDescription(f.description);
    s += printSignatures(f.signatures);
    s += printExample(f.example);
    s += printSince(f.since);
    s += CRLF;
    return s;
}
function printExport(e) {
    var s = h1(handleDeprecated(e.name, e.deprecated) + ' (export)');
    s += printDescription(e.description);
    s += printSignature(e.signature);
    s += printExample(e.example);
    s += printSince(e.since);
    s += CRLF;
    return s;
}
function printMethod(m) {
    var s = h2(handleDeprecated(m.name, m.deprecated) + ' (method)');
    s += printDescription(m.description);
    s += printSignatures(m.signatures);
    s += printExample(m.example);
    s += printSince(m.since);
    s += CRLF;
    return s;
}
function printClass(c) {
    var s = h1(handleDeprecated(c.name, c.deprecated) + ' (class)');
    s += printDescription(c.description);
    s += printSignature(c.signature);
    s += printExample(c.example);
    s += printSince(c.since);
    s += CRLF;
    s += c.staticMethods.map(printMethod).join(CRLF);
    s += c.methods.map(printMethod).join(CRLF);
    s += CRLF;
    return s;
}
function printSignature(signature) {
    return CRLF + bold('Signature') + CRLF + ts(signature);
}
function printSignatures(signature) {
    return CRLF + bold('Signature') + CRLF + ts(signature.join('\n'));
}
function printDescription(description) {
    return description.fold('', function (s) { return CRLF + s; });
}
function printModuleDescription(description) {
    return description.fold('', function (s) { return CRLF + h1('Overview') + CRLF + s + CRLF; });
}
function printExample(example) {
    return example.fold('', function (s) { return CRLF + bold('Example') + CRLF + ts(s); });
}
function printSince(since) {
    return since.fold('', function (s) { return CRLF + ("Added in v" + s); });
}
function printHeader(title, order) {
    var s = '---\n';
    s += "title: " + title + "\n";
    s += "nav_order: " + order + "\n";
    s += "parent: Modules\n";
    s += '---\n\n';
    return s;
}
exports.printHeader = printHeader;
function printModule(module, counter) {
    var header = printHeader(module.path.slice(1).join('/'), counter);
    var md = CRLF +
        module.interfaces.map(function (i) { return printInterface(i); }).join('') +
        module.typeAliases.map(function (i) { return printTypeAlias(i); }).join('') +
        module.classes.map(function (c) { return printClass(c); }).join('') +
        module.constants.map(function (c) { return printConstant(c); }).join('') +
        module.functions.map(function (f) { return printFunction(f); }).join('') +
        module.exports.map(function (e) { return printExport(e); }).join('');
    var result = header +
        printModuleDescription(module.description) +
        CRLF +
        '---' +
        CRLF +
        '<h2 class="text-delta">Table of contents</h2>' +
        CRLF +
        toc(md).content +
        CRLF +
        '---' +
        CRLF +
        md;
    return prettier.format(result, prettierOptions);
}
exports.printModule = printModule;
