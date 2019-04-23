import { Lambda, Config } from 'aws-sdk'
import { promisify } from 'util'
import { constants as ZlibConstants, gunzip, gzip, InputType, ZlibOptions } from 'zlib'

import { Status } from './update-status'

const gunzipAsync = promisify<InputType, Buffer>(gunzip)
const gzipAsync = promisify<InputType, ZlibOptions, Buffer>(gzip)

const { STAGE, AWS_REGION } = process.env
const BASE_NAME = 'registry-notify'
const FUNCTION_NAME = 'loop'

export function updateFunctionConfiguration (status: string) {
  const functionName = `${ BASE_NAME }-${ STAGE }-${ FUNCTION_NAME }`

  const lambda = new Lambda({
    region: AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  })

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

export async function zipStatus (status: Status): Promise<string> {
  const statusToString = JSON.stringify(status)
  const options: ZlibOptions = { level: ZlibConstants.Z_BEST_COMPRESSION }

  const gzipStatus = await gzipAsync(statusToString, options)
  return gzipStatus.toString('base64')
}

export async function saveUpdateStatus (status: Status) {
  const gzipStatus = await zipStatus(status)
  return updateFunctionConfiguration(gzipStatus)
}
