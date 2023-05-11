/**
 * @since 0.8.0
 */
import * as Core from './Core'
import { spawn } from './Spawn'

/**
 * @category production
 * @since 0.8.0
 */
export const capabilities: Core.Capabilities = {
  spawn: spawn,
  addFile: (file) => (project) => project.addSourceFileAtPath(file.path)
}
