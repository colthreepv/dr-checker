import { Handler, Context, Callback } from 'aws-lambda'

import { URL } from 'url'

import * as request from 'request-promise-native'

interface HelloResponse {
  statusCode: number
  body: string
}

interface DockerToken {
  token: string
  access_token: string
  expires_in: number
  /**
   * Example: 2018-10-18T17:22:55.893319601Z
   */
  issued_at: string
}

interface DockerManifest {
  schemaVersion: number
  /**
   * Example: 'library/node'
   */
  name: string
  /**
   * Example: '8'
   */
  tag: string
  /**
   * Example: 'amd64'
   */
  architecture: string
  /**
   * Example: [{ blobSum: 'sha256:a3ed95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b46d4' }]
   */
  fsLayers: { blobSum: string }[]
  /**
   * Not used for now
   */
  history: []
}

const URL_TOKENS = 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/node:pull'
const PROJECT = 'library/node'
const TAG = '8'

const TOKEN_URL = 'https://auth.docker.io/token'
const REGISTRY_URL = 'https://registry-1.docker.io/v2/'

function tokenGenerator (project: string = PROJECT) {
  const ACTION = 'Token Generation'
  const queryParams = {
    service: 'registry.docker.io',
    scope: `repository:${ PROJECT }:pull`,
  }
  const dockerRequest = request.get(TOKEN_URL, { qs: queryParams, json: true })
  const tokenPromise = dockerRequest.then((data: DockerToken) => data.token)

  dockerRequest.catch((err) => {
    console.error(ACTION, 'failed with error:', err)
  })

  return tokenPromise
}

function retrieveManifest (tokenP: Promise<string>, project: string = PROJECT, tag: string = TAG): Promise<DockerManifest> {
  const ACTION = 'Manifest Retrieval'
  const manifestURL = new URL(`${ project }/manifests/${ tag }`, REGISTRY_URL)
  const manifestRequest = tokenP.then((token) => {
    return request.get(manifestURL.toString(), { json: true, auth: { bearer: token } })
  })

  manifestRequest.catch((err) => {
    console.error(ACTION, 'failed with error:', err)
  })

  return manifestRequest
}

function manifestHandler (event: any, context: Context, callback: Callback) {
  const response: HelloResponse = {
    body: '',
    statusCode: 200
  }

  const manifestP = retrieveManifest(tokenGenerator())
  manifestP
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
