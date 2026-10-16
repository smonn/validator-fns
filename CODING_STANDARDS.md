# smonn's coding standards

Oct 16, 2026 · [smonn](https://github.com/smonn)

## Purpose and scope

These are my recommended standards for code I write or review, by hand or with AI agents. They are language agnostic unless a section says otherwise. Projects under audit or regulatory regimes (SOC 2, HIPAA, PCI DSS, GDPR) layer those requirements on top; they tighten these standards, never loosen them.

Keywords carry weight:

- **Must**: hard constraint, used where a reviewer reading the diff can tell whether it was followed, or where a tool or the repository's configuration checks it. An exception needs approval (see Exceptions).
- **Should**: strong default. An exception needs a stated reason (see Exceptions).
- **May**: option worth considering. No justification needed either way.

**Exceptions**

- **Terms.** A change is one PR. An exception is a recorded decision not to follow a rule in one PR. Floors are the Must-level checks and thresholds in Static analysis, the must rules in Security, and the must rules in Merge gates.
- **Should exceptions** need the rule and a reason in the PR description.
- **Must exceptions** need the rule, a reason, a tracking issue to remove the exception, and approval in review.
- **Who approves.** Approval comes from a reviewer other than the author. In a repository with a single maintainer, the maintainer approves their own exceptions and the PR says so. An AI agent's review never counts as approval.
- **Checks.** An exception to a check is an inline suppression carrying its reason. A check that cannot be suppressed inline, such as coverage, takes a waiver on the PR that CI recognizes (for example a label), approved like any must exception. Formatting and compile errors have no exceptions. A check's configuration never changes for one PR.
- **Standing scopes.** A check's configuration **may** permanently exclude a category of change (for example dependency-bot PRs from the release-note check). The exclusion is approved like a must exception and recorded in the configuration with its reason. It is not a per-PR exception. A standing scope **must** key on an identity contributors cannot forge (the PR author, or a branch in the same repository), never a branch name alone. CI runs the full check command by default; a standing scope runs a named subset of it.
- **Lowering code health.** A PR that makes code health worse **must** be either tech debt recorded as a must exception, or an emergency.
- **Emergencies** are production outages, major bugs affecting users, legal issues, security holes, and launches with a hard deadline and serious consequences. They are not: wanting to ship sooner, soft deadlines, the end of the week, a reviewer being away, a manager asking for a same-day review, or rolling back a PR that broke tests or the build.
- **Declaring an emergency.** The author declares it in the PR, and the reviewer confirms it.
- **Emergency review.** The review **may** be shortened to speed and correctness. The reviewer **must** check that the change resolves the emergency. Branch protection and required checks still apply, with failing checks handled as must exceptions.
- **After an emergency.** A full review and any missing tests **must** follow, tracked in an issue.
- **Per project.** A project **may** override style and naming rules, and **may** turn off or adjust a Should- or May-level check, with the reason recorded in the repository. Floors **must not** be loosened at the project level; projects **may** tighten them.
- **For everyone.** Removing or loosening a rule in general happens only through a PR to this document (see Changing these standards).

Product, business, and customer needs drive the feature set and inform the technical implementation, not the other way around. Every rule here should be justified against a concrete problem, not an abstract ideal. A rule that does not fit a codebase is handled through the exceptions above, not dropped silently.

## Reasoning and communication

*Why:* decisions are only as good as the claims behind them, and mixing observation with opinion hides which is which.

Applies to design docs, PR descriptions, reviews, and agent output alike.

- You **should** separate reasoning into phases: observe, evaluate, analyze, synthesize, communicate. Scale the rigor to the decision's reversibility and impact.
- You **must** separate observation from interpretation. "The handler calls the DB three times" is an observation; "the handler is slow" is an interpretation until measured.
- You **should** state confidence levels, tradeoffs, and knowledge gaps explicitly. Prefer precise, falsifiable claims over vague generalizations. Avoid absolutist claims.
- When a tradeoff exists, you **must** name both sides. Do not silently pick one.
- When a requirement is ambiguous, you **should** present numbered options rather than guess and build.
- Written output **should** be dry and plain, moderate-to-high detail, with no recap of what was just said.

## Design principles

*Why:* most of the cost of software is change. These principles keep the next change cheap.

Simple over easy (in Rich Hickey's sense): fewer things braided together, even when the braided version is quicker to write.

- **YAGNI, aggressively.** You **must not** add parameters, options, or abstractions for hypothetical future requirements. This does not apply to structure that is expensive to retrofit (ports for external dependencies, an outbox, message catalogs, value objects): it **may** be built up front, with the retrofit cost stated.
- **Rule of three for DRY.** You **should** abstract duplication only once it reveals a real pattern, usually on the third occurrence. Two similar blocks are cheaper than a wrong abstraction.
- **Simplest correct solution.** You **should** pick the simplest approach that solves the problem correctly. Between two approaches of similar complexity, pick the more readable one. Cleverness needs a measured reason (see Performance).
- **Pure functions, immutable data, explicit data flow.** You **should** prefer these over hidden state and side effects.
- **Data and behavior, not hybrids.** You **should** prefer plain data plus functions over objects that both expose their fields and carry behavior. A type is either a data structure (exposes data, no behavior) or an object (hides data, exposes behavior), not both.
- **Composition over inheritance.** You **should** compose small parts rather than build class hierarchies.
- **Parse, don't validate.** At boundaries you **must** transform untyped input into narrowed types once, rather than checking and passing the raw value along.
- **Make illegal states unrepresentable.** You **should** use the type system (sum types, branded or newtype IDs, required fields) so invalid combinations cannot be constructed.
- **Deep modules.** You **should** prefer a small interface over a large hidden implementation (Ousterhout). A module whose interface is as complex as its body adds cost without hiding anything.
- **Define errors out of existence.** You **should** do this where the semantics allow; Errors lists the techniques.

## Architecture

*Why:* the core is the business value. Isolating it from IO and vendors keeps it testable, portable, and cheap to change.

The structural default is functional core, imperative shell (Gary Bernhardt, "Boundaries"). Most rules in Testing follow from it.

- **Functional core.** Decisions **should** live in pure functions over values. The core takes already-loaded inputs and returns values, including descriptions of what to do next.
- **No impure APIs in the core.** The core **must not** use clock, randomness, filesystem, network, database, environment, or other IO APIs directly. The shell reads them and passes values in (the current time, a generated ID, a seed). Effects go out as returned values for the shell to execute.
- **No third-party dependencies in the core.** The core **should** depend only on the standard library and the project's own code. It is the main value of the software, and a dependency there ties that value to someone else's releases, licensing, and security. Allowed dependencies (for example a decimal library where the standard one is inadequate) **must** be deliberate, documented, and wrapped behind the project's own types, and listed in the dependency check's allowlist.
- **Imperative shell.** IO, mutation, and calls to external systems **should** live in a thin orchestration layer at the edges. The shell loads, calls the core, then acts on the result. It **should not** contain decisions.
- **Ports and adapters.** External dependencies (database, IdP, email, payments, queues) **should** sit behind a port the application owns. Adapters implement ports. Third-party types **should not** leak past the adapter.
- **Persistence models stay at the adapter.** Database rows and ORM entities are not domain objects. The adapter **should** map between them, so schema changes and domain changes stay independent.
- **Thin entry points.** HTTP handlers, CLI commands, and job runners **must not** contain business logic. They check and parse input, call a use case, and map the result to a response.
- **One-directional dependencies.** Dependencies **must** point inward: shell to core, never core to shell. Cycles between modules are a defect.
- **Bounded contexts, sized to be navigable.** You **should** split by real domain boundaries, not by every product noun. If engineers cannot tell where new code belongs, there are too many contexts.
- **Shared glossary.** A codebase **should** keep a domain glossary file. One term means one thing in one context; when the same word means different things (for example "run" vs "run attempt"), the glossary says so and the code follows.
- **Modular monolith first.** You **should** prefer enforced module boundaries in one deployable over premature service splits.
- **Decision records.** Significant architectural decisions **should** get a short ADR in the repository: context, decision, consequences.
- **Optimistic concurrency** **may** replace long transactions: an explicit integer version column, compare on write, retry or abort on mismatch.

## Contracts and migrations

*Why:* other people's code depends on these shapes, and breaking them breaks systems you cannot see.

- Public contracts (HTTP APIs, library exports, package metadata such as entry points, types, and supported runtime versions, event and message schemas, persisted file formats, CLI flags and output) **must** stay backward compatible or be versioned.
- Breaking changes **must** be versioned and announced. Where consumers live outside the repository, they **should** get a deprecation period.
- Libraries **should** follow Semantic Versioning. Dropping a supported runtime version is a breaking change. The lowest supported runtime version **should** run in CI.
- Database migrations **should** follow expand, migrate, contract: add the new shape, move data and readers, then remove the old shape in a later deploy. Running code **must** keep working at every step.
- Migrations **should** be plain SQL files run by a language-agnostic tool (for example [dbmate](https://github.com/amacneil/dbmate)), not ORM-generated code. The schema then outlives any one language, framework, or ORM.

## Background work and integrations

*Why:* requests should stay fast and predictable, and calls to systems you do not control will fail in ways you cannot prevent.

- Slow or unreliable work (third-party calls, email, file and media processing, bulk jobs) **should** run in background workers, off the request path.
- Outbound integrations **should** use a transactional outbox: write the outgoing message in the same transaction as the state change, and let a worker deliver it with retries. A state change and its notification then never disagree.
- Inbound webhooks and third-party events **should** use an inbox: store the raw message durably, acknowledge quickly, process it asynchronously, and deduplicate by message ID.
- Workers **must** be idempotent, since both patterns deliver at least once (see Errors on retries).
- Inbox and outbox records **must** have a retention limit. Raw payloads **should** be purged or redacted once processed, since they often carry personal data.

## Robustness

*Why:* systems fail at their limits and in their unchecked paths. Explicit bounds and checked results turn surprises into handled cases. Adapted from NASA/JPL's "Power of 10" rules.

- **Everything bounded.** Every outbound call **must** have a timeout. Retries, queues, worker concurrency, caches, request body sizes, and query results **must** have explicit limits. Lists returned by APIs that can grow without bound **must** be paginated.
- **No unbounded recursion on untrusted input.** Recursion over external data (JSON trees, user-defined graphs) **must** be depth-limited or rewritten as iteration.
- **Check every result.** Returned errors, results, and promises **must not** be ignored, and the build **must** fail when they are: `no-floating-promises` in TypeScript (with `ignoreVoid` turned off), `errcheck` in Go, `#[must_use]` in Rust. Discarding an error or result on purpose **must** be explicit (`_ =`, `let _ =`) with a comment. A promise **must** have its rejection handled (a `.catch` that handles or logs it), or carry a suppression comment stating why it cannot reject; `void` alone does not count.
- **Smallest scope, immutable by default.** Bindings **should** be immutable (`const`, no `mut`) unless mutation is needed, and declared where they are used.
- **Limit indirection.** `eval`, reflection-based dispatch, monkey patching, and macro-heavy code **should not** be used where plain code works. Control flow **should** be visible in the source.
- **Assert what types cannot express.** Preconditions and postconditions the type system cannot capture **should** be checked with `invariant` (see Errors). There is no assertion density target.

## Performance

*Why:* optimizing without measurement targets the wrong thing, and regressions without a budget go unnoticed until users feel them.

- **Measure before optimizing.** Performance claims and optimizations **should** come with a benchmark or profile showing the problem and the gain.
- **Budgets.** What users feel **should** have a budget in the repository: p95 latency for key endpoints, and JavaScript bundle size and Core Web Vitals for UIs. Budgets **should** be checked in CI where practical.
- **No N+1 queries.** Data access per request **should** be bounded and visible. New hot queries and indexes **should** be checked against their query plans.
- **Caching needs a staleness story.** A cache **must** have a stated invalidation strategy or a stated, acceptable staleness window.
- **Benchmarks in CI.** Hot paths **may** have benchmarks that run in CI and fail on regressions past a threshold.

## Logging and metrics

*Why:* logs and metrics exist to operate the system. Noise in them hides the signal, and gaps in them hide incidents.

- Incidental debug logging **should not** be committed. What may reach production is set under Security (A02).
- Logs **should** be structured (key/value fields) and carry the request ID (see Errors). Personal data stays out (see Security).
- Incidental metrics and instrumentation **should not** be added unless the task asks for them. Instrumentation that budgets and alerting need (see Performance and Security) is fine.

## Infrastructure and deployment

*Why:* an environment that can only be rebuilt from memory cannot be reproduced, reviewed, or trusted.

- Infrastructure **must** be defined as code (for example OpenTofu or Terraform) and changed through PRs like application code.
- Every environment **should** be reproducible from the repository alone. Manual changes in a console are drift and **should** be folded back into code or reverted.
- Deployments **should** be automated and repeatable from a known commit. Configuration comes from the environment, not from per-environment builds.

## Releases

*Why:* a release is where code reaches people who cannot see the repository. Notes written with the change and publishing from CI keep each release reproducible and reviewable.

- Each user-facing change **should** carry its release note in the PR that makes it (for example a changeset). A check **should** fail a PR without one. A PR with no user-facing change records that explicitly (for example an empty changeset).
- Version numbers and changelogs **should** be generated from those notes, not edited by hand.
- Releases **should** be published by CI from a known commit, after the full check command passes. Publishing credentials follow Supply chain (A03).
- A library **should** be tested as published: pack it, then load it from a separate project the way consumers do (for example with both require and import). The Package shape check covers the rest.
- The artifact that passes the checks **should** be the one published, with no rebuild in between.
- The release process **should** document how to recover when publishing fails after the version is bumped.

## Code organization

*Why:* code that changes together should live together, so a feature can be understood and changed in one place.

- Code **should** be organized by feature or domain at the top level, not by technical type. There is no top-level `controllers/`, `services/`, or `models/`.
- Within a feature, the technical split **should** apply: `billing/` holds its core, shell, entry points, and tests. Infrastructure code and genuinely generic shared helpers **should** live outside features.
- Tests **should** be colocated with the code they test, in the language's form: a sibling `*.test.ts`, a `_test.go` file in the same package, or an in-file `#[cfg(test)]` module in Rust.
- Functions **should** take few parameters. When the list grows, group related parameters into a named object or type.
- Magic numbers and strings **should not** appear inline. Name them as constants, or as value objects when they carry a rule. Obvious values in obvious places (`0`, `1`, an empty string) are fine.
- Files **should** stay under roughly 200 lines, excluding imports and type-only declarations; test files under roughly 300. A file approaching the limit is a signal to extract, not to raise the limit. Projects **may** override the numbers.

## Naming

*Why:* code is read far more than it is written, and names are the main interface for every reader, human or agent.

- Variables and parameters **should** name the domain concept, not the type or shape. `household`, not `data`, `result`, `item`, or `record`.
- Generic names (`temp`, `obj`, `val`, `res`, `info`) **must not** be used. Name the actual concept: `parseError`, `choreRow`. This does not apply to `err` or `error` in a catch block where the type is genuinely unknown.
- Booleans and predicates **should** use an `is`, `has`, or `can` prefix: `isApproved`, not `approved`.
- Functions **should** be verb-noun, so the name says what the function does: `approveChore`, not `choreApproval` or `doChore`. Factories **may** use a `create` or `make` prefix.
- Event handlers **should** use `handle` for the function and `on` for the prop or callback slot.
- Names **should** match the glossary. Do not invent synonyms for an existing domain term, and do not reuse a term for a different concept.

**Casing and file names**

| Kind | Convention |
| --- | --- |
| File and directory names | `kebab-case` |
| Database tables and columns | `snake_case` |
| Functions, methods, variables, properties | `camelCase` |
| Classes and types | `PascalCase` |
| Module-level constant values | `UPPER_SNAKE_CASE` |

These are defaults. Project rules and language idioms **must** take precedence, both for casing and for the naming rules above. Rust uses `snake_case` for functions, variables, modules, and files. Go uses `PascalCase` to export a symbol and `camelCase` otherwise, with lowercase file names and idiomatic short names such as `err`. Generic code **may** use generic names (`T`, `item`) where no domain concept exists.

## Comments

*Why:* comments drift from the code they describe. Code that explains itself cannot drift.

- Comments **should** explain WHY, not WHAT. If code needs a WHAT comment, rewrite the code first.
- Genuinely opaque syntax (a complex regex, bit manipulation, an obscure API workaround) **may** get a brief WHAT comment.
- Workarounds, non-obvious type assertions, and external constraints **must** carry a comment stating the reason.
- Doc comments (JSDoc, rustdoc, godoc) **should not** be added to self-documenting signatures. When one parameter is ambiguous (is `rate` 0.07 or 7?), document that parameter only.
- Obvious operations **should not** get inline comments.
- TODO comments **must** say what is left, why it was deferred, and reference a tracking issue: `TODO(#456): handle timezone edge case after #123 lands`.

## Types

*Why:* every rule the compiler enforces is one that review and tests no longer have to.

Language specifics are under Language notes. The general rules:

- The strictest practical compiler or checker settings **should** be on.
- Escape hatches that switch off checking (TypeScript `any`, Rust `unsafe` without need) **must not** be used to silence the compiler. Use the top type (`unknown` in TypeScript) and narrow. Go's top type is `any`; it **should not** appear in domain code and **should** be narrowed with type switches at boundaries.
- Type assertions and casts are a last resort. Each one **must** carry a comment on why inference or narrowing fails. Prefer type guards or assertion functions.
- Suppression directives (`@ts-ignore`, `#[allow(...)]`, `//nolint`) **must** say why and what would remove the need.
- Non-null assertions or unwraps **must not** be used on values that can legitimately be absent at runtime. Handle the absent case explicitly.
- Exhaustiveness checking **must** be on for matches over sum types: a `never` check in TypeScript, `match` in Rust, the `exhaustive` linter in Go.
- Where adding a variant must force callers to change, matches **must** name every variant. A catch-all arm (`_ =>` in Rust, `default` in Go) silently accepts new variants. In TypeScript, the `default` branch holds only the `never` check. Enums from other crates marked `#[non_exhaustive]` require a wildcard, so this rule does not apply to them.
- Domain values with rules **should** be value objects where reasonable: a dedicated, immutable type that can only be constructed through a parser enforcing the rule. Examples: entity IDs, strings with a format (email, slug, currency code), numbers with a range (percentage, quantity). Use a brand or tag in structurally typed languages (a cast can still forge one, which the cast rule above keeps visible), a struct with an unexported field in Go, and a newtype with a private field in Rust. A value with no rule beyond its primitive type stays primitive.
- Pitfall defaults (**may** be overridden with a reason): times stored and passed in UTC, converted only at the edges; money as integer minor units or a decimal type, never binary floating point.

## Errors

*Why:* failures will happen. They should be visible, specific internally, safe externally, and never silently corrupt state.

- Internal error messages and logs **must** be specific and actionable: what failed, the relevant IDs or non-personal values (see Security), and expected vs actual where it applies. `Chore 01HX3 not found in household 01HX9`, not `Not found`.
- Client-facing errors **must not** leak internals: no stack traces, internal IDs, query details, or existence leaks (for example "user exists"). Return a stable error code the client can act on, and correlate it with the internal error through a request ID.
- Expected outcomes (not found, rejected, conflict) **should** be values in the return type.
- Invariant violations **must** throw (or panic). Unexpected state, especially when it is not recoverable, **must never** let execution carry on. This covers data integrity and security controls in particular. See the `invariant` helper under Language notes.
- You **should** define errors out of existence where the semantics allow it: idempotent operations, masking low-level transient failures with bounded retries, handling errors once in a central place rather than at every call site.
- Retries against external systems **must** be idempotent (idempotency keys or naturally idempotent operations) and **should** use backoff.
- Client errors (most 4xx) **should not** be retried automatically. They need a fix or a deliberate replay.
- Errors **must not** be swallowed silently. Catching an error means handling it, converting it, or re-raising it with context.

## Testing

*Why:* tests are what make change safe. A design that needs no internal mocks keeps them cheap and honest.

- **Test first.** New behavior **should** start with a failing test (red, green, refactor). Acceptance-level tests **should** come first for user-facing features. Most of them run against use cases or the API; only critical user flows need a browser (see UI).
- **Test the core, integration-test the shell.** The functional core **should** be covered by fast unit tests with no mocks. The shell **should** be covered by a small number of tests against real dependencies (real database, real filesystem, a test account).
- **Mocks only at external boundaries.** Mocks **must** be limited to things the application does not own: network, filesystem, clock, third-party services. Prefer fakes and in-memory implementations over mocks.
- **An internal mock is a design smell.** Wanting to mock an internal collaborator **should** prompt moving logic into the core, not writing a better mock. In codebases where that change is not available, flag it and proceed.
- **Structure.** Tests **should** follow arrange, act, assert, with one concept per test.
- **Names** **should** read as `should <expected behavior> when <condition>`.
- **Isolation.** Tests, including end-to-end tests, **must not** depend on execution order or shared mutable state.
- **Property-based tests** **may** cover pure core logic with clear invariants: roundtrips, idempotence, monotonicity.
- **Mutation testing** **should** run on a schedule against pure core and library code to check that tests catch real changes.

## Static analysis and deterministic checks

*Why:* written rules are advisory, and humans and agents both misread or skip them. A failing check is unambiguous, applies the same way to every author, and gives fast feedback inside an agent's loop.

Rules a tool can check **should** be enforced by a tool rather than by review or agent instructions. Each check's level is in the table below; Exceptions covers how projects and changes deviate.

**How checks run**

- The same checks **must** run locally and in CI, from one command (for example `check`).
- The development toolchain version **should** be pinned in the repository (.nvmrc, rust-toolchain.toml, the toolchain line in go.mod), and CI **should** use the pinned version. This is separate from the runtime versions a library supports, which are part of its contract (see Contracts and migrations). Contributor-only requirements (package manager, toolchain) **should** stay out of metadata consumers see (for example engines).
- A change **must** pass that command before it is declared done. Check configuration **must not** be loosened to make a change pass (see Exceptions).
- Checks **should** be fast enough to run on every iteration, including every agent loop. Slow checks (mutation testing, full-repo analysis) **may** run on a schedule instead.
- Findings **should** be errors or off. Warnings that never fail the build become noise.
- New code **must** meet every Must-level threshold from day one and **should** meet every Should-level one. The coverage target applies to the project as a whole; per-PR coverage follows the changed-lines rule in the table.

**Baselines**

- A threshold that an existing codebase does not yet meet starts as a baseline at the current value. Checks fail only when a value gets worse than its baseline.
- A baseline moves toward its threshold as values improve and never moves away from it.
- Coverage has no stored baseline; it uses the changed-lines rule in the table instead.

**What to check**

| Check | What it enforces | Threshold | Level |
| --- | --- | --- | --- |
| Formatting | One format, applied by a tool. No style discussion in review. | No diff | Must |
| Linting | Language pitfalls and any project rule expressible as a lint rule (naming, banned APIs, file size). | Zero findings | Must |
| Typechecking | Strict mode, no escape hatches (see Types). | Zero errors | Must |
| Dependency rules | Layering from Architecture: core never imports shell, IO modules, or third-party packages outside a documented allowlist, no cycles, modules import each other only through public entry points. | Zero violations | Must |
| Dead code | Unused files, exports, and dependencies. | Zero findings | Should |
| Complexity | Per-function cyclomatic complexity (cognitive in Rust). Exhaustive matches over a union may be suppressed with a reason. | At most 10 per function (Rust: 25, cognitive); projects may require less | Should |
| Changed-lines coverage | Line and branch coverage of the lines a PR adds or modifies, as far as the language's tools measure it. Deleted code does not count. New code therefore never lowers project coverage while it is below the target. | At least the lower of the project's current coverage and the coverage target; on a project with none yet, the first PR sets it | Must |
| Coverage target | Project-wide line and branch coverage. | At least 90%; projects may require more | Should |
| Mutation testing | Tests catch real changes in core and library code. | A project-set mutation score; the scheduled run fails below it | Should |
| Change risk (CRAP) | Functions that are both complex and poorly tested. No common tool exists; a small project-specific tool may compute it from coverage and complexity reports. | At most 30 per function | May |
| Secrets | No committed secrets, scanned in pre-commit and CI (for example gitleaks). | Zero findings | Must |
| Duplication | Copy-pasted blocks (for example jscpd, or rev-dep in TypeScript), tuned so the rule of three still holds. | Project-defined | May |
| Unhandled results | Ignored errors, results, and promises (see Robustness). | Zero findings | Must |
| Per-file maintainability | One score per file combining complexity measures (TypeScript: FTA). | Below 50 | Should |
| Package shape | A published library's entry points, types, and module formats resolve the way consumers load them. | Zero findings | Should |

Every test **must** contain at least one assertion, enforced by a lint rule where one exists and by review otherwise. Assertion-free tests raise coverage while checking nothing, which Fowler gives as the extreme case of coverage gamed as a target ([Test Coverage](https://martinfowler.com/bliki/TestCoverage.html)). Coverage only shows what code ran, not that results were checked. That is why the changed-lines rule is the floor, 90% is a target, and mutation testing checks the check.

The CRAP score (Change Risk Anti-Patterns; Savoia and Evans, 2007) combines both measures per function, with comp as cyclomatic complexity and cov as coverage from 0 to 1:

```math
\mathrm{CRAP}(m) = \mathrm{comp}(m)^2 \times (1 - \mathrm{cov}(m))^3 + \mathrm{comp}(m)
```

A fully covered function scores its complexity. An untested one scores roughly its complexity squared, so complex untested code stands out first.

## Scope and change discipline

*Why:* small, single-purpose changes are faster to review, safer to ship, and easier to revert.

- A PR **should** implement only what its task requires. Small, local cleanups in the code it touches (a clearer local name, a fixed typo) **may** be included.
- Larger refactoring, renaming, or reorganizing outside the task **should not** go in the same PR. If adjacent code blocks the task, fix the minimum and say so; otherwise leave a TODO with context.
- Structural changes (refactors, moves, renames) and behavioral changes **should** land in separate commits or PRs (Kent Beck, *Tidy First?*).
- Refactoring **should** happen under green tests, in small behavior-preserving steps, with tests passing after each step.
- A `refactor:` commit **must not** change behavior. A commit that alters behavior is a `feat:` or `fix:`, whatever it is called.
- Logic changes **must** include their tests in the same PR. Independent test work **may** land first, for example characterization tests before refactoring untested code.
- Every PR **must** leave the main branch working, including each PR in a stack of dependent changes.
- A new API **should** ship with at least one usage in the same PR. Reviewers then see how it is used, and no unused API lands.
- Tech debt **must** link its tracking issue (see Exceptions) from a code comment. It **should** be paid off soon, since unpaid debt compounds quickly.
- A PR **should** do one self-contained thing, small enough to review in one sitting.
- Around 100 changed lines is usually fine, and around 1,000 is usually too large. File spread counts too: 200 lines across 50 files is too large. Deleted files and trusted automated refactors count for less.
- A PR that is too large **should** be split, for example into stacked PRs. Reviewers **may** reject a change for size alone.
- Before adding a utility, you **should** check whether one already exists.

## Version control, issues, and review

*Why:* history and PRs record why the code is the way it is. Consistency makes that record searchable and reviewable.

**Commits and branches**

- Commits **should** follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): description`, with a body that briefly says why.
- Branches **should** follow [Conventional Branch](https://conventional-branch.github.io): `feature/...`, `bugfix/...`, `hotfix/...`, `release/...`, `chore/...`, aligned with the commit type.
- A project's own conventions take precedence over both.

**Issues and PRs**

- Issues and PRs **must** follow the project's established template, so each one covers the same aspects. A project without templates **should** add them.
- Description length **should** scale with the change's impact and risk, not its line count. A one-line change to a security config warrants a thorough explanation. A large mechanical change, such as an automated rename, needs only a few sentences.
- A description **should** cite a standard only where the change deviates from it. Following a standard needs no citation.
- Each fact **should** appear once in a description.
- Notes about other work **should** go on that work's issue, not in the PR.
- PR titles **should** use the Conventional Commits format: `feat(billing): add proration`. The title **should** be imperative and stand alone in history.
- The description body **should** say why the change is made and note its shortcomings, with enough context that it still reads if linked pages disappear. Authors **should** re-check it before merge, since changes drift during review.
- PRs **should** open as drafts.

**Merge gates**

- The main branch **must** be protected against direct pushes.
- Required checks **must** pass before merge, including on PRs opened by bots or automation. Where the platform does not run checks on automation-opened PRs, a documented manual step that runs them before merge satisfies this.
- At least one review approval **should** be required.

**Review**

Largely adapted from [Google's engineering practices](https://google.github.io/eng-practices/), for reviewers and authors alike. Departures: tech debt may lower code health as a must exception, where Google warns that cleaning up later is a common way for codebases to degrade. The solo-maintainer approval rule and the declare-and-confirm step for emergencies are additions.

- **Standard.** Reviewers **should** approve once a change definitely improves code health, even if it is not perfect. There is no perfect code, only better code. A change that makes code health worse **should not** be approved unless it is tech debt recorded as a must exception, or an emergency (see Exceptions).
- **First pass.** Reviewers **should** first decide whether the change makes sense at all, then read its main files, and send major design comments early.
- **What to look for.** Reviewers **should** look at design, functionality (including edge cases and concurrency), and complexity, watching for over-engineering. They **should** check that the tests would fail if the code broke, and that naming, comments, and documentation are updated.
- **Rigor.** Reviewers **should** read the surrounding files, not only the diff, and watch for security flaws, PR size, and mixed structural and behavioral changes. Each finding **should** survive a second look before it is raised.
- **Tone.** Comments **should** be kind, be about the code rather than the author, and explain why. Good work **should** be called out too, with the reason.
- **Severity.** Findings **should** cite the rule they apply and its level. A must violation blocks merge unless it is an approved exception. A should violation needs a fix or a stated reason (see Exceptions).
- **Labels.** Nit marks minor polish and Optional marks a suggestion; both are May-level. FYI is for future reference and needs no action in this change.
- **Style preferences.** A personal style preference that the formatter, the linter, and this document do not cover **should not** block a PR.
- **Speed.** Reviewers **should** respond within one business day at most, at their next break point rather than mid-task. Quick individual responses matter more than total time to merge. When a full review has to wait, send a quick note saying when, or broad design comments first.
- **Approve with comments.** Reviewers **may** approve while leaving comments, when the remaining comments are minor or optional, or when they trust the author to address them. Say which applies.
- **Disagreements.** Technical facts and data beat opinions, and the formatter and linter settle style. When the author shows, with data or solid engineering principles, that approaches are equally valid, the author's choice wins. Otherwise, consistency with the existing codebase wins, unless it lowers code health.
- **When disagreement persists.** The reviewer **should** first consider that the author may be right. Then try for consensus, then a call between author and reviewer, and record the outcome on the PR. If that fails, escalate to a tech lead or maintainer. A PR **should not** sit unresolved because of a disagreement.
- **Explanations belong in code.** When a reviewer asks what code does, the answer **should** be clearer code or a code comment. A reply that lives only in the review tool does not help future readers.
- **Vocabulary.** Reviews **may** name smells from the [Refactoring catalog](https://refactoring.com/catalog/) (Primitive Obsession, Data Clumps, Feature Envy, Shotgun Surgery) as shared vocabulary.

**Handling review comments.** Authors **should** treat comments as being about the code, not about themselves, and reply calmly. When a reviewer is confused, the fix goes in the code (see Explanations belong in code).

## AI-assisted code

*Why:* the code is judged, not the tool that produced it. Ownership stays with the person who submits it.

- AI-generated code **must** meet the same standards as any other code. Checks apply the same way whatever tool produced it.
- The person submitting a change owns it. They **must** understand it well enough to explain and defend it in review.
- Review scrutiny scales with how well the author shows they understand the change, not with which tool wrote it. A change the author cannot explain gets more scrutiny, however it was produced.
- Whether to disclose AI assistance (for example a `Co-Authored-By` trailer) follows the project's rules.

## Dependencies

*Why:* every dependency is code you run but did not write or review.

The core takes no third-party dependencies by default (see Architecture). Every dependency, including one allowlisted for the core, follows these rules:

- A new dependency **must** be evaluated before it is added: maintenance activity, license, security history, transitive footprint, and whether a small amount of own code would do.
- Versions **must** be pinned through committed dependency metadata: a lockfile where the ecosystem has one (`pnpm-lock.yaml`, `Cargo.lock`), and `go.mod` with `go.sum` in Go, where `go.mod` fixes the versions and `go.sum` holds checksums.
- Every project **must** have a defined update story: automated update PRs on a schedule (Renovate, Dependabot, or similar), or a documented manual cadence. Security patches **should** be applied promptly.
- Dependency updates **should** land in their own PRs, separate from feature work.
- Automated update PRs **may** be grouped to reduce review load.

## Security

*Why:* security flaws are the most expensive defects to find late. These rules target the classes that recur most.

Grouped by [OWASP Top 10:2025](https://owasp.org/Top10/2025/) category, after a few general practices.

**General**

- Secrets **must not** be committed, logged, or shipped in client code. They come from the environment or a secret manager at runtime.
- Personal data **should not** be logged. Log IDs instead.
- Test and development data **should** be synthetic or anonymized, never copied from production.
- Input from outside the process **must** be parsed at the boundary (see Design principles).
- Processes, services, and credentials **should** have the least privilege they need.
- Controls **should** be layered (defense in depth), so no single check is the only barrier.

**Access control (A01)**

- Access **must** be denied by default and enforced server-side.
- Every route **must** declare its authorization policy, and the router **must** reject a route without one. A missing policy, or a policy that errors, fails closed.
- Data access **must** be scoped to the caller's tenant or ownership, checked per resource, not per route.
- A denied request **should** be returned as a value (for example a 403), not thrown as an error: it is an expected outcome.
- Outbound requests to user-supplied URLs (webhooks, link previews) **must** go through an allowlist or block internal and private address ranges.

**Configuration (A02).** Defaults **must** be secure. Production configuration **must not** enable debug output, debug-level logs, or verbose errors, and **must not** contain sample credentials.

**Supply chain (A03)**

- Dependency vulnerability scanning **should** run in CI (see also Dependencies).
- Vulnerability findings **should** be fixed, or accepted with a recorded reason.
- CI actions **should** be pinned by commit SHA. CI tokens follow the least-privilege rule above.
- Publishing **should** use short-lived credentials (for example OIDC trusted publishing), granted only to the job that publishes. Packages **should** carry provenance where the registry supports it.

**Cryptography (A04)**

- Crypto primitives **must not** be hand-rolled. Use vetted libraries.
- Passwords **must** be hashed with a slow, salted algorithm (for example Argon2id or bcrypt).

**Injection (A05)**

- Queries and commands **must** be parameterized, never built by string concatenation. Shell commands take their arguments as an array, never interpolated into a shell string.
- Output **must** be encoded for its context (HTML, HTML attributes, URLs).

**Design (A06).** Changes touching authentication, authorization, payments, or personal data **should** include a brief threat note in the PR.

**Authentication (A07).** Authentication **should** be delegated to an IdP or a vetted library, not built in-house.

**Integrity (A08)**

- Untrusted data **must not** be deserialized into executable objects.
- Signed inbound payloads (webhooks) **must** have their signatures verified before use.

**Logging and alerting (A09).** Security events (authentication failures, authorization denials, privilege changes) **should** be logged and alertable.

**Exceptional conditions (A10).** Security controls **must** fail closed. An error while evaluating one means deny.

## UI

*Why:* the UI is part of the shell. Keeping logic out of rendering keeps it testable, and accessibility and localization keep it usable for everyone.

**Where logic goes**

- Components **should** render, not decide. Logic **should** live in pure functions (formatting, derived state, mapping) and in hooks or the framework's equivalent (data fetching, effects, local state).
- In React, the render scope **should** call hooks and pure functions and return markup. Business rules, data transformation, and effect orchestration **should not** be written inline in the component body.
- Server state **should** come from a data-fetching layer, not be copied into component state.
- Domain rules **must not** be re-implemented in the UI. Client-side validation is for user experience only; the server **must** still parse and authorize every request.

**Data from the backend**

- The frontend **should** map API responses into its own types at one boundary, so components never read API types directly.
- A DTO type layer shared with the backend **may** be the input to that mapping. It gives the mapping compile-time checks but does not replace it.
- API shape changes that preserve meaning (a renamed or restructured field) then touch only the mapping, not components. Changes in meaning still reach the components that depend on it.

**Forms**

- Input fields **should** use the type that matches the data (`email`, `number`, `date`, `tel`, `url`), so devices show the right keyboard and browsers handle basic validation.
- Forms **should** ask only for what the task needs.
- Password managers and autofill **must** work: real `<form>` elements, correct `autocomplete` values (`username`, `current-password`, `new-password`, `one-time-code`), and no blocked pasting into credential fields.
- Keyboard flow **must** stay intact: tab order follows the visual order, Enter submits the form, and focus lands somewhere sensible after submit and on errors. Keyboard shortcuts **may** be added, but **must not** override browser or assistive-technology shortcuts.

**Devices and rendering**

- UIs **should** work across screen sizes (phone, tablet, desktop) and input methods (mouse, keyboard, touch). Hover **must not** be the only way to reach an action.
- The rendering strategy (server-side, single-page, or a mix) **should** fit the context, with a slight preference for server-side rendering.

**Accessibility**

- UIs **should** meet WCAG 2.2 AA.
- Semantic HTML **must** come before ARIA. Interactive elements are real buttons, links, and form controls.
- Every interactive element **must** be reachable and operable by keyboard, with a visible focus indicator.
- Images **must** have text alternatives (empty for decorative ones), and form controls **must** have labels.
- Color **must not** be the only carrier of meaning, and contrast **must** meet AA.
- UIs **should** work with screen readers: a logical heading structure, landmarks, an accessible name on every control, and announced status changes for async updates and errors (for example via live regions). Projects that explicitly do not, and never will, need screen reader support **may** skip this, with the decision recorded; they then do not meet WCAG 2.2 AA.
- Accessibility lint rules **should** be on (for example oxlint's jsx-a11y rules), and automated checks (for example axe) **should** run in end-to-end tests. These catch a subset of issues; manual keyboard and screen reader passes cover the rest.

**Internationalization**

- User-facing strings **should** live in message catalogs, not inline in components. Projects that will never localize **may** skip this.
- Dates, numbers, and currencies **must** be formatted with locale-aware APIs (for example `Intl`), never by string concatenation.
- Messages with variables **should** use placeholders and plural rules (for example ICU message format), not concatenated fragments.
- Layouts **should** tolerate text expansion and right-to-left scripts.

**Testing**

- Pure UI logic (formatters, reducers, derived state, the functions behind hooks) **should** have unit tests.
- Critical user flows **should** have end-to-end tests in a real browser against a running app (Playwright or Cypress). Keep them few and focused on what matters most.
- Component tests **may** cover complex interactive components. They **should** query by role and accessible name, which doubles as an accessibility check.
- Selectors **should** use roles, labels, or test IDs, never CSS structure.

## Language notes: TypeScript

The most worked-out language notes. The Go and Rust notes below are provisional mappings of the same rules.

- `strict` **must** be on.
- `any` **must not** be used; `as T` and `!` follow the cast and non-null rules in Types.
- `@ts-expect-error` **should** be used instead of `@ts-ignore`, so the directive fails once it is no longer needed. Either one carries the comment Types requires.
- Named exports **should** be preferred over default exports.
- Runtime validation at boundaries **should** produce typed values in one step (a schema parser, such as Zod or a custom one), per parse-don't-validate.

Invariants use a small helper that throws and doubles as a type guard, so it also replaces `!` for values that must be present:

```ts
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invariant failed: ${message}`);
}

invariant(household, `Household ${householdId} missing after insert`);
// household is narrowed to non-undefined from here
```

Tools for the checks in Static analysis:

| Check | Tool |
| --- | --- |
| Typechecking | `tsc --noEmit` |
| Linting | [oxlint](https://oxc.rs) |
| Formatting | [oxfmt](https://oxc.rs) |
| Dependency rules | [rev-dep](https://rev-dep.com): module boundaries, restricted imports, circular imports |
| Dead code | rev-dep: orphan files, unused exports, unused dependencies. [knip](https://knip.dev) **may** be added for unused class and enum members, which rev-dep does not detect. |
| Duplication | rev-dep |
| Complexity (per function) | oxlint's `eslint/complexity` rule with `max` set to 10 (its default is 20) |
| Per-file maintainability | [FTA](https://github.com/sgb-io/fta) (Halstead and cyclomatic measures) |
| Test coverage | Vitest coverage (`@vitest/coverage-v8`), line and branch |
| Every test asserts | An `expect-expect` lint rule, or `expect.hasAssertions()` |
| Mutation testing | [StrykerJS](https://stryker-mutator.io) |
| Change risk (CRAP) | No common tool; compute from coverage and complexity reports |
| Unhandled results | oxlint's type-aware `no-floating-promises` with `ignoreVoid` set to false (its default is true) |
| Secrets | Language-agnostic tools (see Static analysis) |
| Package shape | publint and attw (@arethetypeswrong/cli) on the packed package |

## Language notes: Go (provisional)

- Expected outcomes **should** be returned as `error` values. Wrap with context at each layer: `fmt.Errorf("load household %s: %w", id, err)`. Callers **should** branch with `errors.Is` and `errors.As`, never on message strings.
- Sentinel errors (`var ErrNotFound = errors.New(...)`) **may** be used for conditions callers branch on.
- `panic` is reserved for invariant violations. It **must not** be used for expected failures.
- `any` or `interface{}` **should not** appear in domain code. Narrow it with type switches at boundaries.
- Ports **should** be small interfaces defined by the consumer, not the implementer. Accept interfaces, return concrete types.
- Value objects **should** be structs with an unexported field and a parsing constructor: `type HouseholdID struct{ value string }` plus `ParseHouseholdID(string) (HouseholdID, error)`. A named type such as `type HouseholdID string` does not enforce the rule, since any string converts to it without the parser. The zero value (`HouseholdID{}`) still bypasses the parser, so code at boundaries **should** treat it as invalid.
- IO functions in the shell **should** take `context.Context` as the first parameter. The core **should not** need it.
- Packages **should** be organized by domain, not by layer type. Avoid `util` and `common` packages. Use `internal/` for anything not meant to be imported.
- Tests **should** be table-driven where cases share a shape.

| Check | Tool |
| --- | --- |
| Formatting | `gofmt` or `goimports` |
| Linting | `go vet` plus `golangci-lint` (including `staticcheck`) |
| Typechecking | The compiler |
| Dependency rules | `depguard` via golangci-lint |
| Dead code | `unused` via golangci-lint; `deadcode` from golang.org/x/tools |
| Complexity | `gocyclo` or `cyclop` via golangci-lint |
| Exhaustiveness | `exhaustive` via golangci-lint |
| Unhandled results | `errcheck` via golangci-lint |
| Test coverage | `go test -cover` (statement coverage only; no standard branch coverage tool) |
| Every test asserts | No common tool; review checks it |
| Mutation testing | `gremlins`, which is slow on large modules; no other well-maintained option is known |
| Change risk (CRAP) | No common tool |
| Secrets, duplication | Language-agnostic tools (see Static analysis) |

## Language notes: Rust (provisional)

- Expected outcomes **should** be `Result<T, E>`. Libraries and the core **should** use typed error enums (for example via `thiserror`). Opaque errors (for example `anyhow`) **may** be used in binaries and the shell. Add context when propagating with `?`.
- Invariant violations **must** use `assert!` or `panic!` with a message stating the invariant.
- `unwrap()` **must not** be used on values that can legitimately be absent. `expect("...")` **may** be used where absence is an invariant violation; the message states the invariant.
- Every `unsafe` block **must** carry a `// SAFETY:` comment explaining why it is sound.
- Value objects **should** be newtypes with a parsing constructor (`TryFrom` or `FromStr`). Fields stay private so the rule cannot be bypassed.
- States **should** be enums with data, so invalid combinations cannot be built.
- Ports **should** be traits. Adapters implement them.
- Layering **should** be enforced with workspace crates: the core crate does not depend on the shell crate, so the compiler checks the dependency direction.
- Unit tests **should** live next to the code in `#[cfg(test)]` modules; integration tests in `tests/`.

| Check | Tool |
| --- | --- |
| Formatting | `rustfmt` |
| Linting | `clippy` with warnings as errors (`-D warnings`) |
| Typechecking | The compiler |
| Dependency rules | Workspace crate boundaries; `cargo-deny` for third-party dependencies |
| Dead code | Compiler `dead_code` lint; `cargo-machete` or `cargo-udeps` for unused dependencies |
| Complexity | `clippy::cognitive_complexity`, enabled explicitly since it is allow-by-default. Rust uses cognitive instead of cyclomatic complexity, with clippy's default threshold of 25. |
| Unhandled results | Compiler `unused_must_use` lint, denied by `-D warnings` |
| Test coverage | `cargo-llvm-cov` (branch coverage needs nightly) |
| Every test asserts | No common tool; review checks it |
| Mutation testing | `cargo-mutants` |
| Change risk (CRAP) | No common tool |
| Secrets, duplication | Language-agnostic tools (see Static analysis) |

## Changing these standards

*Why:* standards that cannot change get ignored, and standards that change without review drift.

- Changes to this document **must** go through a PR, like code.
- Review feedback that recurs **should** become a check (preferred) or a rule here. A comment made three times is a missing lint rule.
- Agent instruction files (CLAUDE.md, rules files, skills) **should** reference this document rather than copy it, and hold only agent-specific rules.
- A rule that no longer pulls its weight **should** be removed, not ignored.
