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
export type Changes = { project: string, tag: string }[]

export async function notify (changes: Changes, config?: ConfigByProject) {
  if (config == null) config = configBP
  const requestOptions: request.RequestPromiseOptions = { resolveWithFullResponse: true }
  const notificationArray: request.RequestPromise<Response>[] = []

  for (const change of changes) {
    const { project, tag } = change

    // in case there are no notification settings specified
    if (config[project] == null) continue
    if (config[project][tag] == null) continue

    const notificationConf = config[project][tag]
    if (typeof notificationConf === 'string') {
      console.log('making request', 'string')
      notificationArray.push(request.post(notificationConf, requestOptions))
    } else {
      console.log('making request', 'object')
      const requestConfig = Object.assign({}, notificationConf, requestOptions)
      notificationArray.push(request(requestConfig))
    }
  }

  const notificationLog = notificationArray.map(async request => {
    const response = await request
    const origRequest = response.request
    return `${origRequest.method} ${origRequest.href} - ${response.statusCode}`
  })

  return Promise.all(notificationLog)
}

// config is useful especially for testing
export function whatChanged (previousStatus: Status, newStatus: Status): Changes {
  const changesArray: Changes = []

  // newStatus might have an higher cardinality compared to previousStatus
  for (const project in newStatus) {
    for (const tag in newStatus[project]) {
      if (
        // there is no previous state
        previousStatus[project] == null ||
        previousStatus[project][tag] == null ||
        // or is a different than actual
        previousStatus[project][tag] !== newStatus[project][tag]
      ) {
        changesArray.push({ project, tag })
      } else {
        continue
      }
    }
  }

  return changesArray
}
