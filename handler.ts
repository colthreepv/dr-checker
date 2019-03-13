import { Context, APIGatewayProxyResult } from 'aws-lambda'

import { config } from './config'
import { checkAllImages } from './docker-registry'
import { retrieveUpdateStatus, saveUpdateStatus } from './lambda'
import { compareStatusAndNotify } from './update-status'

export async function checker (event: any, context: Context) {
  const previousStatus = await retrieveUpdateStatus()
  const newStatus = await checkAllImages(config, previousStatus)

  console.log('New Status:', newStatus)

  console.log('Old Status', previousStatus)

  const notifications = await compareStatusAndNotify(previousStatus, newStatus)

  await saveUpdateStatus(newStatus)
  .catch(err => {
    if (err.code === 'ResourceNotFoundException') {
      console.warn('Trying to update the function did not succeed. Have you deployed this lambda?')
    } else {
      console.log('Update Status has failed with error:', err.message)
    }
  })

  return {
    statusCode: 200,
    body: JSON.stringify({
      changes: 'TO BE DONE',
      notifications
    })
  } as APIGatewayProxyResult
}
