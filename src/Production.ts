/**
 * @since 0.8.0
 */
import * as Core from './Core'

/**
 * @category production
 * @since 0.8.0
 */
export const capabilities: Core.Capabilities = {
  addFile: (file) => (project) => project.addSourceFileAtPath(file.path)
}
