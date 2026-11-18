#!/bin/zsh
# Before/after for the macOS startup hang. Throwaway HOME, local Ollama model, 30 s cap.
set -u
ROOT=${ROOT:?set ROOT to the folder holding scratch/ and job-scout/}
OUT=$ROOT/job-scout/data/research/synthetic-sciences/before-after.txt
export HOME=$ROOT/scratch/os-eval/home
cd /tmp/osproj
typeset -A BIN
BIN[shipped-2.0.153]=$ROOT/scratch/os-eval/pkg/node_modules/.bin/openscience
BIN[main-ci-path-build]=$ROOT/scratch/osbuilds/base/openscience
BIN[main+fix-ci-path-build]=$ROOT/scratch/osbuilds/final/openscience
echo "# $(date -u +%FT%TZ) macOS $(sw_vers -productVersion) $(uname -m); cap 30 s" > $OUT
for name in shipped-2.0.153 main-ci-path-build main+fix-ci-path-build; do
  for envv in "" "CBOR_NATIVE_ACCELERATION_DISABLED=true"; do
    [[ $name == main+fix* && -n $envv ]] && continue
    for cmd in version run; do
      s=$(perl -MTime::HiRes=time -e 'printf "%.3f", time')
      if [[ $cmd == version ]]; then env ${=envv} timeout 30 ${BIN[$name]} --version </dev/null >/tmp/osproj/o.txt 2>&1
      else env ${=envv} timeout 30 ${BIN[$name]} run --model local-11434/qwen3:0.6b --deny-prompts "Reply with the single word: ready" </dev/null >/tmp/osproj/o.txt 2>&1; fi
      rc=$?
      e=$(perl -MTime::HiRes=time -e "printf '%.2f', time-$s")
      echo "$name | ${envv:-no env} | $cmd | exit=$rc | ${e}s | bytes=$(wc -c </tmp/osproj/o.txt | tr -d ' ') | $(tail -1 /tmp/osproj/o.txt | head -c 50)" >> $OUT
    done
  done
done
cat $OUT
