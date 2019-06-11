const {parseAddress} = require('..').testing

describe('sampling address parsing', () => {
  it('passes through an already-symbolicated address', () => {
    expect(parseAddress('    + 2468 start  (in libdyld.dylib) + 1  [0x7fff97a6f5ad]'))
      .toEqual({symbol: 'start  (in libdyld.dylib) + 1  [0x7fff97a6f5ad]'})
    expect(parseAddress('    +                           2468 -[NSApplication run]  (in AppKit) + 682  [0x7fff8a120d80]'))
      .toEqual({symbol: '-[NSApplication run]  (in AppKit) + 682  [0x7fff8a120d80]'})
    expect(parseAddress('    +                                                           2468 base::internal::Invoker<base::internal::BindState<void (atom::NodeBindings::*)(), base::WeakPtr<atom::NodeBindings> >, void ()>::RunOnce(base::internal::BindStateBase*)  (in Electron Framework) + 20  [0x1003dd704]'))
      .toEqual({symbol: 'base::internal::Invoker<base::internal::BindState<void (atom::NodeBindings::*)(), base::WeakPtr<atom::NodeBindings> >, void ()>::RunOnce(base::internal::BindStateBase*)  (in Electron Framework) + 20  [0x1003dd704]'})
    expect(parseAddress('    +                                                                     2468 uv_run  (in libnode.dylib) + 160  [0x104f924e0]'))
      .toEqual({symbol: 'uv_run  (in libnode.dylib) + 160  [0x104f924e0]'})
    expect(parseAddress('     +                                                                                                                                                                                 ! 1266 AL_findVolume  (in CarbonCore) + 139  [0x7fff85f9b18a]'))
      .toEqual({symbol: 'AL_findVolume  (in CarbonCore) + 139  [0x7fff85f9b18a]'})
  })

  it('parses an unknown address', () => {
    expect(parseAddress('    +       2468 ???  (in Electron Framework)  load address 0x1002b2000 + 0x41f804  [0x1006d1804]'))
      .toEqual({library: 'com.github.electron.framework', address: '0x1006d1804', image: '0x1002b2000'})
    expect(parseAddress('    +       !   2468 ???  (in Electron Framework)  load address 0x1002b2000 + 0x41f804  [0x1006d1804]'))
      .toEqual({library: 'com.github.electron.framework', address: '0x1006d1804', image: '0x1002b2000'})
    expect(parseAddress('    +                                                                       2468 ???  (in libnode.dylib)  load address 0x104f80000 + 0x17014  [0x104f97014]'))
      .toEqual({library: 'libnode.dylib', address: '0x104f97014', image: '0x104f80000'})
  })
})
