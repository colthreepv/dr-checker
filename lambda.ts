import { Lambda } from 'aws-sdk'
import { promisify } from 'util'
import { constants as ZlibConstants, gunzip, gzip, InputType, ZlibOptions } from 'zlib'

import { config } from './config'
import { Status } from './update-status'

const gunzipAsync = promisify<InputType, Buffer>(gunzip)

export function updateFunctionConfiguration (status: string) {
  const appPrefix = config.appEnv === 'dev' ? '-dev' : ''
  const functionName = `dr-checker${ appPrefix }-`

  const lambda = new Lambda({ region: config.region })
  const params: Lambda.UpdateFunctionConfigurationRequest = {
    FunctionName: functionName + 'manifestHandler',
    Environment: {
      Variables: {
        UPDATE_STATUS: status
      }
    } as Lambda.Environment
  }
  const updateConfigRequest = lambda.updateFunctionConfiguration(params).promise()
  // updateConfigRequest.then(resp => console.log('updateConfig', resp))

  return updateConfigRequest
}

export async function retrieveUpdateStatus () {
  if (process.env.UPDATE_STATUS === '') return {} as Status
  const UPDATE_STATUS = process.env.UPDATE_STATUS as string

  const updateStatusB64 = Buffer.from(UPDATE_STATUS, 'base64')
  const status = await gunzipAsync(updateStatusB64)

  return JSON.parse(status.toString()) as Status
}

export async function saveUpdateStatus (status: Status) {
  const statusToString = JSON.stringify(status)
  const options: ZlibOptions = { level: ZlibConstants.Z_BEST_COMPRESSION }

  const gzipP: Promise<Buffer> = new Promise((resolve, reject) => {
    gzip(statusToString, options, (err, result) => {
      if (err != null) return reject(err)
      resolve(result)
    })
  })

  const gzipStatus = await gzipP
  const newStatus = gzipStatus.toString('base64')
  return updateFunctionConfiguration(newStatus)
}
