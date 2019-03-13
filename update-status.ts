import { configBP, ConfigByProject } from './config'
import * as request from 'request-promise-native'
import { Response } from 'request'

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

/**
 * FIXME
 * Split this function in 2:
 * compareStatus -> returns an array of changes from status A to status B
 * notify(changes, config) -> acts on the array of changes
 */

// config is useful especially for testing
export async function compareStatusAndNotify (
  previousStatus: Status,
  newStatus: Status,
  config?: ConfigByProject
) {
  const requestOptions: request.RequestPromiseOptions = { resolveWithFullResponse: true }
  const notificationArray: request.RequestPromise<Response>[] = []
  if (config == null) config = configBP

  for (const project in previousStatus) {
    if (config[project] == null) continue

    for (const tag in previousStatus[project]) {
      if (newStatus[project][tag] === previousStatus[project][tag]) continue

      // in case there are no notification settings specified
      if (config[project][tag] == null) continue

      const notificationConf = config[project][tag]
      if (typeof notificationConf === 'string') {
        notificationArray.push(request.post(notificationConf, requestOptions))
      } else {
        const requestConfig = Object.assign({}, notificationConf, requestOptions)
        notificationArray.push(request(requestConfig))
      }
    }
  }

  const notificationLog = notificationArray.map(async request => {
    const response = await request
    const origRequest = response.request
    return `${origRequest.method} ${origRequest.href} - ${response.statusCode}`
  })

  return Promise.all(notificationLog)
}
