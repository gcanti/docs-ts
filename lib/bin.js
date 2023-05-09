#!/usr/bin/env node
"use strict";
/**
 * CLI
 *
 * @since 0.2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
var chalk_1 = require("chalk");
var _1 = require(".");
(0, _1.main)().catch(function (e) {
    console.log(chalk_1.default.bold.red('Unexpected Error'));
    console.error(e);
    process.exit(1);
});
