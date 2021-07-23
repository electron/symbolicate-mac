const { symbolicate } = require('..')

const TIMEOUT = 2 * 60 * 1000;

describe('symbolication', function () {
  it('symbolicates a crash report', async () => {
    expect(await symbolicate({ file: __dirname + '/fixtures/crash.txt' })).toMatchSnapshot()
  }, TIMEOUT)

  it('symbolicates a spindump', async () => {
    expect(await symbolicate({ file: __dirname + '/fixtures/spindump.txt' })).toMatchSnapshot()
  }, TIMEOUT)

  it('symbolicates a sampling report', async () => {
    expect(await symbolicate({ file: __dirname + '/fixtures/sampling.txt' })).toMatchSnapshot()
  }, TIMEOUT)
})
