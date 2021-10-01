#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const breakpad = require('parse-breakpad')
const yargs = require('yargs')

const symbolicate = async (options) => {
  const {force, file} = options
  const cacheDirectory = path.join(__dirname, 'cache', 'breakpad_symbols')

  const symbolCache = new Map
  const dumpText = await fs.promises.readFile(file, 'utf8')
  const images = binaryImages(dumpText)

  let result = []

  for (const line of dumpText.split(/\r?\n/)) {
    const parsedLine = parseAddressLine(line)
    if (parsedLine) {
      const library = parsedLine.libraryBaseName || parsedLine.libraryId
      const image = images.find(i => i.library === library || path.basename(i.path) === library)
      if (image) {
        const offset = parsedLine.address - image.startAddress
        const res = await symbolicateOne({
          image,
          offset
        })
        if (res) {
          result.push(line.substr(0, parsedLine.replace.from) + res.func.name + line.substr(parsedLine.replace.from + parsedLine.replace.length))
          continue
        }
      }
    }
    result.push(line)
  }

  return result.join('\n')

  async function getSymbolFile(moduleId, moduleName) {
    const pdb = moduleName.replace(/^\//, '')
    const symbolFileName = pdb.replace(/(\.pdb)?$/, '.sym')
    const symbolPath = path.join(cacheDirectory, pdb, moduleId, symbolFileName)
    if (fs.existsSync(symbolPath) && !force) {
      return breakpad.parse(fs.createReadStream(symbolPath))
    }
    if (!fs.existsSync(symbolPath) && (!fs.existsSync(path.dirname(symbolPath)) || force)) {
      for (const baseUrl of SYMBOL_BASE_URLS) {
        if (await fetchSymbol(cacheDirectory, baseUrl, pdb, moduleId, symbolFileName))
          return breakpad.parse(fs.createReadStream(symbolPath))
      }
    }
  }

  async function symbolicateOne({image, offset}) {
    const { debugId, path: modulePath } = image
    if (!symbolCache.has(debugId)) {
      const parsed = await getSymbolFile(debugId.replace(/-/g, '') + '0', path.basename(modulePath))
      symbolCache.set(debugId, parsed)
    }
    const parsed = symbolCache.get(debugId)
    if (parsed)
      return parsed.lookup(offset)
  }
}

const binaryImages = (dumpText) => {
  // e.g.
  //  0x109ae8000 - 0x109b37fcf +com.tinyspeck.slackmacgap (4.18.0 - 6748) <AB3CB5D1-EB3F-388F-8C63-416A00DA1AAA> /Applications/Slack.app/Contents/MacOS/Slack
  //  0x109b49000 - 0x1115c0f7f +com.github.Electron.framework (13.1.6) <36C7F681-FAD6-3CD1-B327-6C1054C359C7> /Applications/Slack.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework
  //  0x112051000 - 0x11205dfff com.apple.StoreKit (1.0 - 459) <3E2D404A-55AA-33F9-9B22-5BA474562E6B> /System/Library/Frameworks/StoreKit.framework/Versions/A/StoreKit
  //  0x112073000 - 0x112086ff3 +com.github.Squirrel (1.0 - 1) <68FF73B4-1C5A-3235-B391-3EA358FE89C0> /Applications/Slack.app/Contents/Frameworks/Squirrel.framework/Versions/A/Squirrel
  //  0x11209f000 - 0x1120e6fff +com.electron.reactive (3.1.0 - 0.0.0) <5DED8556-18AB-3090-ADBF-AEB05C656853> /Applications/Slack.app/Contents/Frameworks/ReactiveObjC.framework/Versions/A/ReactiveObjC
  //  0x10ffeb000 -        0x10fffefff  com.tinyspeck.slackmacgap.helper (0)           <822C7053-6F03-3481-A781-ACF996BC3C0F>         /Applications/Slack.app/Contents/Frameworks/Slack Helper (Renderer).app/Contents/MacOS/Slack Helper (Renderer)
  const re = /^\s*0x([0-9a-f]+)\s+-\s+0x([0-9a-f]+)\s+(\+)?(\S+)\s+\(([^)]+)\)\s+<([0-9A-F-]+)>\s+(.+)$/mg
  let m
  const images = []
  while (m = re.exec(dumpText)) {
    const [, startAddress, endAddress, plus, library, version, debugId, path] = m
    images.push({
      startAddress: parseInt(startAddress, 16),
      endAddress: parseInt(endAddress, 16),
      plus,
      library,
      version,
      debugId,
      path,
    })
  }
  return images
}

