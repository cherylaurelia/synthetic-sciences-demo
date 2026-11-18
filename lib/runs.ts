export type Run = {
  build: string;
  launcher: "agent" | "Terminal.app";
  env: string | null;
  command: string;
  exitCode: number;
  seconds: number;
  output: string;
};

const TIMEOUT_EXIT = 124;

function field(raw: string, prefix: string): string {
  if (!raw.startsWith(prefix)) throw new Error(`expected ${prefix} in "${raw}"`);

  return raw.slice(prefix.length);
}

function seconds(raw: string): number {
  const value = Number.parseFloat(raw.replace(/s$/, ""));

  if (Number.isNaN(value)) throw new Error(`bad duration "${raw}"`);

  return value;
}

// Lines come from bench/run.sh: "build | env | cmd | exit=N | 1.23s | bytes=N | last output line".
// The Terminal.app run logs "terminal | build | cmd | exit=N | 1.23s | output".
export function parseRun(line: string): Run {
  const parts = line.split(" | ").map((part) => part.trim());

  if (parts[0] === "terminal") {
    const [, build, command, exit, time, output = ""] = parts;

    return {
      build,
      launcher: "Terminal.app",
      env: null,
      command,
      exitCode: Number(field(exit, "exit=")),
      seconds: seconds(time),
      output,
    };
  }

  if (parts.length < 6) throw new Error(`bad run line "${line}"`);
  const [build, env, command, exit, time, , output = ""] = parts;

  return {
    build,
    launcher: "agent",
    env: env === "no env" ? null : env,
    command: command === "version" ? "--version" : `run "Reply with the single word: ready"`,
    exitCode: Number(field(exit, "exit=")),
    seconds: seconds(time),
    output,
  };
}

export function parseRuns(text: string): Run[] {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.startsWith("#"))
    .map(parseRun);
}

export function timedOut(run: Run): boolean {
  return run.exitCode === TIMEOUT_EXIT;
}
