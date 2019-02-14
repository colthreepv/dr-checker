import { describe, it } from 'mocha'
import { expect } from 'chai'

import { TokenBank, tokenGenerator } from '../docker-registry'

describe('Testing docker registry library', () => {

  it('should generate a token', async () => {
    const TEST_PROJECT = 'library/alpine'
    const bank: TokenBank = {}

    const token = await tokenGenerator(TEST_PROJECT, bank)

    expect(token).to.be.a('string')
    expect(bank).to.have.property(TEST_PROJECT)
    expect(bank[TEST_PROJECT]).to.have.all.keys('token', 'expiry')
  })
})
