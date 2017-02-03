# electron-atos

Symbolicate an [Electron](http://electron.atom.io) macOS crash report that is
missing symbols using [atos](https://developer.apple.com/legacy/library/documentation/Darwin/Reference/ManPages/man1/atos.1.html).

This library downloads the `dSYM` assets needed to symbolicate and stores them
in a `cache` folder relative to the module. These files are large (~300MB) and
may take some time download initially.

Symbolicating may take some time since the frameworks loaded are quite large.
Expect each line in the file to take up to 5 seconds to symbolicate.

```
npm install electron-atos
```

## Usage

- Copy the lines missing symbols from a crash report to a local `crash.txt` file:

```
0   com.github.electron.framework 	0x000000010d01fad3 0x10c497000 + 12094163
1   com.github.electron.framework 	0x000000010d095014 0x10c497000 + 12574740
```

- Run `electron-atos` and specify the path to the file and the version of
  Electron that was being used.

```sh
electron-atos --file /path/to/crash.txt --version 1.4.14
```

- The symbols of the given address will be printed out:

```
content::RenderProcessHostImpl::Cleanup() (in Electron Framework) (render_process_host_impl.cc:1908)
content::ServiceWorkerProcessManager::Shutdown() (in Electron Framework) (__tree:165)
```