function parseAddressLine(line) {
  return parseAsCrashReportLine(line) || parseAsSpindumpLine(line) || parseAsSamplingLine(line)
}
function parseAsCrashReportLine(line) {
  // from a system crash report:
  // 1 dyld 0x00007fff69ed6975 ImageLoaderMachO::validateFirstPages(linkedit_data_command const*, int, unsigned char const*, unsigned long, long long, ImageLoader::LinkContext const&) + 145
  // 13 com.github.Electron.framework 0x000000010cfa931d node::binding::get_linked_module(char const*) + 3549
  // 1   com.github.Electron.framework 	0x000000010c99e684 -[ElectronNSWindowDelegate windowWillClose:] + 36 (electron_ns_window_delegate.mm:251)
  // 15  com.github.Electron.framework 	0x00000001118b1a86 v8::internal::SetupIsolateDelegate::SetupHeap(v8::internal::Heap*) + 10125238
  const m = /^(\s*\d+\s+(\S+)\s+0x([0-9a-f]+)\s+)(.+? \+ \d+)/.exec(line)
  if (m) {
    const [, prefix, libraryId, address, symbolWithOffset] = m
    return {
      libraryId,
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

const SYMBOL_BASE_URLS = [
  'https://symbols.mozilla.org/try',
  'https://symbols.electronjs.org',
]

function fetchSymbol(directory, baseUrl, pdb, id, symbolFileName) {
  const url = `${baseUrl}/${encodeURIComponent(pdb)}/${id}/${encodeURIComponent(symbolFileName)}`
  const symbolPath = path.join(directory, pdb, id, symbolFileName)
  return new Promise((resolve, reject) => {
    // We use curl here in order to avoid having to deal with redirects +
    // gzip + saving to a file ourselves. It would be more portable to
    // handle this in JS rather than by shelling out, though, so TODO.
    const child = require('child_process').spawn('curl', [
      // We don't need progress bars.
      '--silent',

      // The Mozilla symbol server redirects to S3, so follow that
      // redirect.
      '--location',

      // We want to create all the parent directories for the target path,
      // which is breakpad_symbols/foo.pdb/0123456789ABCDEF/foo.sym
      '--create-dirs',

      // The .sym file is gzipped, but minidump_stackwalk needs it
      // uncompressed, so ask curl to ungzip it for us.
      '--compressed',

      // If we get a 404, don't write anything and exit with code 22. The
      // parent directories will still be created, though.
      '--fail',

      // Save the file directly into the cache.
      '--output', symbolPath,

      // This is the URL we want to fetch.
      url
    ])

    child.once('close', (code) => {
      if (code === 0) {
        resolve(true)
      } else {
        if (code === 22) { // 404
          resolve(false)
        } else {
          reject(new Error(`failed to download ${url} (code ${code})`))
        }
      }
    })
  })
}

module.exports = { symbolicate, testing: { parseAddress: parseAddressLine } }

if (!module.parent) {
  const argv = yargs
    .command('$0 <file>', 'symbolicate a textual crash dump', (yargs) => {
      return yargs
        .positional('file', {
          describe: 'path to crash dump',
        })
        .option('force', {
          describe: 'redownload symbols if present in cache',
          type: 'boolean'
        })
    })
    .help()
    .argv
  symbolicate(argv).then(console.log)
}
