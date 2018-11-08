import { Callback, Context, Handler } from 'aws-lambda'
import { constants as ZlibConstants, gzip, gunzip, ZlibOptions } from 'zlib'
import { retrieveManifest, tokenGenerator, checkAllImages } from './docker-registry'
import { Status } from './update-status'
import { updateFunctionConfiguration } from './lambda'
import { config } from './config'

interface HelloResponse {
  statusCode: number
  body: string
}

const PROJECT = 'library/node'
const TAG = '8'

function retrieveUpdateStatus () {
  if (process.env.UPDATE_STATUS === '') return Promise.resolve({} as Status)
  const UPDATE_STATUS = process.env.UPDATE_STATUS as string

  const updateStatusB64 = Buffer.from(UPDATE_STATUS, 'base64')
  const gunzipP: Promise<Buffer> = new Promise((resolve, reject) => {
    gunzip(updateStatusB64, (err, result) => {
      if (err != null) return reject(err)
      resolve(result)
    })
  })

  const updateStatusString = gunzipP.then(bufferStatus => JSON.parse(bufferStatus.toString()) as Status)
  return updateStatusString
}

function saveUpdateStatus (status: Status) {
  const statusToString = JSON.stringify(status)
  const options: ZlibOptions = { level: ZlibConstants.Z_BEST_COMPRESSION }

  const gzipP: Promise<Buffer> = new Promise((resolve, reject) => {
    gzip(statusToString, options, (err, result) => {
      if (err != null) return reject(err)
      resolve(result)
    })
  })

  const updateFunctionP = gzipP.then(gzipStatus => {
    const status = gzipStatus.toString('base64')
    return updateFunctionConfiguration(status)
  })

  return updateFunctionP
}

function manifestHandler (event: any, context: Context, callback: Callback) {
  const previousStatus = retrieveUpdateStatus()
  const newStatus = previousStatus.then(status => checkAllImages(config, status))

  const response: HelloResponse = {
    body: '',
    statusCode: 200
  }

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
