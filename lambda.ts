import { config } from './config'
import { Lambda } from 'aws-sdk'

export function updateFunctionConfiguration (status: string) {
  const appPrefix = config.appEnv === 'dev' ? '-dev' : ''
  const functionName = `dr-checker${ appPrefix }-`

  const lambda = new Lambda({ region: 'eu-central-1' })
  const params: Lambda.UpdateFunctionConfigurationRequest = {
    FunctionName: functionName + 'manifestHandler',
    Environment: {
      Variables: {
        UPDATE_STATUS: status
      }
    } as Lambda.Environment
  }
  const updateConfigRequest = lambda.updateFunctionConfiguration(params).promise()
  updateConfigRequest.then(resp => console.log('updateConfig', resp))

  return updateConfigRequest
}
