import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest'

import { symbolicate } from '../index.js'

const TIMEOUT = 10 * 60_000

function getFixturePath(name) {
  return fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
}

describe('symbolication', function () {
  it('symbolicates a crash report', async () => {
    expect(await symbolicate({ file: getFixturePath('crash.txt') })).toMatchSnapshot()
  }, TIMEOUT)

  it('symbolicates a spindump', async () => {
    expect(await symbolicate({ file: getFixturePath('spindump.txt') })).toMatchSnapshot()
  }, TIMEOUT)

  it('symbolicates a sampling report', async () => {
    expect(await symbolicate({ file: getFixturePath('sampling.txt') })).toMatchSnapshot()
  }, TIMEOUT)

  it('symbolicates a windows crash', async () => {
    expect(await symbolicate({ file: getFixturePath('win-crash.txt') })).toMatchSnapshot()
  }, TIMEOUT)
})
