import { describe, it } from 'mocha'
import * as nock from 'nock'
import { expect } from 'chai'

import { Config } from '../config'
import { checker } from '../handler'
import { zipStatus } from '../lambda'

import { cleanupTokenBank } from '../docker-registry'
import { Status } from '../update-status'
import { DockerToken, DockerManifest } from '../registry';

describe('Testing project to live servers', async () => {
  const NOTIFICATION_URL = 'http://example.com'
  const NOTIFICATION_PATH = '/node8-or-10'

  /**
   * FIXME
   * This config should generate 1 notification ONLY.
   * If you want separate notifications you should make
   * separate projects, each one with 1 'tag'
   */
  const testConfig: Config = [{
    repository: 'library/node',
    tags: ['8', '10'],
    notification: NOTIFICATION_URL + NOTIFICATION_PATH
  }]

  // global tokenBank MIGHT gets dirty with test tokens, it has to be reset
  beforeEach(() => cleanupTokenBank())
  afterEach(() => nock.cleanAll())

  it('should work with valid config', async () => {
    const nockSpy = nock(NOTIFICATION_URL).post(NOTIFICATION_PATH).times(2).reply(200)

    const jsonResponse = await checker(testConfig)
    expect(jsonResponse).to.be.an('object')
    expect(jsonResponse).to.have.all.keys('statusCode', 'body')
    expect(jsonResponse.body).that.be.a('string')

    const jsonBody = JSON.parse(jsonResponse.body)
    expect(jsonBody).to.have.all.keys('changes', 'notifications', 'status')
    expect(jsonBody.changes).to.be.an('array')
    expect(jsonBody.notifications).to.be.an('array')
    expect(jsonBody.notifications.length).to.be.equal(2)

    expect(nockSpy.isDone()).to.be.equal(true)
  })

})

describe('Testing project with nock', () => {
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
    fsLayers: [{ blobSum: 'sha256:asdoe790f71562dfd3d49406b1dfd1e85e50f3dd7cb2e97b3918376ca39cae4e' }],
    history: []
  }

  const NOTIFICATION_URL = 'http://example.com'
  const NOTIFICATION_PATH = '/node8'

  const testConfig: Config = [{
    repository: 'library/node',
    tags: ['8'],
    notification: NOTIFICATION_URL + NOTIFICATION_PATH
  }]

  // global tokenBank MIGHT gets dirty with test tokens, it has to be reset
  beforeEach(() => cleanupTokenBank())
  afterEach(() => nock.cleanAll())

  it('should work when there are no changes', async () => {
    const fakeStatus: Status = {
      'library/node': {
        '8': 'sha256:asdoe790f71562dfd3d49406b1dfd1e85e50f3dd7cb2e97b3918376ca39cae4e'
      }
    }
    const gzipStatus = await zipStatus(fakeStatus)
    process.env.UPDATE_STATUS = gzipStatus

    const TEST_PROJECT = 'library/node'
    const TEST_TAG = '8'
    const MANIFEST_PATH = `/v2/${ TEST_PROJECT }/manifests/${ TEST_TAG }`

    const dockerTokenSpy = nock(TOKEN_URL)
      .get('/token')
      .query({
        service: 'registry.docker.io',
        scope: `repository:${ TEST_PROJECT }:pull`
      })
      .reply(200, TOKEN_FIXTURE)
    const dockerManifestSpy = nock(REGISTRY_URL).get(MANIFEST_PATH).reply(200, MANIFEST_FIXTURE)

    const jsonResponse = await checker(testConfig)
    expect(jsonResponse).to.be.an('object')
    expect(jsonResponse).to.have.all.keys('statusCode', 'body')
    expect(jsonResponse.body).that.be.a('string')

    const jsonBody = JSON.parse(jsonResponse.body)
    expect(jsonBody).to.have.all.keys('changes', 'notifications', 'status')
    expect(jsonBody.changes).to.be.an('array')
    expect(jsonBody.notifications).to.be.an('array')
    expect(jsonBody.notifications.length).to.be.equal(0)

    expect(dockerTokenSpy.isDone()).to.be.equal(true)
    expect(dockerManifestSpy.isDone()).to.be.equal(true)
  })

  it('should work when there are changes', async () => {
    const fakeStatus: Status = {
      'library/node': {
        '8': 'sha256:11dde790f71562dfd3d49406b1dfd1e85e50f3dd7cb2e97b3918376ca39cae4e'
      }
    }
    const gzipStatus = await zipStatus(fakeStatus)
    process.env.UPDATE_STATUS = gzipStatus

    const TEST_PROJECT = 'library/node'
    const TEST_TAG = '8'
    const MANIFEST_PATH = `/v2/${ TEST_PROJECT }/manifests/${ TEST_TAG }`

    const dockerTokenSpy = nock(TOKEN_URL)
      .get('/token')
      .query({
        service: 'registry.docker.io',
        scope: `repository:${ TEST_PROJECT }:pull`
      })
      .reply(200, TOKEN_FIXTURE)
    const dockerManifestSpy = nock(REGISTRY_URL).get(MANIFEST_PATH).reply(200, MANIFEST_FIXTURE)
    const notificationSpy = nock(NOTIFICATION_URL).post(NOTIFICATION_PATH).reply(200)

    const jsonResponse = await checker(testConfig)
    expect(jsonResponse).to.be.an('object')
    expect(jsonResponse).to.have.all.keys('statusCode', 'body')
    expect(jsonResponse.body).that.be.a('string')

    const jsonBody = JSON.parse(jsonResponse.body)
    expect(jsonBody).to.have.all.keys('changes', 'notifications', 'status')
    expect(jsonBody.changes).to.be.an('array')
    expect(jsonBody.notifications).to.be.an('array')
    expect(jsonBody.notifications.length).to.be.equal(1)

    expect(dockerTokenSpy.isDone()).to.be.equal(true)
    expect(dockerManifestSpy.isDone()).to.be.equal(true)
    expect(notificationSpy.isDone()).to.be.equal(true)
  })
})
