# OpenScience on macOS: a startup hang and a one-define fix

Unofficial demo by Cheryl Aurelia, not affiliated with Synthetic Sciences.

## The problem
The shipped OpenScience 2.0.153 macOS arm64 binary (npm `@synsci/openscience` and the
`openscience-darwin-arm64.zip` the curl installer downloads; same sha256) can print nothing, even for
`openscience --version`, while macOS waits for an answer to a network-volume permission check.

- Launched by an agent: `--version` and `openscience run` printed 0 bytes before the 30 s cap.
- Launched in Terminal.app: `--version` printed nothing before the 45 s cap.
- With `CBOR_NATIVE_ACCELERATION_DISABLED=true`: `--version` in 0.36 s, a local-model `run` in 3.2 s.

All runs: [`data/before-after.txt`](data/before-after.txt), produced by [`data/run.sh`](data/run.sh).

## Why
`modal` imports `cbor-x` at startup. cbor-x looks for its optional native addon starting from its own
folder, which a compiled binary keeps as the CI build path
`/home/runner/work/openscience/openscience/node_modules/.bun/cbor-extract@2.2.2/...`. On macOS `/home` is
an automount, and Bun's `require()` of a path there triggers
`checking kTCCServiceSystemPolicyNetworkVolumes for openscience` (system log), then waits.

## The fix
Branch `fix/macos-native-probe-hang` on [cherylaurelia/openscience](https://github.com/cherylaurelia/openscience/tree/fix/macos-native-probe-hang):
define `process.env.CBOR_NATIVE_ACCELERATION_DISABLED` as `"true"` in the release `Bun.build`
([`data/fix-script.diff`](data/fix-script.diff)), plus a test and a changelog line. The addon is never in
a release binary, so cbor-x already used its JavaScript decoder there.

Verified by building darwin-arm64 with their `script/build.ts --target darwin-arm64 --headless` in
`oven/bun:1.3.14` at `/home/runner/work/openscience/openscience`: main hangs, main + fix runs. Their CI
passes on the fork. Not tested: Desktop app, Intel Macs, Windows.

## Run the page
```
npm install
npm run build && npm run start
npm test    # parser tests for the run log
```
