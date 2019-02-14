import { Callback, Context, Handler } from 'aws-lambda'

import { config } from './config'
import { checkAllImages } from './docker-registry'
import { retrieveUpdateStatus } from './lambda'

interface HelloResponse {
  statusCode: number
  body: string
}

async function manifestHandler (event: any, context: Context) {
  const previousStatus = await retrieveUpdateStatus()
  const newStatus = await checkAllImages(config, previousStatus)

  console.log('New Status:', newStatus)

  const response: HelloResponse = {
    body: JSON.stringify(newStatus),
    statusCode: 200
  }

  // console.log()

  return response
  // send notifications to the projects changed
  // newStatus.then(status => saveUpdateStatus)
}

const hello: Handler = (event: any, context: Context, callback: Callback) => {
  const response: HelloResponse = {
    statusCode: 200,
    body: JSON.stringify({
      message: Math.floor(Math.random() * 10)
    })
  }

  callback(undefined, response)
}

export { hello, manifestHandler }
