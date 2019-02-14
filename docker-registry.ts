import promiseLimit from 'promise-limit'
import * as request from 'request-promise-native'
import { URL } from 'url'

import { Config } from './config'
import { DockerManifest, DockerToken } from './registry'
import { Status, StatusLayer } from './update-status'

const TOKEN_URL = 'https://auth.docker.io/token'
const REGISTRY_URL = 'https://registry-1.docker.io/v2/'

const MAX_CONCURRENT_MANIFEST_REQUESTS = 2

export type TokenBank = { [key: string]: { token: string, expiry: Date } }
type DockerManifestProm = Promise<DockerManifest>[]

// initialize a global token bank
const tokenBank: TokenBank = {}
const manifestLimit = promiseLimit(MAX_CONCURRENT_MANIFEST_REQUESTS)

// foreignTokenBank is useful especially for testing
export async function tokenGenerator (project: string, foreignTokenBank?: TokenBank) {
  const bank = foreignTokenBank || tokenBank

  // fast return in case token it's in bank
  if (bank[project] != null) {
    const nowDate = new Date()
    if (nowDate < bank[project].expiry) return bank[project].token
  }

  const ACTION = 'Token Generation'
  const queryParams = {
    service: 'registry.docker.io',
    scope: `repository:${ project }:pull`
  }

  let dockerToken: DockerToken
  try {
    dockerToken = await request.get(TOKEN_URL, { qs: queryParams, json: true })
  } catch (err) {
    console.error(ACTION, 'failed with error:', err)
    throw new Error(err)
  }

  // banks the token
  const expiryDate = new Date()
  expiryDate.setUTCSeconds(expiryDate.getUTCSeconds() + dockerToken.expires_in)

  bank[project] = {
    token: dockerToken.token,
    expiry: expiryDate
  }

  return dockerToken.token
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

  // from 2 dimensions array to single dimension
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
