import { Context } from 'aws-lambda'
import { AWSError } from 'aws-sdk'

import { config } from './config'
import { checkAllImages } from './docker-registry'
import { retrieveUpdateStatus, saveUpdateStatus } from './lambda'
import { compareStatusAndNotify } from './update-status'

interface HelloResponse {
  statusCode: number
  body: string
}

export async function checker (event: any, context: Context) {
  const previousStatus = await retrieveUpdateStatus()
  const newStatus = await checkAllImages(config, previousStatus)

  console.log('New Status:', newStatus)

  console.log('Old Status', previousStatus)

  const isChanged = await compareStatusAndNotify(previousStatus, newStatus)

  const response: HelloResponse = {
    body: JSON.stringify(newStatus),
    statusCode: 200
  }

  const updateOutcome = await saveUpdateStatus(newStatus)
  .catch(err => {
    if (err.code === 'ResourceNotFoundException') {
      console.warn('Trying to update the function did not succeed. Have you deployed this lambda?')
    } else {
      console.log('Update Status has failed with error:', err.message)
    }
  })

  // console.log()

  return response
  // send notifications to the projects changed
  // newStatus.then(status => saveUpdateStatus)
}
