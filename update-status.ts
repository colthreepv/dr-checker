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



export async function compareStatusAndNotify (previousStatus: Status, newStatus: Status) {
  let isChanged = false
  for (const project in previousStatus) {
    for (const tag in previousStatus[project]) {
      if (newStatus[project][tag] === previousStatus[project][tag]) continue
      isChanged = true
      // if ()
    }
  }

  return isChanged
}
