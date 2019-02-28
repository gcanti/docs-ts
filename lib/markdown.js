"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var prettier = require("prettier");
var parser_1 = require("./parser");
var path = require("path");
var Validation_1 = require("fp-ts/lib/Validation");
var CRLF = '\n\n';
var h1 = function (title) { return "# " + title; };
var h2 = function (title) { return "## " + title; };
var fence = function (language) { return function (code) { return '```' + language + '\n' + code + '\n' + '```'; }; };
var code = function (code) { return '`' + code + '`'; };
var link = function (text, href) { return "[" + text + "](" + href + ")"; };
var ts = fence('ts');
var bold = function (code) { return '**' + code + '**'; };
var strike = function (text) { return '~~' + text + '~~'; };
var linkRe = /{@link\s+(.*?)}/g;
function parseLink(s) {
    var m = s.match(linkRe);
    if (m === null) {
        return Validation_1.failure(["Invalid link " + JSON.stringify(s)]);
    }
    else {
        return Validation_1.success(m);
    }
}
exports.parseLink = parseLink;
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
    var s = h1(handleDeprecated(i.name, i.deprecated));
    s += printDescription(i.description);
    s += printSignature(i.signature, 'interface');
    s += printExample(i.example);
    s += printSince(i.since);
    s += CRLF;
    return s;
}
function printTypeAlias(ta) {
    var s = h1(handleDeprecated(ta.name, ta.deprecated));
    s += printDescription(ta.description);
    s += printSignature(ta.signature, 'type alias');
    s += printExample(ta.example);
    s += printSince(ta.since);
    s += CRLF;
    return s;
}
function printConstant(c) {
    var s = h1(handleDeprecated(c.name, c.deprecated));
    s += printDescription(c.description);
    s += printSignature(c.signature, 'constant');
    s += printExample(c.example);
    s += printSince(c.since);
    s += CRLF;
    return s;
}
function printFunction(f) {
    var s = h1(handleDeprecated(f.name, f.deprecated));
    s += printDescription(f.description);
    s += printSignatures(f.signatures, 'function');
    s += printExample(f.example);
    s += printSince(f.since);
    s += CRLF;
    return s;
}
function printSignature(signature, type) {
    return CRLF + bold('Signature') + (" (" + type + ")") + CRLF + ts(signature);
}
function printSignatures(signature, type) {
    return CRLF + bold('Signature') + (" (" + type + ")") + CRLF + ts(signature.join('\n'));
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
function printMethod(m) {
    var s = h2(handleDeprecated(m.name, m.deprecated));
    s += printDescription(m.description);
    s += printSignatures(m.signatures, 'method');
    s += printExample(m.example);
    s += printSince(m.since);
    s += CRLF;
    return s;
}
function printClass(c) {
    var s = h1(handleDeprecated(c.name, c.deprecated));
    s += printDescription(c.description);
    s += printSignature(c.signature, 'class');
    s += printExample(c.example);
    s += printSince(c.since);
    s += CRLF;
    s += c.staticMethods.map(printMethod).join(CRLF);
    s += c.methods.map(printMethod).join(CRLF);
    s += CRLF;
    return s;
}
function doctoc() {
    return "\n\n<!-- START doctoc -->\n<!-- END doctoc -->\n\n";
}
function printHeader(title, order) {
    var s = '---\n';
    s += "title: " + title + "\n";
    s += "nav_order: " + order + "\n";
    s += '---\n\n';
    return s;
}
exports.printHeader = printHeader;
function printNode(node) {
    return prettier.format(parser_1.fold(node, function (_, children) {
        return (children
            .map(function (name) {
            var isIndex = path.parse(name).ext === '';
            return isIndex
                ? '- ' + link(code(name) + ' directory', './' + name + '/' + 'index.md')
                : '- ' + link(code(name) + ' file', './' + name + '.md');
        })
            .join('\n') + '\n');
    }, function (_p, description, interfaces, typeAliases, functions, classes, constants) {
        return (doctoc() +
            printModuleDescription(description) +
            interfaces.map(function (i) { return printInterface(i); }).join('') +
            typeAliases.map(function (i) { return printTypeAlias(i); }).join('') +
            classes.map(function (c) { return printClass(c); }).join('') +
            constants.map(function (c) { return printConstant(c); }).join('') +
            functions.map(function (f) { return printFunction(f); }).join(''));
    }), prettierOptions);
}
exports.printNode = printNode;
