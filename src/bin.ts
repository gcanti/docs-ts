#!/usr/bin/env node

/**
 * @file bin file
 */

import { main } from '.'
import chalk from 'chalk'

// tslint:disable-next-line: no-console
main().catch(e => console.log(chalk.bold.red(`Unexpected error: ${e}`)))
