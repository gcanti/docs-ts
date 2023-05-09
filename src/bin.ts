#!/usr/bin/env node

/**
 * CLI
 *
 * @since 0.2.0
 */

import { main } from '.'
import chalk from 'chalk'

main().catch((e) => {
  console.log(chalk.bold.red('Unexpected Error'))
  console.error(e)
  process.exit(1)
})
