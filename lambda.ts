import { Lambda } from 'aws-sdk'
import { promisify } from 'util'
import { constants as ZlibConstants, gunzip, gzip, InputType, ZlibOptions } from 'zlib'

import { Status } from './update-status'

const gunzipAsync = promisify<InputType, Buffer>(gunzip)

const { STAGE, AWS_REGION } = process.env
const BASE_NAME = 'registry-notify'

export function updateFunctionConfiguration (status: string) {
  const functionName = `${ BASE_NAME }-${ STAGE }`

  const lambda = new Lambda({ region: AWS_REGION })
  const params: Lambda.UpdateFunctionConfigurationRequest = {
    FunctionName: functionName,
    Environment: {
      Variables: {
        UPDATE_STATUS: status
      }
    } as Lambda.Environment
  }
  const updateConfigRequest = lambda.updateFunctionConfiguration(params).promise()

  return updateConfigRequest
}

export async function retrieveUpdateStatus () {
  const { UPDATE_STATUS } = process.env
  if (UPDATE_STATUS == null || UPDATE_STATUS === '') return {} as Status

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
