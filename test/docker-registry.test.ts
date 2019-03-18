import { expect } from 'chai'
import { describe, it } from 'mocha'
import * as nock from 'nock'

import { Config } from '../config'
import { checkAllImages, retrieveManifest, TokenBank, tokenGenerator } from '../docker-registry'
import { DockerToken, DockerManifest } from '../registry'
import { Status } from '../update-status'

const REGISTRY_URL = 'https://registry-1.docker.io/'
const TOKEN_URL = 'https://auth.docker.io'

const TOKEN_FIXTURE: DockerToken = {
  token: 'fake-token',
  access_token: 'another-fake-token',
  expires_in: 9999999,
  issued_at: '2018-10-18T17:22:55.893319601Z'
}

const MANIFEST_FIXTURE: DockerManifest = {
  schemaVersion: 3,
  name: 'library/node',
  tag: '8',
  architecture: 'amd64',
  fsLayers: [{ blobSum: 'asdomasdo123' }],
  history: []
}

describe('Testing docker registry library', () => {
  afterEach(() => nock.cleanAll())

  it('should generate a token', async () => {
    const TEST_PROJECT = 'library/alpine'

    const nockSpy = nock(TOKEN_URL)
      .get('/token')
      .query({
        service: 'registry.docker.io',
        scope: `repository:${ TEST_PROJECT }:pull`
      })
      .reply(200, TOKEN_FIXTURE)
    const bank: TokenBank = {}

    const token = await tokenGenerator(TEST_PROJECT, bank)

    expect(token).to.be.a('string')
    expect(bank).to.have.property(TEST_PROJECT)
    expect(bank[TEST_PROJECT]).to.have.all.keys('token', 'expiry')
    expect(nockSpy.isDone()).to.equal(true)
  })
})

describe('Testing retrieveManifest', () => {
  const TEST_PROJECT = 'library/alpine'
  const TEST_TAG = '8'
  const NOCK_GET_PATH = `/v2/${ TEST_PROJECT }/manifests/${ TEST_TAG }`
  afterEach(() => nock.cleanAll())

  it('should work with correct parameters', async () => {
    const nockSpy = nock(REGISTRY_URL).get(NOCK_GET_PATH).reply(200)

    await retrieveManifest('fake-token', TEST_PROJECT, TEST_TAG)
    expect(nockSpy.isDone()).to.equal(true)
  })

})

describe('Testing checkAllImages', () => {
  const TEST_CONFIG: Config = [{
    repository: 'library/node',
    tags: ['8'],
    notification: ''
  }]
  const EMPTY_STATUS: Status = {}

  const TEST_PROJECT = TEST_CONFIG[0].repository
  const TEST_TAG = TEST_CONFIG[0].tags[0]
  const REGISTRY_PATH = `/v2/${ TEST_PROJECT }/manifests/${ TEST_TAG }`
  afterEach(() => nock.cleanAll())

  it('should work with valid parameters', async () => {
    const tokenSpy = nock(TOKEN_URL)
      .get('/token')
      .query({
        service: 'registry.docker.io',
        scope: `repository:${ TEST_PROJECT }:pull`
      })
      .reply(200, TOKEN_FIXTURE)

    const registrySpy = nock(REGISTRY_URL).get(REGISTRY_PATH).reply(200, MANIFEST_FIXTURE)
    const status = await checkAllImages(TEST_CONFIG, EMPTY_STATUS)

    expect(tokenSpy.isDone()).to.equal(true)
    expect(registrySpy.isDone()).to.equal(true)
    expect(status).to.have.all.keys(TEST_PROJECT)
  })
})
