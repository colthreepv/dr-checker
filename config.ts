import { RequestPromiseOptions } from 'request-promise-native'

interface Project {
  /**
   * Example: library/node
   */
  repository: string
  /**
   * List of sensible tags, example: ['8', '10']
   */
  tags: string[]
  /**
   * simple usage: url where to make a POST request in case the tag changed
   */
  notification: string
  /**
   * advanced usage: request option, it gets eval()uated.
   * It can run take inside process.env values
   */
  notificationRequest: RequestPromiseOptions
}

export interface Config {
  images: Project[]
  region: string
  appEnv: 'dev' | 'prod'
}

// const config = require('../config.json') as Config
// console.log('diocaro', config)

// console.log('wtf?')
// config.images = config.images.map(image => {
//   if (image.notificationRequest == null) return image
//   console.log('notificationRequest', JSON.stringify(image.notificationRequest))


//   const evaluatedNotificationRequest = eval(JSON.stringify(image.notificationRequest))
//   console.log('evaluatedNotificationRequest', evaluatedNotificationRequest)
//   return image
// })

export const config = require('./.config.json') as Config
