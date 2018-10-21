import * as request from 'request-promise-native'
import { config } from './config'
import { Status } from './update-status'

const TOKEN_URL = 'https://auth.docker.io/token'
const REGISTRY_URL = 'https://registry-1.docker.io/v2/'

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
  history: any[]
}

export function tokenGenerator (project: string) {
  const ACTION = 'Token Generation'
  const queryParams = {
    service: 'registry.docker.io',
    scope: `repository:${ project }:pull`
  }
  const dockerRequest = request.get(TOKEN_URL, { qs: queryParams, json: true })
  const tokenPromise = dockerRequest.then((data: DockerToken) => data.token)

  dockerRequest.catch((err) => {
    console.error(ACTION, 'failed with error:', err)
  })

  return tokenPromise
}

// retrieves manifest from the docker image, with all the layers hashes
export function retrieveManifest (tokenP: Promise<string>, project: string, tag: string): Promise<DockerManifest> {
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

// compares new image layer hashes to the saved ones, returns a Status
function checkImageHashChange (lastHash: string, currentHash: string): Status {}

// loops over config.image and checks manifests and compares for each one
// ultimately producing a Status
function checkAllImages (config: Config) {}


