#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createGunzip } from 'node:zlib';

import { symbolicateFrames } from '@indutny/breakpad'

import { parseAddressLine } from './parsing.js'

export const symbolicate = async (options) => {
  const {force, file} = options
  const cacheDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cache', 'breakpad_symbols')

  const dumpText = await fs.promises.readFile(file, 'utf8')
  const images = binaryImages(dumpText)
  const electronImage = images.find(v => /electron/i.test(v.library))
  if (electronImage) console.error(`Found Electron ${electronImage.version}`)
  else console.error('No Electron image found')

  const lines = dumpText.split(/\r?\n/);

  const linesByImage = new Map();
  for (const [lineIndex, line] of lines.entries()) {
    const parsedLine = parseAddressLine(line)
    if (!parsedLine) {
      continue;
    }

    const library = parsedLine.libraryBaseName || parsedLine.libraryId
    const image = images.find(i => i.library === library || i.basename === library)
    if (!image) {
      continue;
    }

    const offset = parsedLine.address - image.startAddress
    const imageKey = `${image.debugId}/${image.basename}`;

    let entry = linesByImage.get(imageKey);
    if (!entry) {
      entry = { image, group: [] };
      linesByImage.set(imageKey, entry);
    }
    entry.group.push({
      image,
      offset,
      lineIndex,
      parsedLine,
    });
  }

  for (const { image, group } of linesByImage.values()) {
    const { debugId, basename: moduleBasename, extname: moduleExtname } = image
    const suffix = moduleExtname === '.pdb' ? '1' : '0';
    const stream = await getSymbolFile(debugId.replace(/-/g, '') + suffix, moduleBasename)
    if (!stream) {
      continue;
    }

    const frames = group.map(({ offset }) => offset);
    const symbolicated = await symbolicateFrames(stream, frames);

    for (const [index, symbol] of symbolicated.entries()) {
      if (!symbol) {
        continue;
      }

      const { lineIndex, parsedLine } = group[index];
      const line = lines[lineIndex];
      lines[lineIndex] = line.substr(0, parsedLine.replace.from) + symbol.name + line.substr(parsedLine.replace.from + parsedLine.replace.length);
    }
  }

  return lines.join('\n')

  async function getSymbolFile(moduleId, moduleName) {
    const pdb = moduleName.replace(/^\//, '')
    const symbolFileName = pdb.replace(/(\.pdb)?$/, '.sym')
    const symbolPath = path.join(cacheDirectory, pdb, moduleId, symbolFileName)
    if (fs.existsSync(symbolPath) && !force) {
      return fs.createReadStream(symbolPath)
    }
    if (!fs.existsSync(symbolPath) && (!fs.existsSync(path.dirname(symbolPath)) || force)) {
      for (const baseUrl of SYMBOL_BASE_URLS) {
        if (await fetchSymbol(cacheDirectory, baseUrl, pdb, moduleId, symbolFileName))
          return fs.createReadStream(symbolPath)
      }
    }
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
  //  0x10c830000 -        0x11583ffff com.github.Electron.framework (*) <4c4c4416-5555-3144-a14d-de8dd5c37e80> /Applications/Slack.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework
  const re = /^\s*0x([0-9a-f]+)\s+-\s+0x([0-9a-f]+)\s+(\+)?(\S+)\s+\(([^)]+)\)\s+<([0-9a-f-]+)>\s+(.+)$/mgi
  let m
  const images = []
  while (m = re.exec(dumpText)) {
    const [, startAddress, endAddress, plus, library, version, debugId, modulePath] = m
    const image = {
      startAddress: parseInt(startAddress, 16),
      endAddress: parseInt(endAddress, 16),
      plus,
      library,
      version,
      debugId,
      basename: path.basename(modulePath),
      extname: path.extname(modulePath),
    }
    const existing = images.find(v => v.library === image.library)
    if (existing) {
      if (existing.debugId !== debugId || existing.startAddress !== image.startAddress) {
        console.warn(`Duplicate library entries for ${library}, only using the first.`)
        console.warn(existing, image)
      }
      continue;
    }
    images.push(image)
  }
  return images
}

const SYMBOL_BASE_URLS = [
  'https://symbols.mozilla.org/try',
  'https://symbols.electronjs.org',
]

async function fetchSymbol(directory, baseUrl, pdb, id, symbolFileName) {
  const url = `${baseUrl}/${encodeURIComponent(pdb)}/${id}/${encodeURIComponent(symbolFileName)}`
  const symbolPath = path.join(directory, pdb, id, symbolFileName)

  // ensure path is created
  await fs.promises.mkdir(path.dirname(symbolPath), { recursive: true })

  const response = await fetch(url, { headers: { 'Accept-Encoding': 'gzip' } })

  if (response.ok) {
    const readable = Readable.fromWeb(response.body)
    const output = fs.createWriteStream(symbolPath)
    // create symbol
    if (response.headers['content-encoding'] === 'gzip') {
      // decompress the gzip
      await pipeline(readable, createGunzip(), output)
    } else {
      await pipeline(readable, output)
    }
  } else if (response.status === 404) {
    return false
  } else {
    throw new Error(`Response code ${response.status} (${response.statusText})`)
  }

  return true
}

if ((await fs.promises.realpath(process.argv[1])) === fileURLToPath(import.meta.url)) {
  const {
    positionals,
    values: { force, help, version },
  } = parseArgs({
    allowPositionals: true,
    options: {
      force: {
        type: 'boolean',
      },
      help: {
        type: 'boolean',
      },
      version: {
        type: 'boolean',
      },
    },
  });

  if (positionals.length !== 1 || help) {
    console.log(`electron-symbolicate-mac <file>

symbolicate a textual crash dump

Positionals:
  file  path to crash dump

Options:
  --force    Redownload symbols if present in cache
  --help     Show help
  --version  Show version number`)
    process.exit(0)
  }

  if (version) {
    console.log(JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url))).version)
    process.exit(0)
  }

  symbolicate({ file: positionals[0], force }).then(console.log, console.error)
}
