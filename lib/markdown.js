"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var prettier = require("prettier");
var parser_1 = require("./parser");
var path = require("path");
exports.CRLF = '\n\n';
exports.h1 = function (title) { return "# " + title; };
exports.h2 = function (title) { return "## " + title; };
exports.h3 = function (title) { return "### " + title; };
exports.fence = function (language) { return function (code) { return '```' + language + '\n' + code + '\n' + '```'; }; };
exports.code = function (code) { return '`' + code + '`'; };
exports.link = function (text, href) { return "[" + text + "](" + href + ")"; };
exports.ts = exports.fence('ts');
exports.italic = function (code) { return '*' + code + '*'; };
exports.bold = function (code) { return '**' + code + '**'; };
exports.strike = function (text) { return '~~' + text + '~~'; };
var prettierOptions = {
    parser: 'markdown',
    semi: false,
    singleQuote: true,
    printWidth: 120
};
function header(title, order) {
    var s = '---\n';
    s += "title: " + title + "\n";
    s += "nav_order: " + order + "\n";
    s += '---\n\n';
    return s;
}
exports.header = header;
function handleDeprecated(s, deprecated) {
    return deprecated ? exports.strike(s) + ' (deprecated)' : s;
}
function printInterface(i) {
    var s = exports.h1(handleDeprecated(i.name, i.deprecated));
    s += printDescription(i.description);
    s += printSignature(i.signature, 'interface');
    s += printSince(i.since);
    s += exports.CRLF;
    return s;
}
function printTypeAlias(ta) {
    var s = exports.h1(handleDeprecated(ta.name, ta.deprecated));
    s += printDescription(ta.description);
    s += printSignature(ta.signature, 'type alias');
    s += printSince(ta.since);
    s += exports.CRLF;
    return s;
}
function printFunction(f) {
    var s = exports.h1(handleDeprecated(f.name, f.deprecated));
    s += printDescription(f.description);
    s += printSignatures(f.signatures, 'function');
    s += printExample(f.example);
    s += printSince(f.since);
    s += exports.CRLF;
    return s;
}
function printSignature(signature, type) {
    return exports.CRLF + exports.bold('Signature') + (" (" + type + ")") + exports.CRLF + exports.ts(signature);
}
function printSignatures(signature, type) {
    return exports.CRLF + exports.bold('Signature') + (" (" + type + ")") + exports.CRLF + exports.ts(signature.join('\n'));
}
function printDescription(description) {
    return description.fold('', function (s) { return exports.CRLF + s; });
}
function printExample(example) {
    return example.fold('', function (s) { return exports.CRLF + exports.bold('Example') + exports.CRLF + exports.ts(s); });
}
function printSince(since) {
    return since.fold('', function (s) { return exports.CRLF + ("Added in v" + s); });
}
function printMethod(m) {
    var s = exports.h2(handleDeprecated(m.name, m.deprecated));
    s += printDescription(m.description);
    s += printSignatures(m.signatures, 'method');
    s += printExample(m.example);
    s += printSince(m.since);
    s += exports.CRLF;
    return s;
}
function printClass(c) {
    var s = exports.h1(handleDeprecated(c.name, c.deprecated));
    s += printDescription(c.description);
    s += printSignature(c.signature, 'class');
    s += printExample(c.example);
    s += printSince(c.since);
    s += exports.CRLF;
    s += c.staticMethods.map(printMethod).join(exports.CRLF);
    s += c.methods.map(printMethod).join(exports.CRLF);
    s += exports.CRLF;
    return s;
}
function doctoc() {
    return "Table of Contents\n\n<!-- START doctoc -->\n<!-- END doctoc -->\n";
}
function run(node) {
    return prettier.format(parser_1.fold(node, function (_, children) {
        return (children
            .map(function (name) {
            var isIndex = path.parse(name).ext === '';
            return isIndex
                ? '- ' + exports.link(exports.code(name) + ' directory', './' + name + '/' + 'index.md')
                : '- ' + exports.link(exports.code(name) + ' file', './' + name + '.md');
        })
            .join('\n') + '\n');
    }, function (_p, interfaces, typeAliases, functions, classes) {
        return (doctoc() +
            interfaces.map(function (i) { return printInterface(i); }).join('') +
            typeAliases.map(function (i) { return printTypeAlias(i); }).join('') +
            classes.map(function (c) { return printClass(c); }).join('') +
            functions.map(function (f) { return printFunction(f); }).join(''));
    }), prettierOptions);
}
exports.run = run;
