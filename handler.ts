import { Callback, Context, Handler } from 'aws-lambda'

import { config } from './config'
import { checkAllImages } from './docker-registry'
import { retrieveUpdateStatus, saveUpdateStatus } from './lambda'

interface HelloResponse {
  statusCode: number
  body: string
}

export async function checker (event: any, context: Context) {
  const previousStatus = await retrieveUpdateStatus()
  const newStatus = await checkAllImages(config, previousStatus)

  console.log('New Status:', newStatus)

  const response: HelloResponse = {
    body: JSON.stringify(newStatus),
    statusCode: 200
  }

  const updateOutcome = await saveUpdateStatus(newStatus)

  // console.log()

  return response
  // send notifications to the projects changed
  // newStatus.then(status => saveUpdateStatus)
}
