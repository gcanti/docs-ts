/**
 * @since 0.8.0
 */
import * as Core from './Core'
import { run } from './Run'
import { FileSystem } from './FileSystem'
import { Logger } from './Logger'

/**
 * @category production
 * @since 0.8.0
 */
export const capabilities: Core.Capabilities = {
  run,
  fileSystem: FileSystem,
  logger: Logger,
  addFile: (file) => (project) => project.addSourceFileAtPath(file.path)
}
