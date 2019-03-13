import { OptionsWithUrl } from 'request-promise-native'

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
  notificationRequest: OptionsWithUrl
}

export type Config = Project[]

export type ConfigByProject = { [project: string]: { [tag: string]: string | OptionsWithUrl } }
type TemplateVariables = { [key: string]: string }

// support function for compileNotificationSettings
function compileOrNot (value: string | Object, templateVariables: TemplateVariables) {
  let newVal: string | Object
  switch (typeof value) {
    case 'string': // interpolate value
      newVal = new Function('return `' + value + '`').call(templateVariables)
      break
    case 'object':
      newVal = compileNotificationSettings(value, templateVariables)
      break
    default:
      newVal = value
      break
  }
  return newVal
}

export function compileNotificationSettings (obj: any, templateVariables: TemplateVariables) {
  const newObject = {}

  if (Array.isArray(obj)) return obj.map(el => compileOrNot(el, templateVariables))

  for (const key in obj) {
    if (obj.hasOwnProperty(key) === false) continue

    const value = obj[key]
    newObject[key] = compileOrNot(value, templateVariables)
  }

  return newObject
}

function compileNotificationsConfig (config: Config): Config {
  const newImages = config.map(project => {
    if (project.notificationRequest != null) {
      return compileNotificationSettings(project.notificationRequest, process.env)
    }
    return project
  })
  return Object.assign({}, config, { images: newImages })
}

function configByProject (config: Config): ConfigByProject {
  if (Array.isArray(config) === false) return {}

  return config.reduce((hash, image) => {
    if (hash[image.repository] == null) hash[image.repository] = {}

    if (Array.isArray(image.tags) === true) {
      image.tags.forEach(tag => {
        hash[image.repository][tag] = image.notification || image.notificationRequest
      })
    } else {
      hash[image.repository][image.tags] = image.notification || image.notificationRequest
    }

    return hash
  }, {})
}

const jsonConfig = require('./.config.json') as Config
export const config = compileNotificationsConfig(jsonConfig)
export const configBP = configByProject(config)
