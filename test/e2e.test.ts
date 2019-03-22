import { describe, it } from 'mocha'
import * as nock from 'nock'
import { expect } from 'chai'

import { Config } from '../config'
import { checker } from '../handler'

import { cleanupTokenBank } from '../docker-registry'

describe('Testing project', async () => {
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

    const jsonResponse = await checker(null, null, testConfig)
    expect(jsonResponse).to.be.an('object')
    expect(jsonResponse).to.have.all.keys('statusCode', 'body')
    expect(jsonResponse.body).that.be.a('string')

    const jsonBody = JSON.parse(jsonResponse.body)
    expect(jsonBody).to.have.all.keys('changes', 'notifications')
    expect(jsonBody.changes).to.be.an('array')
    expect(jsonBody.notifications).to.be.an('array')
    expect(jsonBody.notifications.length).to.be.equal(2)

    expect(nockSpy.isDone()).to.be.equal(true)
  })
})
