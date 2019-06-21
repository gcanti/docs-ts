#!/usr/bin/env node

/**
 * @file bin file
 */

import { main } from '.'

// tslint:disable-next-line: no-console
main().catch(e => console.log(`Unexpected error: ${e}`))
