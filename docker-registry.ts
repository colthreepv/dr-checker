import promiseLimit from 'promise-limit'
import * as request from 'request-promise-native'
import { Config } from './config'
import { StatusLayer, Status } from './update-status'
import { URL } from 'url'

const TOKEN_URL = 'https://auth.docker.io/token'
const REGISTRY_URL = 'https://registry-1.docker.io/v2/'

const MAX_CONCURRENT_MANIFEST_REQUESTS = 2

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

const tokenBank: { [key: string]: { token: string, expiry: Date } } = {}

export function tokenGenerator (project: string) {
  // fast return in case token it's in bank
  if (tokenBank[project] != null) {
    const nowDate = new Date()
    if (nowDate < tokenBank[project].expiry) return Promise.resolve(tokenBank[project].token)
  }

  const ACTION = 'Token Generation'
  const queryParams = {
    service: 'registry.docker.io',
    scope: `repository:${ project }:pull`
  }
  const dockerRequest = request.get(TOKEN_URL, { qs: queryParams, json: true })
  // banks the token
  dockerRequest.then((data: DockerToken) => {
    const expiryDate = new Date()
    expiryDate.setUTCSeconds(expiryDate.getUTCSeconds() + data.expires_in)

    tokenBank[project] = {
      token: data.token,
      expiry: expiryDate
    }
  })

  const tokenPromise = dockerRequest.then((data: DockerToken) => data.token)

  dockerRequest.catch((err) => {
    console.error(ACTION, 'failed with error:', err)
  })

  return tokenPromise
}

// retrieves manifest from the docker image, with all the layers hashes
export function retrieveManifest (token: string | Promise<string>, project: string, tag: string): Promise<DockerManifest> {
  const tokenP = Promise.resolve(token)

  const ACTION = 'Manifest Retrieval'
  const manifestURL = new URL(`${ project }/manifests/${ tag }`, REGISTRY_URL)
  const manifestRequest = tokenP.then((token) => {
    return request.get(manifestURL.toString(), { json: true, auth: { bearer: token } })
  })

  manifestRequest.catch((err) => {
    console.error(ACTION, 'failed with error:', err)
  })

  return manifestRequest as Promise<DockerManifest>
}

// compares new image layer hashes to the saved ones, returns a Status
function checkImageHashChange (lastHash: string, currentHash: string): StatusLayer {
  return {}
}

function retrieveStatusHash (project: string, tag: string, previousStatus: Status) {
  if (previousStatus[project] == null) return null
  if (previousStatus[project][tag] == null) return null
  return previousStatus[project][tag]
}

const manifestLimit = promiseLimit(MAX_CONCURRENT_MANIFEST_REQUESTS)
type DockerManifestProm = Promise<DockerManifest>[]

// loops over config.image and checks manifests and compares for each one
// ultimately producing a Status
export async function checkAllImages (config: Config, previousStatus: Status) {
  // const manifestPromises = [] as Promise<DockerManifest>[]

  let manifestPromises: DockerManifestProm

  // this will have 2 dimensions: 1) projects, 2) for each project, an array of tags
  const manifestRetrieveList = config.images.map(project => {
    const projectTokenP = tokenGenerator(project.repository)

    return project.tags.map(tag => {
      // awaits project token generation
      return projectTokenP.then(token =>
        // locks on semaphore for manifests
        manifestLimit(() =>
          // finally retrieves manifest
          retrieveManifest(token, project.repository, tag)) as Promise<DockerManifest>
      )
    })
  })

  const manifestList = manifestRetrieveList.reduce((newArray, list) => {
    return newArray.concat(list)
  }, [])

  const newStatus: Status = {}

  const manifests = await Promise.all(manifestList)
  manifests.forEach(manifest => {
    const project = manifest.name
    const tag = manifest.tag

    // hash taken from saved Status
    const previousStatusHash = retrieveStatusHash(project, tag, previousStatus)

    const lastBlobSum = manifest.fsLayers[manifest.fsLayers.length - 1].blobSum
    newStatus[project] = newStatus[project] || {}
    newStatus[project][tag] = lastBlobSum
  })

  return newStatus
}
