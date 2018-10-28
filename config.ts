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
   * url where to make a POST request in case the tag changed
   */
  url: string
}

export interface Config {
  image: Project[]
  region: string
  appEnv: 'dev' | 'prod'
}

export const config = require('./config') as Config
