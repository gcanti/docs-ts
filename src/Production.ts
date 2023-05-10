/**
 * @since 0.8.0
 */
import * as Core from './Core'
import { FileSystem } from './FileSystem'
import { Logger } from './Logger'
import { spawn } from './Spawn'

/**
 * @category production
 * @since 0.8.0
 */
export const capabilities: Core.Capabilities = {
  spawn: spawn,
  fileSystem: FileSystem,
  logger: Logger,
  addFile: (file) => (project) => project.addSourceFileAtPath(file.path)
}
