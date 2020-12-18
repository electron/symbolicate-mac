const {parseAddress, parseAddresses} = require('..').testing

describe('sampling address parsing', () => {
  it('passes through an already-symbolicated address', () => {
    expect(parseAddress('    + 2468 start  (in Electron Framework) + 1  [0x7fff97a6f5ad]'))
      .toEqual(undefined)
    expect(parseAddress('    +                           2468 -[NSApplication run]  (in AppKit) + 682  [0x7fff8a120d80]'))
      .toEqual(undefined)
    expect(parseAddress('    +                                                           2468 base::internal::Invoker<base::internal::BindState<void (atom::NodeBindings::*)(), base::WeakPtr<atom::NodeBindings> >, void ()>::RunOnce(base::internal::BindStateBase*)  (in Electron Framework) + 20  [0x1003dd704]'))
      .toEqual(undefined)
    expect(parseAddress('    +                                                                     2468 uv_run  (in libnode.dylib) + 160  [0x104f924e0]'))
      .toEqual(undefined)
    expect(parseAddress('     +                                                                                                                                                                                 ! 1266 AL_findVolume  (in CarbonCore) + 139  [0x7fff85f9b18a]'))
      .toEqual(undefined)
  })

  it('parses an unknown address', () => {
    expect(parseAddress('    +       2468 ???  (in Electron Framework)  load address 0x1002b2000 + 0x41f804  [0x1006d1804]'))
      .toEqual({library: 'com.github.electron.framework', address: '0x1006d1804', image: '0x1002b2000', replace: {from: 17, length: 28}})
    expect(parseAddress('    +       !   2468 ???  (in Electron Framework)  load address 0x1002b2000 + 0x41f804  [0x1006d1804]'))
      .toEqual({library: 'com.github.electron.framework', address: '0x1006d1804', image: '0x1002b2000', replace: {from: 21, length: 28}})
    expect(parseAddress('    +                                                                       2468 ???  (in libnode.dylib)  load address 0x104f80000 + 0x17014  [0x104f97014]'))
      .toEqual({library: 'libnode.dylib', address: '0x104f97014', image: '0x104f80000', replace: {from: 81, length: 23}})
  })
})

describe('sentry dump parsing', () => {
  it('parses a sentry dump', () => {
    const addresses = parseAddresses(`{
	"debug_meta": {
		"images": [{
			"code_file": "/Applications/Somiibo.app/Contents/Frameworks/Somiibo Helper (Renderer).app/Contents/MacOS/Somiibo Helper (Renderer)",
			"image_addr": "0x1096d1000",
			"debug_file": "Somiibo Helper (Renderer)",
			"image_size": 237568,
			"type": "macho",
			"debug_id": "49c385a1-0c31-33bb-9742-3795d0bcf293"
		}, {
			"code_file": "/Applications/Somiibo.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework",
			"image_addr": "0x109719000",
			"debug_file": "Electron Framework",
			"image_size": 106332160,
			"type": "macho",
			"debug_id": "ef0079c1-ff8e-3e51-9bf0-eba220c7f894"
    }]
  },
	"exception": {
		"values": [{
			"stacktrace": {
				"frames": [{
					"trust": "scan",
					"in_app": false,
					"data": {
						"orig_in_app": -1,
						"symbolicator_status": "missing"
					},
					"instruction_addr": "0x7fff6b6173d5",
					"package": "/usr/lib/system/libdyld.dylib"
				}, {
					"trust": "fp",
					"in_app": true,
					"data": {
						"orig_in_app": -1,
						"symbolicator_status": "missing"
					},
					"instruction_addr": "0x1096d2705",
					"package": "/Applications/Somiibo.app/Contents/Frameworks/Somiibo Helper (Renderer).app/Contents/MacOS/Somiibo Helper (Renderer)"
				}, {
					"trust": "fp",
					"in_app": true,
					"data": {
						"orig_in_app": -1,
						"symbolicator_status": "missing"
					},
					"instruction_addr": "0x10971bb54",
					"package": "/Applications/Somiibo.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework"
				}, {
					"trust": "fp",
					"in_app": true,
					"data": {
						"orig_in_app": -1,
						"symbolicator_status": "missing"
					},
					"instruction_addr": "0x10a0de754",
					"package": "/Applications/Somiibo.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework"
				}]
      }
    }]
  }
}`)
    expect(addresses).toEqual([
      {
        addresses: [
          { address: "0x10a0de754", image: "0x109719000", library: "com.github.electron.framework" },
          { address: "0x10971bb54", image: "0x109719000", library: "com.github.electron.framework" }
        ],
        image: "0x109719000",
        library: "com.github.electron.framework"
      },
      {
        addresses: [
          { address: "0x1096d2705", image: "0x1096d1000", library: "Somiibo Helper (Renderer)" }
        ],
        image: "0x1096d1000",
        library: "Somiibo Helper (Renderer)"
      },
      {
        addresses: [
          { address: "0x7fff6b6173d5", image: null, library: "libdyld.dylib" }
        ],
        image: null,
        library: "libdyld.dylib"
      }
    ])
  })
})
