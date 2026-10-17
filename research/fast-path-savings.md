# Mutants: how much each fast path saves

Question (#732): how much does each fast path that survives only as an equivalent Stryker mutant save, on `main` and on `next`? Measured against the same build without it.

Measured on `main` at b803317 and `next` at bba1e87, on 2026-10-17.

## Answer

Two fast paths save real time in the benchmark suite: the sync test lookup (`syncTests` on main, the sync twin on next) and, for non-string primitives only, next's `unboxPrimitive` early return. The parser fast paths for arrays, booleans, strings and numbers save between 0.4 and 24 ns per call. That shows up in a parser micro-benchmark, sometimes in a single type validator, and never above noise in the suite.

### main (b803317)

| Fast path                                             | Source                           | Parser alone                | Type validator           | Suite (3 distinct-value scenarios) | Verdict                                             |
| ----------------------------------------------------- | -------------------------------- | --------------------------- | ------------------------ | ---------------------------------- | --------------------------------------------------- |
| `parseArray` returns an array as is                   | `src/arrays.ts:27`               | 10.1× (24 ns/call, 3 items) | +4.5%, overlaps          | −2.4% to +0.9%, overlaps           | Noise above the parser                              |
| `parseBoolean` boolean                                | `src/booleans.ts:14`             | +14.9% (0.4 ns)             | −2.1%, overlaps          | +0.2% to +1.9%, overlaps           | Noise                                               |
| `parseString` string                                  | `src/strings.ts:41`              | 3.0× (5.6 ns)               | +5.0%, no overlap        | −1.0% to +1.9%, overlaps           | Small real saving per validator, noise in the suite |
| `parseNumber` number                                  | `src/numbers.ts:20`              | 5.2× (7.3 ns)               | +9.3%, no overlap        | +0.6% to +4.1%, overlaps           | Small real saving per validator, noise in the suite |
| `parseNumber` string                                  | `src/numbers.ts:28`              | +28.9% (1.3 ns)             | +1.2%, overlaps          | −0.7% to +0.4%, overlaps           | Noise                                               |
| `syncTests` lookup skips an `await` per built-in test | `src/factories.ts:55–63`, `:113` | n/a                         | +17% to +87%, no overlap | **+8.2% to +19.2%, no overlap**    | Real saving                                         |

### next (bba1e87)

| Fast path                                    | Source                           | Parser alone                                                                                                  | Type validator                                           | Suite (3 distinct-value scenarios)                                      | Verdict                                                              |
| -------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `parseArray` returns an array as is          | `src/arrays.ts:36`               | 10.1× (24 ns/call, 3 items)                                                                                   | +5.7%, overlaps                                          | +0.9% to +2.7%, overlaps                                                | Noise above the parser                                               |
| `parseBoolean` boolean                       | `src/booleans.ts:14`             | +15.6% (0.4 ns)                                                                                               | −1.4%, overlaps                                          | +1.3% to +2.2%, overlaps                                                | Noise                                                                |
| `parseString` string                         | `src/strings.ts:42`              | 2.4× (3.8 ns)                                                                                                 | +7.5%, overlaps                                          | +0.9% to +3.3%, overlaps                                                | Noise above the parser                                               |
| `unboxPrimitive` early return                | `src/primitives.ts:14`           | `parseNumber('42')` +38.7% (3 ns). `parseString` of a number, boolean or bigint: 350× to 600× (2.2 to 6.8 µs) | number validator on a string: +8.2%, no overlap          | +0.8% to +1.1%, overlaps                                                | **Real, large for non-string primitives.** The suite never sends one |
| sync twin skips an `await` per built-in test | `src/factories.ts:78–86`, `:146` | n/a                                                                                                           | +74% to +97% on string and number validators, no overlap | **+9.1% to +17.3%**, no overlap except complex (invalid), which touches | Real saving                                                          |

"Overlaps" means the min–max ranges across 8 runs with and without the fast path overlap, so the difference is within run-to-run noise. Per-call figures are 1/ops(without) − 1/ops(with).

## Observations

- **`unboxPrimitive` does not always make three throwing calls.** Without the early return, the number of `valueOf` calls that throw depends on the type: 0 for a string, 1 for a number, 2 for a boolean, 3 for a bigint, symbol or function. Each throw costs about 2 µs, so `parseString(42)` drops from 161M to 0.46M ops/s. `parseNumber('42')`, the common form-input case, throws nothing and loses only 3 ns. The parent ticket's description ("three throwing `valueOf` calls") holds only for bigints, symbols and functions.
- **The sync twin doesn't help array tests on next.** `array(string)` with `min(1)` saves +0.4% (noise) on next but +17% on main. Next's array runs its array tests through its own awaiting loop, and its item validator `string({ requiredMessage })` has no built-in tests. Main's item validator `string(required())` has one, which the lookup speeds up.
- **The `parseArray` saving grows with array length.** Without the fast path, `[...value]` copies the array. These numbers use three items.
- **Two mutants removed together aren't measured.** With next's `parseString` fast path gone, strings go through `unboxPrimitive`. Each mutant was measured on its own, which is what Stryker reports.

## Method

- **Builds.** `fast-path-savings/variants.mjs` removes each fast path with one text edit that must match exactly once. For the two sync lookups, the edit removes both the lookup and the registration (`syncTests.set`, the `[syncTwin]` property), so every test is awaited. `build-variants.mjs` builds each variant with `pnpm build` (the minified ESM bundle that ships) and runs the full Vitest suite on it. All 11 variants passed, which is consistent with Stryker calling them equivalent.
- **Scenarios** (`scenarios.mjs`):
  - Parser micro-benchmarks call the exported parser on a pool of 16 values of one type.
  - Type-validator scenarios run one validator.
  - Suite scenarios copy each branch's `benchmark/index.mjs`.
  - The tables show the three distinct-value suite scenarios. `results-*.csv` has all five, plus every scenario for every build.
- **Why not `benchmark/`.** Its benchmarkify suite runs every scenario in one process against the installed package, so it can't swap builds or isolate a parser.
- **Runs.** `bench.mjs` runs one scenario in a fresh Node process: 300 ms warm-up, then 700 ms counted with `performance.now()`. `run.mjs` runs every scenario against every build in each round, in a new random build order per round, for 8 rounds per branch. `summarize.mjs` reports the median, min–max and coefficient of variation across rounds.
- **Environment.** Node 22.23.3 (`.nvmrc` says 22), Apple M3 Max with 16 cores, macOS 26.6.2, on AC power. Other sessions were running throughout, with a load average of 4 to 4.6.

To reproduce, run these with Node 22. `<main checkout>` is a built checkout of main. The run writes `results.jsonl` and `all.csv`.

```sh
node research/fast-path-savings/build-variants.mjs main <main checkout> <out>
node research/fast-path-savings/run.mjs main <out> 8 700 results.jsonl
node research/fast-path-savings/summarize.mjs results.jsonl all.csv
```

## Caveats

- **Noise.** CV is 1 to 5% per scenario. The suite scenarios vary by 3 to 4.5%, so any suite difference under about 4% is unresolved.
- **Load.** The machine was shared, with a load average of about 4.5 throughout.
- **Main's rounds ran in two sittings.** Rounds 1–6 ran first and rounds 7–8 about 20 minutes later. Every build ran in both, so drift is spread evenly.
- **Inlined parser numbers.** Parser micro-benchmarks above 300M ops/s mean V8 inlined the parser into the loop. The "with" figure is close to the loop's own cost, so read those rows as ns per call, not as ratios.
- **One machine and Node version.** Other engines (browsers, Bun) weren't measured.

## Details

### main

#### main: no-array-fast-path

| Scenario                         | With (median ops/s) | Without |  Saving | Per call | With: min–max, CV     | Without: min–max, CV | Ranges overlap |
| -------------------------------- | ------------------: | ------: | ------: | -------: | --------------------- | -------------------- | -------------- |
| parseArray(array)                |             387.19M |  38.16M | +914.6% |    24 ns | 383.10M–388.37M, 0.4% | 36.92M–40.39M, 3.5%  | no             |
| array(string) validator          |               1.68M |   1.61M |   +4.5% |    27 ns | 1.63M–1.74M, 2.4%     | 1.56M–1.66M, 2.0%    | yes            |
| suite: simple (distinct values)  |              662.2k |  678.3k |   -2.4% |   -36 ns | 656.0k–687.6k, 1.6%   | 629.1k–689.7k, 3.1%  | yes            |
| suite: complex (distinct values) |              236.7k |  235.0k |   +0.7% |    31 ns | 226.2k–246.3k, 2.7%   | 224.5k–240.7k, 2.6%  | yes            |
| suite: complex (invalid values)  |              153.2k |  151.9k |   +0.9% |    57 ns | 147.6k–155.2k, 2.0%   | 147.0k–155.4k, 1.9%  | yes            |

#### main: no-boolean-fast-path

| Scenario                         | With (median ops/s) | Without | Saving | Per call | With: min–max, CV     | Without: min–max, CV  | Ranges overlap |
| -------------------------------- | ------------------: | ------: | -----: | -------: | --------------------- | --------------------- | -------------- |
| parseBoolean(boolean)            |             350.30M | 304.83M | +14.9% |   0.4 ns | 347.04M–352.21M, 0.5% | 297.62M–307.71M, 1.3% | no             |
| boolean validator                |              14.68M |  15.00M |  -2.1% |  -1.5 ns | 14.15M–15.12M, 2.2%   | 14.64M–15.30M, 1.5%   | yes            |
| suite: simple (distinct values)  |              662.2k |  661.1k |  +0.2% |   2.3 ns | 656.0k–687.6k, 1.6%   | 630.8k–691.0k, 3.2%   | yes            |
| suite: complex (distinct values) |              236.7k |  232.2k |  +1.9% |    81 ns | 226.2k–246.3k, 2.7%   | 224.6k–246.3k, 3.3%   | yes            |
| suite: complex (invalid values)  |              153.2k |  151.4k |  +1.2% |    77 ns | 147.6k–155.2k, 2.0%   | 146.8k–153.0k, 1.4%   | yes            |

#### main: no-string-fast-path

| Scenario                         | With (median ops/s) | Without |  Saving | Per call | With: min–max, CV     | Without: min–max, CV  | Ranges overlap |
| -------------------------------- | ------------------: | ------: | ------: | -------: | --------------------- | --------------------- | -------------- |
| parseString(string)              |             360.42M | 119.70M | +201.1% |   5.6 ns | 355.62M–365.87M, 1.0% | 118.78M–121.01M, 0.8% | no             |
| string validator, 3 tests        |               8.48M |   8.08M |   +5.0% |   5.9 ns | 8.28M–8.86M, 2.2%     | 7.81M–8.20M, 1.8%     | no             |
| suite: simple (distinct values)  |              662.2k |  668.9k |   -1.0% |   -15 ns | 656.0k–687.6k, 1.6%   | 642.4k–681.2k, 2.2%   | yes            |
| suite: complex (distinct values) |              236.7k |  234.7k |   +0.8% |    36 ns | 226.2k–246.3k, 2.7%   | 227.2k–241.1k, 2.3%   | yes            |
| suite: complex (invalid values)  |              153.2k |  150.4k |   +1.9% |   123 ns | 147.6k–155.2k, 2.0%   | 143.3k–153.0k, 2.4%   | yes            |

#### main: no-number-number-fast-path

| Scenario                         | With (median ops/s) | Without |  Saving | Per call | With: min–max, CV     | Without: min–max, CV  | Ranges overlap |
| -------------------------------- | ------------------: | ------: | ------: | -------: | --------------------- | --------------------- | -------------- |
| parseNumber(number)              |             576.91M | 110.70M | +421.2% |   7.3 ns | 563.34M–591.38M, 1.4% | 105.54M–117.98M, 4.0% | no             |
| number validator (number)        |              10.77M |   9.85M |   +9.3% |   8.7 ns | 10.65M–11.15M, 1.5%   | 9.26M–10.24M, 3.6%    | no             |
| suite: simple (distinct values)  |              662.2k |  658.4k |   +0.6% |   8.6 ns | 656.0k–687.6k, 1.6%   | 557.7k–672.2k, 5.9%   | yes            |
| suite: complex (distinct values) |              236.7k |  232.5k |   +1.8% |    76 ns | 226.2k–246.3k, 2.7%   | 216.8k–245.9k, 4.7%   | yes            |
| suite: complex (invalid values)  |              153.2k |  147.1k |   +4.1% |   270 ns | 147.6k–155.2k, 2.0%   | 131.9k–152.2k, 4.7%   | yes            |

#### main: no-number-string-fast-path

| Scenario                         | With (median ops/s) | Without | Saving | Per call | With: min–max, CV     | Without: min–max, CV  | Ranges overlap |
| -------------------------------- | ------------------: | ------: | -----: | -------: | --------------------- | --------------------- | -------------- |
| parseNumber(string)              |             227.98M | 176.80M | +28.9% |   1.3 ns | 222.33M–231.53M, 1.4% | 168.56M–178.35M, 1.9% | no             |
| number validator (string)        |              10.28M |  10.16M |  +1.2% |   1.2 ns | 10.09M–10.49M, 1.5%   | 9.36M–10.67M, 4.0%    | yes            |
| suite: simple (distinct values)  |              662.2k |  666.7k |  -0.7% |   -10 ns | 656.0k–687.6k, 1.6%   | 644.4k–683.5k, 2.3%   | yes            |
| suite: complex (distinct values) |              236.7k |  238.4k |  -0.7% |   -30 ns | 226.2k–246.3k, 2.7%   | 227.6k–244.4k, 2.4%   | yes            |
| suite: complex (invalid values)  |              153.2k |  152.6k |  +0.4% |    26 ns | 147.6k–155.2k, 2.0%   | 144.8k–154.7k, 2.6%   | yes            |

#### main: no-sync-tests

| Scenario                         | With (median ops/s) | Without | Saving | Per call | With: min–max, CV   | Without: min–max, CV | Ranges overlap |
| -------------------------------- | ------------------: | ------: | -----: | -------: | ------------------- | -------------------- | -------------- |
| string validator, 3 tests        |               8.48M |   4.55M | +86.5% |   102 ns | 8.28M–8.86M, 2.2%   | 4.14M–4.65M, 3.5%    | no             |
| number validator (number)        |              10.77M |   6.13M | +75.7% |    70 ns | 10.65M–11.15M, 1.5% | 5.92M–6.26M, 1.8%    | no             |
| array(string) validator          |               1.68M |   1.44M | +17.1% |   101 ns | 1.63M–1.74M, 2.4%   | 1.34M–1.46M, 2.9%    | no             |
| suite: simple (distinct values)  |              662.2k |  555.6k | +19.2% |   290 ns | 656.0k–687.6k, 1.6% | 532.7k–563.9k, 2.2%  | no             |
| suite: complex (distinct values) |              236.7k |  207.9k | +13.8% |   584 ns | 226.2k–246.3k, 2.7% | 202.8k–213.1k, 1.9%  | no             |
| suite: complex (invalid values)  |              153.2k |  141.6k |  +8.2% |   534 ns | 147.6k–155.2k, 2.0% | 135.9k–145.1k, 2.6%  | no             |

### next

#### next: no-array-fast-path

| Scenario                         | With (median ops/s) | Without |  Saving | Per call | With: min–max, CV     | Without: min–max, CV | Ranges overlap |
| -------------------------------- | ------------------: | ------: | ------: | -------: | --------------------- | -------------------- | -------------- |
| parseArray(array)                |             385.78M |  38.20M | +909.8% |    24 ns | 382.91M–393.12M, 1.0% | 35.46M–41.28M, 4.9%  | no             |
| array(string) validator          |               1.89M |   1.79M |   +5.7% |    30 ns | 1.79M–1.95M, 3.3%     | 1.66M–1.81M, 2.9%    | yes            |
| suite: simple (distinct values)  |              717.1k |  703.2k |   +2.0% |    28 ns | 671.2k–726.1k, 3.3%   | 661.9k–729.0k, 3.3%  | yes            |
| suite: complex (distinct values) |              258.9k |  252.2k |   +2.7% |   103 ns | 233.0k–261.8k, 4.5%   | 232.4k–259.9k, 3.7%  | yes            |
| suite: complex (invalid values)  |              169.0k |  167.4k |   +0.9% |    55 ns | 157.4k–172.7k, 3.5%   | 158.4k–170.0k, 2.3%  | yes            |

#### next: no-boolean-fast-path

| Scenario                         | With (median ops/s) | Without | Saving | Per call | With: min–max, CV     | Without: min–max, CV  | Ranges overlap |
| -------------------------------- | ------------------: | ------: | -----: | -------: | --------------------- | --------------------- | -------------- |
| parseBoolean(boolean)            |             349.61M | 302.32M | +15.6% |   0.4 ns | 341.00M–353.77M, 1.2% | 277.84M–312.47M, 4.4% | no             |
| boolean validator                |              19.48M |  19.75M |  -1.4% |  -0.7 ns | 18.87M–19.96M, 2.1%   | 18.64M–20.65M, 3.4%   | yes            |
| suite: simple (distinct values)  |              717.1k |  706.3k |  +1.5% |    21 ns | 671.2k–726.1k, 3.3%   | 678.3k–737.3k, 3.3%   | yes            |
| suite: complex (distinct values) |              258.9k |  255.5k |  +1.3% |    51 ns | 233.0k–261.8k, 4.5%   | 240.5k–263.8k, 3.4%   | yes            |
| suite: complex (invalid values)  |              169.0k |  165.4k |  +2.2% |   127 ns | 157.4k–172.7k, 3.5%   | 162.6k–171.2k, 2.0%   | yes            |

#### next: no-string-fast-path

| Scenario                         | With (median ops/s) | Without |  Saving | Per call | With: min–max, CV     | Without: min–max, CV  | Ranges overlap |
| -------------------------------- | ------------------: | ------: | ------: | -------: | --------------------- | --------------------- | -------------- |
| parseString(string)              |             360.68M | 151.39M | +138.2% |   3.8 ns | 352.98M–364.10M, 1.1% | 145.35M–152.93M, 1.6% | no             |
| string validator, 2 tests        |              11.77M |  10.95M |   +7.5% |   6.4 ns | 10.66M–12.03M, 3.7%   | 10.68M–11.20M, 1.7%   | yes            |
| suite: simple (distinct values)  |              717.1k |  694.5k |   +3.3% |    45 ns | 671.2k–726.1k, 3.3%   | 681.7k–718.3k, 1.7%   | yes            |
| suite: complex (distinct values) |              258.9k |  253.0k |   +2.3% |    90 ns | 233.0k–261.8k, 4.5%   | 228.5k–261.3k, 4.1%   | yes            |
| suite: complex (invalid values)  |              169.0k |  167.5k |   +0.9% |    53 ns | 157.4k–172.7k, 3.5%   | 159.5k–171.1k, 2.6%   | yes            |

#### next: no-unbox-early-return

| Scenario                         | With (median ops/s) | Without |    Saving | Per call | With: min–max, CV     | Without: min–max, CV | Ranges overlap |
| -------------------------------- | ------------------: | ------: | --------: | -------: | --------------------- | -------------------- | -------------- |
| parseNumber(string)              |             127.64M |  92.05M |    +38.7% |   3.0 ns | 123.07M–129.58M, 1.7% | 87.94M–92.95M, 1.8%  | no             |
| parseString(number)              |             161.15M |  460.0k | +34930.8% |  2168 ns | 156.36M–163.21M, 1.4% | 439.0k–467.9k, 2.0%  | no             |
| parseString(boolean)             |             128.59M |  214.2k | +59928.2% |  4660 ns | 122.60M–129.60M, 1.9% | 201.4k–220.3k, 3.0%  | no             |
| parseString(bigint)              |              55.62M |  146.2k | +37955.8% |  6824 ns | 54.38M–56.62M, 1.7%   | 139.3k–149.2k, 2.2%  | no             |
| number validator (string)        |              14.37M |  13.29M |     +8.2% |   5.7 ns | 13.87M–14.76M, 2.3%   | 12.87M–13.80M, 2.9%  | no             |
| suite: simple (distinct values)  |              717.1k |  711.2k |     +0.8% |    12 ns | 671.2k–726.1k, 3.3%   | 686.0k–732.3k, 2.7%  | yes            |
| suite: complex (distinct values) |              258.9k |  256.1k |     +1.1% |    42 ns | 233.0k–261.8k, 4.5%   | 244.6k–261.6k, 2.5%  | yes            |
| suite: complex (invalid values)  |              169.0k |  167.3k |     +1.0% |    59 ns | 157.4k–172.7k, 3.5%   | 160.5k–171.8k, 2.6%  | yes            |

#### next: no-sync-twin

| Scenario                         | With (median ops/s) | Without | Saving | Per call | With: min–max, CV   | Without: min–max, CV | Ranges overlap |
| -------------------------------- | ------------------: | ------: | -----: | -------: | ------------------- | -------------------- | -------------- |
| string validator, 2 tests        |              11.77M |   5.99M | +96.7% |    82 ns | 10.66M–12.03M, 3.7% | 5.80M–6.11M, 1.9%    | no             |
| number validator (number)        |              15.91M |   9.13M | +74.2% |    47 ns | 14.85M–16.20M, 2.8% | 8.74M–9.30M, 2.1%    | no             |
| array(string) validator          |               1.89M |   1.89M |  +0.4% |   2.1 ns | 1.79M–1.95M, 3.3%   | 1.80M–1.92M, 2.0%    | yes            |
| suite: simple (distinct values)  |              717.1k |  632.6k | +13.4% |   186 ns | 671.2k–726.1k, 3.3% | 580.3k–649.5k, 3.8%  | no             |
| suite: complex (distinct values) |              258.9k |  220.6k | +17.3% |   669 ns | 233.0k–261.8k, 4.5% | 215.9k–230.2k, 2.6%  | no             |
| suite: complex (invalid values)  |              169.0k |  154.9k |  +9.1% |   536 ns | 157.4k–172.7k, 3.5% | 149.0k–160.2k, 2.5%  | yes            |
