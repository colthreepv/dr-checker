interface Project {
  repository: string
  tags: string[]
  url: string
}

interface Config {
  image: Project[]
  region: string
  appEnv: 'dev' | 'prod'
}

export const config = require('./config') as Config
