const {parseAddress} = require('..').testing

describe('address parsing', () => {
  it('parses an address from a crash dump', () => {
    expect(parseAddress('89 com.github.Electron.framework 0x0000000109ca874a ElectronInitializeICUandStartNode + 1327018'))
      .toEqual({address: 0x0000000109ca874a, libraryId: 'com.github.Electron.framework', replace: {from: 52, length: 43}})
  })
  it('parses an address from a spindump', () => {
    expect(parseAddress('1000  electron::fuses::IsRunAsNodeEnabled() + 5717170 (Electron Framework + 7609010) [0x10eb1eab2]'))
      .toEqual({address: 0x10eb1eab2, libraryBaseName: 'Electron Framework', offset: 7609010, replace: {from: 6, length: 47}})
    expect(parseAddress('   *1000  ??? (kernel + 6632800) [0xffffff8000853560]'))
      .toEqual({address: 0xffffff8000853560, libraryBaseName: 'kernel', offset: 6632800, replace: {from: 10, length: 3}})
  })
  it('parses an address from a sampling trace', () => {
    expect(parseAddress(' +      !    : 5 v8::internal::SetupIsolateDelegate::SetupHeap(v8::internal::Heap*)  (in Electron Framework) + 9794348  [0x10fd5498c]'))
      .toEqual({address: 0x10fd5498c, libraryBaseName: 'Electron Framework', replace: {from: 17, length: 66}})
    expect(parseAddress(' 31       _pthread_start  (in libsystem_pthread.dylib) + 148  [0x7fff7381d109]'))
      .toEqual({address: 0x7fff7381d109, libraryBaseName: 'libsystem_pthread.dylib', replace: {from: 10, length: 14}})
  })
})
