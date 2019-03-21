import { describe, it } from 'mocha'
import * as nock from 'nock'
import { expect } from 'chai'

import { Status, whatChanged, notify } from '../update-status'
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

    const changes = whatChanged(previous, next)
    await notify(changes, config)
    expect(nockSpy.isDone()).to.equal(true)
  })

  it('should not make any request if status has no changes', async () => {
    const nockSpy = nock(NOCK_URL).post(NOCK_POST_PATH).reply(200)
    const status = {
      'library/node': { '8': '1234567890' }
    }
    const changes = whatChanged(status, status)
    await notify(changes, config)
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

    const changes = whatChanged(previous, next)
    await notify(changes, config)
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

    const changes = whatChanged(previous, next)
    expect(changes).to.be.an('array')
    expect(changes.length).to.be.equal(1)

    const notifications = await notify(changes, {})
    expect(notifications).to.be.an('array')
    expect(notifications.length).to.be.equal(0)

    expect(nockSpy.isDone()).to.equal(false)
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

    const changes = whatChanged(previous, next)
    const notificationLog = await notify(changes, config)
    expect(nockSpy.isDone()).to.equal(true)
    expect(changes).to.be.an('array')
    expect(changes.length).to.be.equal(1)
    expect(notificationLog).to.be.an('array')
    expect(notificationLog[0]).to.contain(NOCK_PUT_PATH)
  })

})

describe('Testing change management', () => {
  it('should return a list of changes if there are', () => {
    const EXAMPLE_STATUS = {
      'library/node': {
        '8': 'sha256:22dbe790f71562dfd3d49406b1dfd1e85e50f3dd7cb2e97b3918376ca39cae4e',
        '10': 'sha256:22dbe790f71562dfd3d49406b1dfd1e85e50f3dd7cb2e97b3918376ca39cae4e' }
    }
    const changes = whatChanged({}, EXAMPLE_STATUS)
    expect(changes).to.be.an('array')
    expect(changes.length).to.be.equal(2)
    expect(changes[0]).to.have.all.keys('project', 'tag')
  })

  it('should return an empty list of changes if there are NOT', () => {
    const EXAMPLE_STATUS = {
      'library/node': {
        '8': 'sha256:22dbe790f71562dfd3d49406b1dfd1e85e50f3dd7cb2e97b3918376ca39cae4e',
        '10': 'sha256:22dbe790f71562dfd3d49406b1dfd1e85e50f3dd7cb2e97b3918376ca39cae4e' }
    }
    const ANOTHER_STATUS = Object.assign({}, EXAMPLE_STATUS)

    const changes = whatChanged(ANOTHER_STATUS, EXAMPLE_STATUS)
    expect(changes).to.be.an('array')
    expect(changes.length).to.be.equal(0)
  })
})
