# @electron/symbolicate-mac

[![Test](https://github.com/electron/symbolicate-mac/actions/workflows/test.yml/badge.svg)](https://github.com/electron/symbolicate-mac/actions/workflows/test.yml)
[![npm version](http://img.shields.io/npm/v/@electron/symbolicate-mac.svg)](https://npmjs.org/package/@electron/symbolicate-mac)

Symbolicate an [Electron](https://www.electronjs.org/) macOS crash report that is
missing symbols. Wraps [parse-breakpad](https://github.com/nornagon/parse-breakpad) with
convenient parsing and downloading of symbol files.

This tool downloads the symbol files needed to symbolicate and stores them in a
`cache` folder relative to the module. These files are large (~400MB) and may
take some time download initially.

```
$ npx @electron/symbolicate-mac /path/to/crash
```

Note that the crash file must be the _full_ crash, including the "Binary
Images" section, or else symbolicate-mac won't be able to discover which exact
version of Electron to use.

## Usage

- Obtain a complete crash dump, sampling report, or spindump.

```
Process: Slack [2214]
Path: /Applications/Slack.app/Contents/MacOS/Slack
Identifier: com.tinyspeck.slackmacgap

Thread 0 Crashed:: Dispatch queue: com.apple.main-thread
[...]
91 com.github.Electron.framework 0x000000010ae32a06 v8::internal::SetupIsolateDelegate::SetupHeap(v8::internal::Heap*) + 2919558
92 com.github.Electron.framework 0x000000010ae36119 v8::internal::SetupIsolateDelegate::SetupHeap(v8::internal::Heap*) + 2933657
[...]
Binary Images:
0x109ae8000 - 0x109b37fcf +com.tinyspeck.slackmacgap (4.18.0 - 6748) <AB3CB5D1-EB3F-388F-8C63-416A00DA1AAA> /Applications/Slack.app/Contents/MacOS/Slack
0x109b49000 - 0x1115c0f7f +com.github.Electron.framework (13.1.6) <36C7F681-FAD6-3CD1-B327-6C1054C359C7> /Applications/Slack.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework
[...]
```

- Run `@electron/symbolicate-mac` and specify the path to the file

```sh
npx @electron/symbolicate-mac /path/to/crash.txt
```

- The crash will be printed out, with symbols resolved:

```
[...]
91 com.github.Electron.framework 0x000000010ae32a06 content::BrowserMainLoop::EarlyInitialization()
92 com.github.Electron.framework 0x000000010ae36119 content::BrowserMainRunnerImpl::Initialize(content::MainFunctionParams const&)
[...]
```
