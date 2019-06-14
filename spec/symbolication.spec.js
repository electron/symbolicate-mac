const atos = require('..')

const fixture = `
0   com.github.electron.framework 	0x000000010d01fad3 0x10c497000 + 12094163
1   com.github.electron.framework 	0x000000010d095014 0x10c497000 + 12574740
`.trim()

const nodeFixture = `
3   libnode.dylib                 	0x000000010ab5c383 0x10aa09000 + 1389443
4   libnode.dylib                 	0x000000010ab678e9 0x10aa09000 + 1435881
`.trim()

const mixedFixture = `
0   com.github.electron.framework 	0x000000010d01fad3 0x10c497000 + 12094163
1   com.github.electron.framework 	0x000000010eb4d929 atom::api::Debugger::DispatchProtocolMessage(content::DevToolsAgentHost*, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char> > const&) + 73
2   com.github.electron.framework 	0x000000010eb4dbfd non-virtual thunk to atom::api::Debugger::DispatchProtocolMessage(content::DevToolsAgentHost*, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char> > const&) + 13
3   com.github.electron.framework 	0x000000010d095014 0x10c497000 + 12574740
`.trim()

const samplingFixture = `
    + !     2189 ???  (in Electron Framework)  load address 0x1052bd000 + 0x3f8e36  [0x1056b5e36]
    + !       2189 ???  (in Electron Framework)  load address 0x1052bd000 + 0x3f9d3d  [0x1056b6d3d]
    +       2193 ???  (in libnode.dylib)  load address 0x1096d6000 + 0x157763  [0x10982d763]
`.trim()

const post4Addresses = `
0   com.github.Electron.framework 	0x00000001065dbbb4 0x104880000 + 30784436
6   ???                           	0x00003d71da6086a6 0 + 67559204357798
35  com.github.Electron.framework 	0x0000000106020085 v8::Function::Call(v8::Local<v8::Context>, v8::Local<v8::Value>, int, v8::Local<v8::Value>*) + 437
36  com.github.Electron.framework 	0x00000001096513bb node::LoadEnvironment(node::Environment*) + 939
44  com.github.Electron.framework 	0x00000001064e35c4 0x104880000 + 29767108
45  com.github.Electron.framework 	0x0000000104882014 AtomMain + 84
46  com.github.Electron           	0x000000010181df10 0x10181d000 + 3856
47  libdyld.dylib                 	0x00007fff7a6513d5 start + 1
`.trim()

describe('atos', function () {
  it('returns an array of symbols for an Electron framework address', (done) => {
    atos({
      content: fixture,
      version: '1.4.14'
    }, (error, symbols) => {
      if (error != null) return done(error)
      expect(symbols).toMatchSnapshot()
      done()
    })
  }, 30000)

  it('returns an array of symbols for a node address', (done) => {
    atos({
      content: nodeFixture,
      version: '1.4.14'
    }, (error, symbols) => {
      if (error != null) return done(error)
      expect(symbols).toMatchSnapshot()
      done()
    })
  }, 30000)

  it('returns an array of symbols for partially symbolicated addresses', (done) => {
    atos({
      content: mixedFixture,
      version: '1.4.14'
    }, (error, symbols) => {
      if (error != null) return done(error)
      expect(symbols).toMatchSnapshot()
      done()
    })
  }, 30000)

  it('returns an array of symbols for addresses taken from sampling', (done) => {
    atos({
      content: samplingFixture,
      version: '1.6.8'
    }, (error, symbols) => {
      if (error != null) return done(error)
      expect(symbols).toMatchSnapshot()
      done()
    })
  }, 30000)

  it('works for >=4.x stack traces', (done) => {
    atos({
      content: post4Addresses,
      version: '4.2.2'
    }, (error, symbols) => {
      if (error != null) return done(error)
      expect(symbols).toMatchSnapshot()
      done()
    })
  }, 30000)
})
