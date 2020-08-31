# electron-symbolicate-mac

Symbolicate an [Electron](https://www.electronjs.org/) macOS crash report that is
missing symbols. Wraps
[atos](https://www.manpagez.com/man/1/atos/)
with convenient parsing and downloading of Electron symbols.

This tool downloads the `dSYM` assets needed to symbolicate and stores them in
a `cache` folder relative to the module. These files are large (~300MB) and may
take some time download initially.

```
npm install @electron/symbolicate-mac
```

## Usage

- Copy the lines missing symbols from a crash report to a local `crash.txt` file:

```
0   com.github.electron.framework 	0x000000010d01fad3 0x10c497000 + 12094163
1   com.github.electron.framework 	0x000000010d095014 0x10c497000 + 12574740
```

- Run `electron-symbolicate-mac` and specify the path to the file and the
  version of Electron that was being used.

```sh
electron-symbolicate-mac --file /path/to/crash.txt --version 8.3.3
```

- The symbols of the given address(es) will be printed out:

```
content::RenderProcessHostImpl::Cleanup() (in Electron Framework) (render_process_host_impl.cc:1908)
content::ServiceWorkerProcessManager::Shutdown() (in Electron Framework) (__tree:165)
```
