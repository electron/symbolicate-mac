
export function parseAddressLine(line) {
  return parseAsCrashReportLine(line) || parseAsSpindumpLine(line) || parseAsSamplingLine(line)
}

function parseAsCrashReportLine(line) {
  // from a system crash report:
  // 1 dyld 0x00007fff69ed6975 ImageLoaderMachO::validateFirstPages(linkedit_data_command const*, int, unsigned char const*, unsigned long, long long, ImageLoader::LinkContext const&) + 145
  // 13 com.github.Electron.framework 0x000000010cfa931d node::binding::get_linked_module(char const*) + 3549
  // 1   com.github.Electron.framework 	0x000000010c99e684 -[ElectronNSWindowDelegate windowWillClose:] + 36 (electron_ns_window_delegate.mm:251)
  // 15  com.github.Electron.framework 	0x00000001118b1a86 v8::internal::SetupIsolateDelegate::SetupHeap(v8::internal::Heap*) + 10125238
  // 0   Electron Framework                         0x1104881e7 node::AsyncResource::get_async_id() const + 9674519
  const m = /^(\s*\d+\s+(.+)\s+0x([0-9a-f]+)\s+)(.+? \+ \d+)/.exec(line)
  if (m) {
    const [, prefix, libraryId, address, symbolWithOffset] = m
    return {
      libraryId: libraryId.trim(),
      address: parseInt(address, 16),
      replace: { from: prefix.length, length: symbolWithOffset.length }
    }
  }
}

function parseAsSpindumpLine(line) {
  // from spindump
  //  1000  ElectronMain + 134 (Electron Framework + 114470) [0x10e3f8f26]
  //    1000  electron::fuses::IsRunAsNodeEnabled() + 5717170 (Electron Framework + 7609010) [0x10eb1eab2]
  //      1000  electron::fuses::IsRunAsNodeEnabled() + 5716934 (Electron Framework + 7608774) [0x10eb1e9c6]
  // 54 electron::fuses::IsRunAsNodeEnabled() + 5722152 (Electron Framework + 7600776) [0x1129dfa88]
  // *54 ipc_mqueue_receive_continue + 0 (kernel + 389664) [0xffffff800026f220]
  // 54 v8::internal::SetupIsolateDelegate::SetupHeap(v8::internal::Heap*) + 2928702 (Electron Framework + 19826782) [0x11358885e]
  const m = /(?<=\d+\s+)(\S.*? \+ \d+|\?\?\?) \((.+?) \+ (\d+)\) \[0x([0-9a-f]+)\]/.exec(line)
  if (m) {
    const [, toReplace, libraryBaseName, offset, address] = m
    return {
      address: parseInt(address, 16),
      libraryBaseName,
      offset: parseInt(offset, 10),
      replace: { from: m.index, length: toReplace.length }
    }
  }
}

function parseAsSamplingLine(line) {
  // from sampling
  // + 2433 v8::internal::SetupIsolateDelegate::SetupHeap(v8::internal::Heap*)  (in Electron Framework) + 2917380  [0x10f6c5a64]
  // +   ! 2426 __CFRunLoopServiceMachPort  (in CoreFoundation) + 247  [0x7fff395789d5]
  // +   !  : | 4 v8::internal::SetupIsolateDelegate::SetupHeap(v8::internal::Heap*)  (in Electron Framework) + 13325775  [0x1100b2c2f]
  //   9       v8::internal::SetupIsolateDelegate::SetupHeap(v8::internal::Heap*)  (in Electron Framework) + 9711676  [0x10fd4069c]
  const m = /(?<=\d+\s+)(\S.*?)\s+\(in (.+?)\).*?\[0x([0-9a-f]+)\]/.exec(line)
  if (m) {
    const [, symbol, libraryBaseName, address] = m
    return {
      address: parseInt(address, 16),
      libraryBaseName,
      replace: { from: m.index, length: symbol.length }
    }
  }
}
