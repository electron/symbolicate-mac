# electron-atos

Symbolicate an [Electron](http://electron.atom.io) macOS crash report that is
missing symbols.

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
