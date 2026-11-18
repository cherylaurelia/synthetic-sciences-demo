import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseRun, parseRuns, timedOut } from "./runs.ts";

test("parses an agent run that timed out with no output", () => {
  const run = parseRun("shipped-2.0.153 | no env | run | exit=124 | 30.18s | bytes=0 | ");
  assert.equal(run.env, null);
  assert.equal(run.launcher, "agent");
  assert.equal(run.seconds, 30.18);
  assert.equal(run.output, "");
  assert.ok(timedOut(run));
});

test("keeps the env override and the last output line", () => {
  const run = parseRun(
    "main+fix-ci-path-build | CBOR_NATIVE_ACCELERATION_DISABLED=true | version | exit=0 | 0.45s | bytes=47 | 0.0.0-x",
  );

  assert.equal(run.env, "CBOR_NATIVE_ACCELERATION_DISABLED=true");
  assert.equal(run.command, "--version");
  assert.equal(run.output, "0.0.0-x");
  assert.ok(!timedOut(run));
});

test("parses the Terminal.app line", () => {
  const run = parseRun("terminal | shipped-2.0.153 | --version | exit=124 | 45.03s | ");
  assert.equal(run.launcher, "Terminal.app");
  assert.equal(run.build, "shipped-2.0.153");
  assert.ok(timedOut(run));
});

test("rejects a malformed line instead of guessing", () => {
  assert.throws(() => parseRun("shipped | run | 3s"));
  assert.throws(() => parseRun("a | b | c | exit=0 | fast | bytes=1 | x"));
});

test("the logged file parses and every hang is a timeout with no output", () => {
  const runs = parseRuns(readFileSync(new URL("../data/before-after.txt", import.meta.url), "utf8"));
  assert.ok(runs.length >= 11);

  for (const run of runs.filter(timedOut)) assert.equal(run.output, "");
});
