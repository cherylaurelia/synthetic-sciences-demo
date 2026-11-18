import { readFileSync } from "node:fs";
import path from "node:path";
import { parseRuns, timedOut, type Run } from "@/lib/runs";

const FORK = "https://github.com/cherylaurelia/openscience";
const COMMIT = "2b999db613980459edee490ab05077d72d3eba48";
const DEMO_REPO = "https://github.com/cherylaurelia/synthetic-sciences-demo";

const BUILD_LABEL = new Map([
  ["shipped-2.0.153", "Shipped 2.0.153 (npm, curl installer)"],
  ["main-ci-path-build", "main, rebuilt at the CI path"],
  ["main+fix-ci-path-build", "main + fix, rebuilt at the CI path"],
]);

function readData(name: string): string {
  return readFileSync(path.join(process.cwd(), "data", name), "utf8");
}

function shown(run: Run): string {
  if (run.command !== "--version") return "model replied";

  return run.output.startsWith("0.0.0-") ? "printed the build version" : `printed ${run.output}`;
}

function Result({ run }: { run: Run }) {
  if (timedOut(run)) {
    return <span className="text-stop">nothing printed, killed at {run.seconds.toFixed(0)} s</span>;
  }

  return (
    <span className="text-ok">
      {run.seconds.toFixed(2)} s · exit 0 · {shown(run)}
    </span>
  );
}

