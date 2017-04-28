const ChildProcess = require('child_process')
const electronDownload = require('electron-download')
const extractZip = require('extract-zip')
const fs = require('fs')
const path = require('path')

module.exports = (options, callback) => {
  const {version, quiet, file, force} = options
  const directory = path.join(__dirname, 'cache', version)

  const addresses = getAddresses(file)

  download({version, quiet, directory, force}, (error) => {
    if (error != null) return callback(error)

    const symbols = []
    const symbolicateNextAddress = () => {
      const address = addresses.shift()
      if (address == null) return callback(null, symbols)

      if (address.line != null) {
        symbols.push(address.line)
        symbolicateNextAddress()
      } else {
        symbolicate({directory, address}, (error, symbol) => {
          if (error != null) return callback(error)
          symbols.push(symbol)
          symbolicateNextAddress()
        })
      }
    }
    symbolicateNextAddress()
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
    const segments = line.split(/\s+/)
    const index = parseInt(segments[0])
    if (!isFinite(index)) return

    const library = segments[1]
    const address = segments[2]
    const image = segments[3]

    // images are of the format: 0x10eb25000
    if (/0x[0-9a-fA-F]+/.test(image)) {
      addresses.push({library, image, address})
    } else {
      addresses.push({line: segments.slice(3).join(' ')})
    }
  })
  return addresses
}

const getLibraryPath = (rootDirectory, library) => {
  switch (library) {
    case 'libnode.dylib':
      return path.join(rootDirectory, 'libnode.dylib.dSYM', 'Contents', 'Resources', 'DWARF', 'libnode.dylib')
    default:
      return path.join(rootDirectory, 'Electron framework.framework.dSYM', 'Contents', 'Resources', 'DWARF', 'Electron Framework')
  }
}
