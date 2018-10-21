import { Callback, Context, Handler } from 'aws-lambda'
import { constants as ZlibConstants, gzip, ZlibOptions } from 'zlib'
import { retrieveManifest, tokenGenerator } from './docker-registry'
import { Status } from './update-status'
import { updateFunctionConfiguration } from './lambda'

interface HelloResponse {
  statusCode: number
  body: string
}

const URL_TOKENS = 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/node:pull'
const PROJECT = 'library/node'
const TAG = '8'

function retrieveUpdateStatus () {
  const { UPDATE_STATUS } = process.env


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

  const { LAST_SHA } = process.env
  console.log('ALL ENV', process.env)
  const response: HelloResponse = {
    body: '',
    statusCode: 200
  }

  const manifestP = retrieveManifest(tokenGenerator(PROJECT), PROJECT, TAG)
  manifestP
    .then(manifest => {
      const lastLayer = manifest.fsLayers[manifest.fsLayers.length - 1]
      const manifestLastSHA = lastLayer.blobSum

      // In case last layer has changed, a function configuration update it's triggered
      // and then we return to normal flow returning from the promise a DockerManifest
      if (LAST_SHA !== manifestLastSHA) {
        return updateFunctionConfiguration(manifestLastSHA).then(() => manifest)
      }
      return manifest
    })
    .then(manifest => response.body = JSON.stringify(manifest))
    .catch(err => {
      response.body = err
      response.statusCode = 500
    })
    .then(() => callback(undefined, response))
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
