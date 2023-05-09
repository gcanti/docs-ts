#!/usr/bin/env node

/**
 * CLI
 *
 * @since 0.2.0
 */

import chalk from 'chalk'

import { main } from '.'

main().catch((e) => {
  console.log(chalk.bold.red('Unexpected Error'))
  console.error(e)
  process.exit(1)
})
