const fs = require('fs')
const os = require('os')
const path = require('path')
const ChildProcess = require('child_process')

const electronDownload = require('electron-download')
const extractZip = require('extract-zip')
const mapLimit = require('async/mapLimit')

module.exports = (options, callback) => {
  const {version, quiet, file, force} = options
  const directory = path.join(__dirname, 'cache', version)

  const addresses = getAddresses(file)

  download({version, quiet, directory, force}, (error) => {
    if (error != null) return callback(error)

    mapLimit(addresses, os.cpus().length, (address, cb) => {
      if (address.line != null) {
        cb(null, address.line)
      } else {
        symbolicate({directory, address}, cb)
      }
    }, callback)
  })
}

const download = (options, callback) => {
  const {version, quiet, directory, force} = options

  if (fs.existsSync(directory) && !force) return callback()

  electronDownload({
    version: version,
    dsym: true,
    platform: 'darwin',
    arch: 'x64',
    quiet: quiet,
    force: force
  }, (error, zipPath) => {
    if (error != null) return callback(error)
    extractZip(zipPath, {dir: directory}, callback)
  })
}

const symbolicate = (options, callback) => {
  const {directory, address} = options

  const command = 'atos'
  const args = [
    '-o',
    getLibraryPath(directory, address.library),
    '-l',
    address.image
  ]
  const atos = ChildProcess.spawn(command, args)
  let output = ''
  let error = ''
  atos.on('close', (code) => {
    if (code === 0) {
      callback(null, output.trim())
    } else {
      error = `atos exited with ${code}: ${error}`
      callback(new Error(error))
    }
  })
  atos.stdout.on('data', (data) => {
    output += data.toString()
  })
  atos.stderr.on('data', (data) => {
    error += data.toString()
  })
  atos.stdin.write(address.address)
  atos.stdin.end()
}

const getAddresses = (file) => {
  const content = fs.readFileSync(file, 'utf8')
  const addresses = []
  content.split('\n').forEach((line) => {
    if (line.match(/load address/)) {
      addresses.push(parseSamplingAddress(line))
    } else {
      addresses.push(parseAddress(line))
    }
  })
  return addresses
}

// Lines from stack traces are of the format:
// 0   com.github.electron.framework  0x000000010d01fad3 0x10c497000 + 12094163
const parseAddress = (line) => {
  const segments = line.split(/\s+/)
  const index = parseInt(segments[0])
  if (!isFinite(index)) return

  const library = segments[1]
  const address = segments[2]
  const image = segments[3]

  // images are of the format: 0x10eb25000
  if (/0x[0-9a-fA-F]+/.test(image)) {
    return {library, image, address}
  } else {
    return {line: segments.slice(3).join(' ')}
  }
}

// Lines from macOS sampling reports are of the format:
// 2189 ???  (in Electron Framework)  load address 0x1052bd000 + 0x3f8e36  [0x1056b5e36]
const parseSamplingAddress = (line) => {
  const isElectron = line.match(/\(in Electron Framework\)/)
  const isNode = line.match(/\(in libnode\.dylib\)/)
  if (!isElectron && !isNode) return

  const addressMatch = line.match(/\[(0x[0-9a-fA-F]+)]/)
  if (!addressMatch) return

  const imageMatch = line.match(/(0x[0-9a-fA-F]+)/)
  if (!imageMatch) return

  const library = isElectron
    ? 'com.github.electron.framework'
    : 'libnode.dylib'
  const address = addressMatch[1]
  const image = imageMatch[1]

  return {library, image, address}
}

const getLibraryPath = (rootDirectory, library) => {
  switch (library) {
    case 'libnode.dylib':
      return path.join(rootDirectory, 'libnode.dylib.dSYM', 'Contents', 'Resources', 'DWARF', 'libnode.dylib')
    default:
      return path.join(rootDirectory, 'Electron framework.framework.dSYM', 'Contents', 'Resources', 'DWARF', 'Electron Framework')
  }
}
