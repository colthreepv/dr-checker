import { APIGatewayProxyResult, Context } from 'aws-lambda'

import { Config, getConf } from './config'
import { checkAllImages } from './docker-registry'
import { retrieveUpdateStatus, saveUpdateStatus } from './lambda'
import { notify, whatChanged } from './update-status'

export async function checker (providedConfig?: Config): Promise<APIGatewayProxyResult> {
  const { config, configBP } = getConf(providedConfig)
  const testMode = (providedConfig != null)
  const previousStatus = await retrieveUpdateStatus()
  const newStatus = await checkAllImages(config, previousStatus)

  // USEFUL FOR DEBUG
  // console.log('New Status:', newStatus)
  // console.log('Old Status', previousStatus)

  const changes = whatChanged(previousStatus, newStatus)
  const notifications = await notify(changes, configBP)

  if (testMode === false) {
    await saveUpdateStatus(newStatus)
    .catch(err => {
      if (err.code === 'ResourceNotFoundException') {
        console.warn('Trying to update the function did not succeed. Have you deployed this lambda?')
      } else {
        console.log('Update Status has failed with error:', err.message)
      }
    })
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ changes, notifications, status: newStatus })
  }
}

export async function registryNotify (event: any, context: Context, baseContext, finish) {
  return checker()
}
