export interface StatusLayer { [tag: string]: string }
export interface Status { [project: string]: StatusLayer }

/**
 * Example:
 * {
 *   'library/node': {
 *     '8': 'sha256:asdu12uasdugasjh11'
 *   }
 * }
 */
