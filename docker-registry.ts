import * as promiseLimit from 'promise-limit'
import * as request from 'request-promise-native'
import { URL } from 'url'

import { Config } from './config'
import { DockerManifest, DockerToken } from './registry'
import { Status } from './update-status'

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
export async function retrieveManifest (token: string, project: string, tag: string): Promise<DockerManifest> {
  const ACTION = 'Manifest Retrieval'
  const manifestURL = new URL(`${ project }/manifests/${ tag }`, REGISTRY_URL)

  const manifestRequest = request({
    url: manifestURL.toString(),
    method: 'GET',
    json: true,
    auth: { bearer: token }
  }) as request.RequestPromise<DockerManifest>

  manifestRequest.catch((err) => {
    console.error(ACTION, 'failed with error:', err)
  })

  return manifestRequest
}

// loops over config and checks manifests and compares for each one
// ultimately producing a Status
export async function checkAllImages (config: Config, previousStatus: Status) {
  // const manifestPromises = [] as Promise<DockerManifest>[]

  let manifestPromises: DockerManifestProm

  // this will have 2 dimensions: 1) projects, 2) for each project, an array of tags
  const manifestRetrieveList = config.map(project => {
    const tokenP = tokenGenerator(project.repository)

    const retrieveTagList = project.tags.map(tag => {
      // awaits project token generation
      return tokenP.then(token =>
        manifestLimit(() => retrieveManifest(token, project.repository, tag)) as Promise<DockerManifest>
      )
    })
    return retrieveTagList
  })

  // from 2 dimensions array to single dimension
  const manifestList = manifestRetrieveList.reduce((newArray, list) => {
    return newArray.concat(list)
  }, [])

  const newStatus: Status = {}

  const manifests = await Promise.all(manifestList)
  manifests.forEach(async manifest => {
    const project = manifest.name
    const tag = manifest.tag

    const lastBlobSum = manifest.fsLayers[manifest.fsLayers.length - 1].blobSum
    newStatus[project] = newStatus[project] || {}
    newStatus[project][tag] = lastBlobSum
  })

  return newStatus
}
