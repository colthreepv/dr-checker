import { configBP } from './config'
import * as request from 'request-promise-native'

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
  const notificationArray = []
  let isChanged = false
  for (const project in previousStatus) {
    for (const tag in previousStatus[project]) {
      if (newStatus[project][tag] === previousStatus[project][tag]) continue
      isChanged = true

      // in case there are no notification settings specified
      if (configBP[project][tag] == null) continue

      const notificationConf = configBP[project][tag]
      if (typeof notificationConf === 'string') {
        notificationArray.push(request.post(notificationConf))
      } else {
        notificationArray.push(request(notificationConf))
      }
    }
  }

  return notificationArray
}
