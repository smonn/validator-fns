Benchmark suite for `validator-fns`.

Each schema runs twice: once with the same value on every call, and once with a distinct value per call. The distinct-value scenarios are closer to real form and API traffic, and they include the cost of building each value.

The complex schema also runs with a value where every field fails, so the suite measures invalid results and message formatting too.

Run the full suite with `pnpm install` and `pnpm start` in this directory, after `pnpm build` in the repo root. `pnpm check` runs `pnpm bench:smoke`, which installs these dependencies from `pnpm-lock.yaml` and runs each scenario briefly with `--smoke`, so a scenario that fails breaks the check. Its numbers aren't measurements.
