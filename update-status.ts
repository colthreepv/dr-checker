import { configBP, ConfigByProject } from './config'
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

// config is useful especially for testing
export async function compareStatusAndNotify (
  previousStatus: Status,
  newStatus: Status,
  config?: ConfigByProject
) {
  const notificationArray: request.RequestPromise[] = []
  if (config == null) config = configBP

  for (const project in previousStatus) {
    if (config[project] == null) continue

    for (const tag in previousStatus[project]) {
      if (newStatus[project][tag] === previousStatus[project][tag]) continue

      // in case there are no notification settings specified
      if (config[project][tag] == null) continue

      const notificationConf = config[project][tag]
      if (typeof notificationConf === 'string') {
        notificationArray.push(request.post(notificationConf))
      } else {
        notificationArray.push(request(notificationConf))
      }
    }
  }

  return Promise.all(notificationArray)
}