function RunTable({ runs }: { runs: Run[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-inset">
      <table className="w-full min-w-[640px] text-left text-[15px]">
        <thead className="border-b border-line text-weak">
          <tr>
            <th className="px-4 py-3 font-normal">Binary</th>
            <th className="px-4 py-3 font-normal">Command</th>
            <th className="px-4 py-3 font-normal">Result</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={`${run.build}-${run.launcher}-${run.env}-${run.command}`} className="border-b border-line last:border-0">
              <td className="px-4 py-3 align-top">
                {BUILD_LABEL.get(run.build) ?? run.build}
                {run.launcher === "Terminal.app" ? <span className="block text-sm text-weak">opened in Terminal.app, where a person could answer the prompt</span> : null}
                {run.env ? <span className="block font-mono text-xs text-brand">{run.env}</span> : null}
              </td>
              <td className="px-4 py-3 align-top font-mono text-sm">openscience {run.command}</td>
              <td className="px-4 py-3 align-top">
                <Result run={run} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiffLine({ line }: { line: string }) {
  if (line.startsWith("+") && !line.startsWith("+++")) return <span className="block text-ok">{line}</span>;

  if (line.startsWith("-") && !line.startsWith("---")) return <span className="block text-stop">{line}</span>;

  if (line.startsWith("@@")) return <span className="block text-brand">{line}</span>;

  return <span className="block text-weak">{line}</span>;
}

const STEPS = [
  ["modal", "OpenScience bundles the Modal SDK for remote compute, which imports cbor-x at startup."],
  ["cbor-x", "cbor-x asks node-gyp-build for its optional native addon, using its own folder as the starting point."],
  ["/home/runner/…", "In a compiled binary that folder is the CI build path, kept as a literal: /home/runner/work/openscience/openscience/node_modules/.bun/cbor-extract@2.2.2/…"],
  ["macOS /home", "On a Mac, /home is an automount. Bun's require() of a path there makes macOS check the network-volumes permission (system log: checking kTCCServiceSystemPolicyNetworkVolumes for openscience)."],
  ["no answer", "Until someone answers, the process waits before printing anything. An agent, a launchd job or a script can't answer, so it waits for good."],
] as const;

export default function Page() {
  const runs = parseRuns(readData("before-after.txt"));

  const diff = readData("fix-script.diff")
    .split("\n")
    .filter((line) => !line.startsWith("diff --git") && !line.startsWith("index "));

  const before = runs.filter((run) => run.build !== "main+fix-ci-path-build" && run.env === null);
  const after = runs.filter((run) => run.build === "main+fix-ci-path-build" || run.env !== null);

  return (
    <main className="mx-auto max-w-[920px] px-5 py-12 sm:px-8 sm:py-16">
      <p className="mb-6 inline-block rounded-md border border-line px-3 py-1 text-sm text-weak">
        OpenScience 2.0.153 · macOS arm64 · tested 17 Nov 2026
      </p>
      <h1 className="text-[34px] leading-tight text-strong sm:text-[44px]">
        The macOS binary can hang before it prints anything, even <code className="whitespace-nowrap font-mono text-[0.8em]">--version</code>.
      </h1>
      <p className="mt-5 text-lg">
        One define in the release build fixes it: tell cbor-x not to look for a native addon the binary never contains.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a className="rounded-md bg-strong px-4 py-2 text-bg hover:bg-white" href={`${FORK}/commit/${COMMIT}`}>
          View the fix (fork branch)
        </a>
        <a className="rounded-md border border-line px-4 py-2 text-strong hover:bg-row" href={DEMO_REPO}>
          Demo repo and run logs
        </a>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl text-strong">Before</h2>
        <p className="mt-2 mb-4 text-weak">
          The scripted path from the README (<span className="font-mono text-sm">openscience run</span> from a script, an agent or a launchd job) never
          returns and prints no error. Fresh install, throwaway HOME, local Ollama model added with <span className="font-mono text-sm">openscience local add</span>,
          30 s cap. The last row was opened through Terminal.app instead; it made the same permission request and printed nothing in 45 s (nobody was there to
          see or answer a dialog).
        </p>
        <RunTable runs={before} />
      </section>

      <section className="mt-12">
        <h2 className="text-2xl text-strong">After</h2>
        <p className="mt-2 mb-4 text-weak">
          Same machine, same commands. The env var is the runtime switch; the fixed build sets it at compile time, so nobody has to know about it.
        </p>
        <RunTable runs={after} />
      </section>

      <section className="mt-14">
        <h2 className="text-2xl text-strong">Why it waits</h2>
        <ol className="mt-5 space-y-4">
          {STEPS.map(([label, text], index) => (
            <li key={label} className="grid grid-cols-[2rem_1fr] gap-3">
              <span className="text-brand">{index + 1}.</span>
              <span>
                <span className="font-mono text-sm text-strong">{label}</span>
                <span className="block">{text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-weak">
          Your own CI can't see it: release binaries are compiled on ubuntu-latest, and the macOS runners never ask privacy questions. From source (
          <span className="font-mono text-sm">bun dev</span>) the path is local, so it doesn't happen there either.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl text-strong">The fix</h2>
        <p className="mt-2 mb-4 text-weak">
          The addon is never inside a release binary, so cbor-x already fell back to its JavaScript decoder there. Defining the switch skips only the lookup.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-line bg-inset p-4 font-mono text-[13px] leading-relaxed">
          {diff.map((line, index) => (
            // SAFETY: diff lines are static and never reordered, so the index is a stable key.
            <DiffLine key={index} line={line} />
          ))}
        </pre>
        <ul className="mt-5 list-disc space-y-2 pl-6">
          <li>
            Rebuilt with their <span className="font-mono text-sm">script/build.ts --target darwin-arm64</span> in <span className="font-mono text-sm">oven/bun:1.3.14</span>{" "}
            at <span className="font-mono text-sm">/home/runner/work/openscience/openscience</span>, the path their CI uses: main hangs, main + fix runs.
          </li>
          <li>
            A new test bundles cbor-x with the define and checks native acceleration is off and a value still round-trips. It fails without the define.
          </li>
          <li>
            Two other build-path literals remain, in @grpc/grpc-js proto include paths. They load only for channelz/ORCA and are read with plain fs calls, which
            returned ENOENT at once for /home paths in my probe, so they don't trigger the wait.
          </li>
          <li>Their full CI (typecheck, format, tests, web build, runtime compatibility) passes on the fork. Changelog line included.</li>
          <li className="text-weak">Not tested: the Desktop app, Intel Macs, Windows. Own finding, no user report yet.</li>
        </ul>
      </section>

      <footer className="mt-16 border-t border-line pt-6 text-sm text-weak">
        Unofficial demo by Cheryl Aurelia: not affiliated with Synthetic Sciences. OpenScience is their open-source project (Apache-2.0). Font: CMU Concrete (SIL OFL).
      </footer>
    </main>
  );
}
