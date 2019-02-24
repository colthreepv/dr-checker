import { describe, it } from 'mocha'
import { expect } from 'chai'

import { compileNotificationSettings } from '../config'

describe('Testing compileNotificationSettings function', () => {

  it('should passthrought object without variables', () => {
    const testObject = {
      key: 'somevalue',
      nested: {
        anotherKey: false,
        hello: 'world'
      }
    }

    const newObject = compileNotificationSettings(testObject, {})

    expect(newObject).to.be.not.equal(testObject)
    expect(newObject).to.be.deep.equal(testObject)
  })

  it('should correctly handle arrays', () => {
    const testObject = {
      key: 'somevalue',
      nested: {
        anotherKey: false,
        hello: 'world'
      },
      anArray: [1, 2, 3, 4, 5]
    }

    const newObject = compileNotificationSettings(testObject, {})

    expect(newObject).to.be.not.equal(testObject)
    expect(newObject).to.be.deep.equal(testObject)
  })

  it('should correctly compile strings with placholders', () => {
    const testObject = {
      key: 'somevalue',
      nested: {
        anotherKey: false,
        hello: '${this.VAR1}-world'
      },
      anArray: [1, 2, 3, 4, 5]
    }

    const variables = {
      VAR1: '1',
      VAR2: '2'
    }

    const newObject = compileNotificationSettings(testObject, variables)

    expect(newObject).to.be.not.equal(testObject)
    expect(newObject).to.be.not.deep.equal(testObject)
    expect(newObject['nested']['hello']).to.be.equal(`${ variables.VAR1 }-world`)
  })

  it('should compile strings with undefined placeholders', () => {
    const testObject = {
      nested: {
        hello: '${this.VAR3}-world'
      }
    }

    const variables = {
      VAR1: '1',
      VAR2: '2'
    }

    const newObject = compileNotificationSettings(testObject, variables)

    expect(newObject).to.be.not.equal(testObject)
    expect(newObject).to.be.not.deep.equal(testObject)
    expect(newObject['nested']['hello']).to.be.equal('undefined-world')
  })

})
