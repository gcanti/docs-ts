#!/usr/bin/env node

/**
 * CLI
 *
 * @since 0.2.0
 */

import { main } from '.'
import chalk from 'chalk'

main().catch((e) => {
  // tslint:disable-next-line: no-console
  console.log(chalk.bold.red('Unexpected Error'))
  // tslint:disable-next-line: no-console
  console.error(e)
  process.exit(1)
})
