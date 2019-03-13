import { describe, it } from 'mocha'
import * as nock from 'nock'
import { expect } from 'chai'

import { Status, compareStatusAndNotify } from '../update-status'
import { ConfigByProject } from '../config'

describe('Testing notifications', () => {
  const NOCK_URL = 'http://example.com'
  const NOCK_POST_PATH = '/post-url'

  const config: ConfigByProject = {
    'library/node': { '8': NOCK_URL + NOCK_POST_PATH }
  }

  afterEach(() => nock.cleanAll())

  it('should make a POST request with valid config and changed status', async () => {
    const nockSpy = nock(NOCK_URL).post(NOCK_POST_PATH).reply(200)
    const previous: Status = {
      'library/node': { '8': '1234567890' }
    }

    const next: Status = {
      'library/node': { '8': 'abcdefg' }
    }

    await compareStatusAndNotify(previous, next, config)
    expect(nockSpy.isDone()).to.equal(true)
  })

  it('should not make any request if status has no changes', async () => {
    const nockSpy = nock(NOCK_URL).post(NOCK_POST_PATH).reply(200)
    const status = {
      'library/node': { '8': '1234567890' }
    }
    await compareStatusAndNotify(status, status, config)
    expect(nockSpy.isDone()).to.equal(false)
  })

  it('should not make any request if the tag has no config', async () => {
    const nockSpy = nock(NOCK_URL).post(NOCK_POST_PATH).reply(200)
    const previous: Status = {
      'library/node': { '8': '1234567890' }
    }

    const next: Status = {
      'library/node': { '8': 'abcdefg' }
    }

    const config: ConfigByProject = {
      'library/node': { '10': NOCK_URL + NOCK_POST_PATH }
    }

    await compareStatusAndNotify(previous, next, config)
    expect(nockSpy.isDone()).to.equal(false)
  })

  it('should not make any request in case there is no config', async () => {
    const nockSpy = nock(NOCK_URL).post(NOCK_POST_PATH).reply(200)
    const previous: Status = {
      'library/node': { '8': '1234567890' }
    }

    const next: Status = {
      'library/node': { '8': 'abcdefg' }
    }

    const requestLog = await compareStatusAndNotify(previous, next, {})
    expect(nockSpy.isDone()).to.equal(false)
    expect(requestLog).to.be.an('array')
    expect(requestLog.length).to.be.equal(0)
  })

  it('should be able to send configured request with changed status', async () => {
    const NOCK_PUT_PATH = '/put-url'
    const previous: Status = {
      'library/node': { '8': '1234567890' }
    }

    const next: Status = {
      'library/node': { '8': 'abcdefg' }
    }

    const NOCK_PUT_BODY = { hello: 'world' }

    const config: ConfigByProject = {
      'library/node': {
        '8': {
          url: NOCK_URL + NOCK_PUT_PATH,
          method: 'PUT',
          json: true,
          body: NOCK_PUT_BODY
        }
      }
    }
    const nockSpy = nock(NOCK_URL).put(NOCK_PUT_PATH, NOCK_PUT_BODY).reply(200)

    const requestLog = await compareStatusAndNotify(previous, next, config)
    expect(nockSpy.isDone()).to.equal(true)
    expect(requestLog).to.be.an('array')
    expect(requestLog.length).to.be.equal(1)
    expect(requestLog[0]).to.contain(NOCK_PUT_PATH)
  })

})
