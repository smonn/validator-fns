# Mutants: how much each fast path saves

> **Interim, incomplete.** main: 6 of 8 rounds. next: not measured yet. The final version replaces this file.

Question (#732): how much does each fast path that survives only as an equivalent Stryker mutant save, on `main` (b803317) and `next` (bba1e87)?

Method: each "without" build removes one fast path from the source with one text edit (`fast-path-savings/variants.mjs`). It is built with `pnpm build` (the minified ESM bundle that ships) and passes the full Vitest suite. Each scenario runs in a fresh Node process: 300 ms warm-up, then 700 ms counted (`bench.mjs`). Each round runs every scenario against every build, in random build order (`run.mjs`). Saving = with ÷ without − 1. Node 22.23.3 (`.nvmrc`), Apple M3 Max, macOS 26.6.2, AC power, other sessions running (load about 4).

## main (interim, 6 rounds)

| Fast path | Parser alone | Type validator | Benchmark suite |
|---|---|---|---|
| `parseArray` array | +920% (24 ns) | +4.0%, ranges overlap | within noise |
| `parseBoolean` boolean | +15.5% (0.4 ns) | within noise | within noise |
| `parseString` string | +201% (5.6 ns) | +4.9% | within noise |
| `parseNumber` number | +412% (7.1 ns) | +9.0% | within noise (+0.6 to +3.5%, overlapping) |
| `parseNumber` string | +29% (1.3 ns) | within noise | within noise |
| `syncTests` | n/a | +16% to +85% | +7.5% to +19%, no overlap |

Full per-scenario numbers: `fast-path-savings/results-main.csv`.
