# smonn's coding standards

Oct 16, 2026 · [smonn](https://github.com/smonn)

## Contents

- [Purpose and scope](#purpose-and-scope)
- [Exceptions](#exceptions)
- [Design principles](#design-principles)
- [Architecture](#architecture)
- [Contracts and migrations](#contracts-and-migrations)
- [Background work and integrations](#background-work-and-integrations)
- [Robustness](#robustness)
- [Performance](#performance)
- [Logging and metrics](#logging-and-metrics)
- [Infrastructure and deployment](#infrastructure-and-deployment)
- [Releases](#releases)
- [Code organization](#code-organization)
- [Naming](#naming)
- [Comments](#comments)
- [Types](#types)
- [Errors](#errors)
- [Testing](#testing)
- [Static analysis and deterministic checks](#static-analysis-and-deterministic-checks)
- [Dependencies](#dependencies)
- [Security](#security)
- [UI](#ui)
- [Reasoning and communication](#reasoning-and-communication)
- [Scope and change discipline](#scope-and-change-discipline)
- [Version control and PRs](#version-control-and-prs)
  - [Commits and branches](#commits-and-branches)
  - [Issues and PRs](#issues-and-prs)
- [Merge gates](#merge-gates)
- [Review](#review)
- [Changing these standards](#changing-these-standards)
- [Language guidance and tools](#language-guidance-and-tools)
  - [Shared checks](#shared-checks)
  - [TypeScript](#typescript)
  - [Go (provisional)](#go-provisional)
  - [Rust (provisional)](#rust-provisional)

## Purpose and scope

*Why:* code is judged by quality; submitters own it regardless of tools.

My recommended standards for code I write or review, by hand or with AI agents. Language-specific rules override general language guidance; otherwise these standards are language agnostic. Audit and regulatory requirements (for example SOC 2) tighten these standards, never loosen them.

Authors own their changes and **must** understand them well enough to explain and defend them in review. AI-generated code **must** meet the same standards; scrutiny depends on demonstrated understanding. AI disclosure, including attribution trailers, follows project rules.

Compliance covers applicable capabilities: libraries need not add servers, databases, or UIs. Size does not exempt scripts or prototypes. Generated and vendored files **may** skip style and maintainability checks if the repository records their source and regeneration/update process; security and build checks still apply.

- **Must**: hard constraint, verifiable from the diff, by a tool, or by repository configuration. Exceptions need approval.
- **Should**: strong default; exceptions need a stated reason.
- **May**: option worth considering; neither choice needs justification.

Every binding rule has a level, stated or inherited. An unleveled instruction takes the level of the rule it implements, in the same bullet or paragraph or through its link. A May option applies only while its conditions and follow-up steps are met; otherwise the underlying rule applies at its own level. Examples and rationale add no requirements. Automation preserves levels, even in required checks. Projects **may** override style, naming, and Should defaults with repository-recorded reasons; other Musts require scoped exceptions, never project-wide weakening. Projects **may** tighten any rule. [Exceptions](#exceptions) defines the process.

These standards stand alone; the optional [guide](https://github.com/smonn/coding-standards/blob/main/GUIDE.md) adds explanation and examples, never rules.

## Exceptions

*Why:* recorded exceptions expose a rule's limits without silently weakening it elsewhere.

- **Terms.** A change is one PR. Exceptions record the rule, affected code/check, and reason. They remain scoped, including after merge, until removed or reconsidered.
- **Should exceptions** use PR descriptions.
- **Must exceptions** need review approval. Those persisting after merge **must** have a repository record: inline suppression, configuration comment, or exceptions file. PR-scoped waivers use the PR record. Temporary exceptions **must** link an issue with owner and removal condition from affected code, configuration, exception record, or waiver. Permanent exceptions **must** explain inapplicability and reconsideration conditions; violations needing repair remain temporary. Changed assumptions or scope **must** prompt reconsideration at the original level.
- **Approval** comes from another reviewer; solo maintainers approve their own exceptions and record that in the PR. AI reviews never count as approval.
- **Suppressions**, inline or configured (including `skipLibCheck` and path ignores), **must** carry reasons and required exception references. Suppression directives (`@ts-ignore`, `#[allow(...)]`, `//nolint`) **must** also explain what would remove the need. Stale ignores **should** fail checks. Suppressions follow the underlying rule's level. Formatting and unsuppressed compiler errors cannot be waived; type-check suppressions follow [Types](#types).
- **Gate waivers.** Checks without local suppression **may** use PR-scoped waivers at the underlying rule's level. The PR **must** record the failed check, reason, any required approval, and a CI-recognized label or equivalent marker. CI **should** validate approval and bind authorization to the reviewed revision automatically. Without revision binding, the PR **must** record revalidation after later pushes, including required approval. Local runs report actual failures without needing PR state. See [result reporting](#static-analysis-and-deterministic-checks); waivers never turn failures into passing measurements.
- **Standing scopes.** Checks **may** exclude documented change categories through permanent exceptions at the underlying level. Identity exemptions **must** account for PR control and subsequent updates using trusted metadata and repository permissions. Same-repository branches **may** establish trust through write permissions matching the exemption; branch names alone cannot. Bot exemptions **must** cover later pushes by others. CI **must** reevaluate eligibility on updates and report the selected suite; uncertainty runs the full required suite.
- **Lowering code health.** Reviewers **should** identify concrete maintainability, correctness, or safety regressions. PRs accepting identified regressions **must** record a temporary Must exception or declare an emergency.
- **Emergencies** are production outages, major user-affecting bugs, legal issues, security holes, and launches with hard deadlines and serious consequences. They exclude shipping sooner, soft deadlines, end-of-week pressure, absent reviewers, same-day managerial requests, and rolling back PRs that broke tests or builds.
- **Emergency review.** The author declares and the reviewer confirms the emergency in the PR. Review **may** focus on safe resolution, which the reviewer **must** verify. Branch protection and non-waivable checks remain; other failures follow waivers. Required [tests](#scope-and-change-discipline) **may** be deferred only through temporary Must exceptions.
- **After emergencies**, full review and missing tests **must** follow, tracked in an issue.

Product, business, and customer needs drive features and inform implementation. Every rule should address a concrete problem. Inapplicable rules follow exceptions, never silent omission. Standards changes follow [Changing these standards](#changing-these-standards).

## Design principles

*Why:* change dominates software cost; these principles keep the next change cheap.

Simple over easy: fewer things braided together, even when braiding is quicker to write.

- **YAGNI, aggressively.** You **must not** add parameters, options, or abstractions for hypothetical requirements. Exception: external-dependency ports, an outbox, message catalogs, and value objects **may** be built upfront with a recorded, concrete project-specific retrofit consequence of deferral. Other upfront structure **may** proceed with recorded evidence of retrofit risk, deferred alternative, and present cost. Concrete qualitative evidence suffices; measure when a measurable fact decides.
- **DRY.** You **should** abstract duplication only once a real pattern emerges, usually on the third occurrence.
- You **should** choose the simplest correct approach, preferring readability between similarly complex alternatives. Cleverness needs a measured reason (see Performance).
- **Pure functions, immutable data, explicit data flow.** You **should** prefer these over hidden state and side effects.
- Functions **should not** mutate caller-owned inputs unless that is their documented purpose. Copy stateful inputs when an independent copy is available and appropriate. Iterator APIs **must** document whether they consume input; repeatable traversal APIs **should** accept a collection or fresh-iterator factory.
- You **should** prefer plain data plus functions over objects exposing both fields and behavior. Types either expose data without behavior or hide data behind behavior, never both.
- You **should** compose small parts rather than build class hierarchies.
- **Parse, don't validate.** At boundaries you **must** transform untyped input into narrowed types once, rather than check and pass raw values along.
- **Illegal states.** You **should** use types (sum types, branded or newtype IDs, required fields) to prevent invalid combinations.
- **Deep modules.** You **should** prefer a small interface over a large hidden implementation (Ousterhout).

[Rationale](https://github.com/smonn/coding-standards/blob/main/GUIDE.md#design-principles).

## Architecture

*Why:* isolating the core business value from IO and vendors keeps it testable, portable, and cheap to change.

Code **should** default to functional core, imperative shell. Business logic determines domain outcomes and enforces invariants; orchestration controls IO, retries, transactions, cancellation, and response mapping. External-dependency ports are the default; core wrappers and UI mappings follow their own rules. Additional boundaries **should** isolate an identified source of change, enforce an invariant, or simplify consumers; otherwise they **may** be omitted with a recorded reason.

- **Functional core.** Business decisions **should** be pure functions of already-loaded values, returning values including descriptions of next actions.
- The core **must not** directly use clock, randomness, filesystem, network, database, environment, or other IO APIs. The shell passes their values in (for example current time) and executes effects returned as values.
- The core **should** depend only on the standard library and project code. Allowed dependencies (for example a decimal library where the standard one is inadequate) **must** be deliberate, documented, wrapped behind project-owned operations and types, and in the dependency check's allowlist. Vendor types **must** stay inside the wrapper; aliases or re-exports alone do not qualify. Wrapping the operations used is enough. Where the checker supports per-path allowlists, it **must** allowlist the package only for its wrapper's path.
- IO, mutation, and external calls **should** live in thin orchestration at the edges.
- External dependencies (database, IdP, email, payments, queues) **should** sit behind application-owned ports, implemented by adapters. Third-party types **should not** leak past adapters.
- Adapters **should** map database rows and ORM entities to domain objects.
- HTTP handlers, CLI commands, and job runners **must not** contain business logic. They parse and check input, call use cases, and map results to responses.
- Dependencies **must** point inward: shell to core, never reverse.
- **Bounded contexts.** Contexts **should** follow real domain boundaries, not every product noun. If engineers cannot tell where new code belongs, there are too many contexts.
- **Modular monolith first.** You **should** prefer enforced module boundaries in one deployable over premature service splits.
- Significant architecture decisions **should** have short repository ADRs: context, decision, consequences.
- **Optimistic concurrency** **may** replace long transactions: an explicit integer version column, compared on write, retrying or aborting on mismatch.

[Rationale and examples](https://github.com/smonn/coding-standards/blob/main/GUIDE.md#architecture).

## Contracts and migrations

*Why:* breaking contracts breaks other people's code in unseen systems.

- Public contracts (HTTP APIs, library exports, package metadata (entry points, types, supported runtimes), event/message schemas, persisted file formats, CLI flags/output) **must** stay backward compatible within a supported contract version. Breaking changes **must** be announced and introduce an explicitly identified new contract version; external consumers **should** get a deprecation period before the old version retires.
- Libraries **should** follow Semantic Versioning. Dropping a supported runtime is breaking. CI **should** run the lowest supported runtime.
- Database migrations **should** expand, migrate, then contract: add the new shape, move data and readers, remove the old shape in a later deploy. Running code **must** work at every step.
- Migrations **should** be plain SQL files run by a language-agnostic tool (for example [dbmate](https://github.com/amacneil/dbmate)), not ORM-generated code.

## Background work and integrations

*Why:* requests need speed and predictability despite unavoidable failures in external calls.

- Work not needed before responding (for example email) **should** run in background workers. Synchronous integrations still follow timeout and retry rules.
- Committed state changes requiring reliable external effects **should** use transactional outboxes: commit delivery intent in the same transaction, then deliver asynchronously. Atomicity covers state and intent; remote delivery can be delayed or fail. Read-only integrations need no outbox. [Pattern](https://microservices.io/patterns/data/transactional-outbox.html).
- Inbound events allowing asynchronous handling **should** use an inbox: authenticate under Security, store durably, acknowledge, process. Deduplication keys **must** include sender or subscription scope unless message IDs are globally unique.
- Workers that can receive duplicate deliveries **must** make effects idempotent. Deduplication state and local effects **must** commit atomically; remote effects need idempotency at the receiving boundary (see Errors).
- Inbox and outbox retention **must** be bounded, with separate payload and deduplication-key policies. The deduplication window **must** cover supported retries and replays. Unneeded raw payloads **should** be purged or redacted.
- Exhausted retries and expiring unprocessed messages **must** record a terminal outcome, with an owner or alert and a recovery or discard policy. Replay after deduplication expiry **must** reestablish idempotency or be rejected; records cannot silently expire while delivery remains promised.

## Robustness

*Why:* explicit bounds and checked results turn failures at system limits and unchecked paths into handled cases.

- Outbound calls **must** have timeouts. Retries, queues, worker concurrency, caches, request body sizes, and query results **must** have explicit limits. Potentially unbounded API lists **must** be paginated.
- External tree or graph traversal **must** limit depth and total work or input size, recursive or iterative. Iteration avoids call-stack exhaustion but does not bound memory or runtime.
- Errors, failure-bearing results, and designated must-use values **must** be handled or propagated. Intentional discards **must** be explicit and explain their safety. Promises **must** be awaited, returned to a responsible caller, or given a rejection handler; `void` alone does not handle rejection. A documented cannot-reject guarantee **may** justify scoped suppression.
- Checks **must** enable available ignored-error and unhandled-promise diagnostics (see [Static analysis](#static-analysis-and-deterministic-checks)). Review **should** cover the tool's gaps; [Language guidance](#language-guidance-and-tools) identifies them.
- Bindings **should** be immutable (`const`, no `mut`) unless mutation is needed, and declared where used.
- **Limit indirection.** `eval`, reflection-based dispatch, monkey patching, and macro-heavy code **should not** be used where plain code works. Control flow **should** be visible in source.
- Preconditions and postconditions beyond types **should** use `invariant` checks (Errors). There is no assertion density target.

## Performance

*Why:* measurement prevents misdirected optimization; budgets expose regressions before users feel them.

- **Measure before optimizing.** Performance claims and optimizations **should** have benchmarks or profiles demonstrating problems and gains. Benchmarks **should** use production-like input (distinct values, realistic sizes), not one value looped, and report memory and time. Keeping optimizations needs the same evidence.
- **Budgets.** User-perceived performance **should** have repository budgets: key endpoints' p95 latency, UIs' JavaScript bundle size and Core Web Vitals. CI **should** check budgets where practical.
- **No N+1 queries.** Per-request data access **should** be bounded and visible. New hot queries and indexes **should** be checked against their query plans.
- Caches **must** state an invalidation strategy or acceptable staleness window. Keys **must** include every result-determining input. Caller-supplied functions' results are cached only when the contract states they are pure.
- Hot paths **may** have CI benchmarks failing on regressions past a threshold.

## Logging and metrics

*Why:* operational logs and metrics reveal incidents without burying signals in noise.

- Incidental debug logging **should not** be committed; Security (A02) sets production limits.
- Logs **should** be structured (key/value) and carry request IDs (see Errors). Fields follow Security's data policy.
- Unrequested incidental metrics and instrumentation **should not** be added. Budget and alerting instrumentation (Performance, Security) is fine.

## Infrastructure and deployment

*Why:* environments relying solely on memory cannot be reproduced, reviewed, or trusted.

- Infrastructure **must** be code (for example OpenTofu) changed through PRs like application code.
- Environments **should** be reproducible from tracked definitions and documented prerequisites, including separately provisioned secrets and external services. Manual console changes are drift and **should** be codified or reverted.
- Deployments **should** be automated and repeatable from a known commit. Configuration comes from the environment, not per-environment builds.

## Releases

*Why:* notes accompanying changes and CI publishing make releases reproducible and reviewable without repository access.

- User-facing changes **should** carry PR release notes (for example changesets); missing notes **should** fail a check. PRs without user-facing changes record that explicitly (for example empty changesets).
- Versions and changelogs **should** be generated from those notes, not hand-edited.
- CI **should** publish releases from a known commit after required and applicable conditional checks pass, using the exact checked artifact without rebuilding. Publication with failed checks **must not** rely on merge waivers. Credentials follow Supply chain (A03).
- Libraries **should** be tested as published: build with the release command, then load as consumers do from another project (for example both require and import).
- Library toolchain bumps or structural refactors **should** show the public API (for example built type declarations), built syntax level, and built-ins unchanged against the base, or list every difference.
- Release processes **should** document recovery when publishing fails after the version bump.

## Code organization

*Why:* colocating code that changes together makes features understandable and changeable in one place.

- Top-level code **should** follow features or domains, not technical directories such as `controllers/`.
- Within features, the technical split **should** apply: `billing/` holds core, shell, entry points, and tests. Infrastructure and genuinely generic shared helpers **should** live outside features.
- Tests **should** be colocated with their code: sibling `*.test.ts`, same-package `_test.go`, or Rust in-file `#[cfg(test)]` modules.
- Functions **should** take few parameters; group related ones into named types. You **should** check for an existing utility before adding one.
- Magic numbers and strings **should not** appear inline. Name them as constants or, when they carry rules, value objects. Obvious values in obvious places (`0`, `1`, empty string) are fine.
- Files **should** stay under roughly 200 lines excluding imports and type-only declarations; test files under roughly 300. Split along cohesion lines or record why the module is coherent at its size. Projects **may** override these numbers.

## Naming

*Why:* names are the main interface for humans and agents reading code far more often than writing it.

- Variables and parameters **should** name domain concepts, not types or shapes: `household`, not `data`, `result`, `item`, or `record`.
- Generic names (`temp`, `obj`, `val`, `res`, `info`) **must not** be used. Name the concept: `parseError`, `choreRow`. Exception: `err` or `error` in catch blocks with genuinely unknown types.
- Booleans and predicates **should** use `is`, `has`, or `can`: `isApproved`, not `approved`.
- Functions **should** be verb-noun, describing the action: `approveChore`, not `choreApproval` or `doChore`. Factories **may** use `create` or `make`.
- Event handlers **should** use `handle` for functions and `on` for props or callback slots.
- Codebases **should** keep domain glossaries; names **should** follow them. Use one term per concept within contexts; document differing meanings across contexts.

**Casing and file names**

| Kind | Convention |
| --- | --- |
| File and directory names | `kebab-case` |
| Database tables and columns | `snake_case` |
| Functions, methods, variables, properties | `camelCase` |
| Classes and types | `PascalCase` |
| Module-level constant values | `UPPER_SNAKE_CASE` |

Project rules and language idioms **must** override these casing defaults and naming rules. Rust uses `snake_case` for functions, variables, modules, and files. Go uses `PascalCase` for exports, `camelCase` otherwise, lowercase filenames, and idiomatic short names such as `err`. Generic code **may** use generic names (`T`, `item`) without a domain concept.

## Comments

*Why:* clear code avoids comments that drift from it.

- Comments **should** explain reasons or constraints code cannot express. Clarify confusing code first; opaque syntax or API workarounds **may** need brief explanations of behavior.
- Workarounds and external constraints **must** carry reason comments. Assertions follow [Types](#types); suppressions follow [Exceptions](#exceptions).
- Doc comments **should** cover contracts absent from signatures: units, effects, ownership, ordering, failures, guarantees; avoid restating signature details. Document ambiguous parameters directly (is `rate` 0.07 or 7?).
- Comments **should not** restate obvious operations.
- TODOs **must** name remaining work, deferral reason, and tracking issue: `TODO(#456): handle timezone edge case after #123 lands`.

## Types

*Why:* compiler enforcement saves review and testing effort.

- The strictest practical compiler or checker settings **should** be on.
- Escape hatches that disable checking (TypeScript `any`, unnecessary Rust `unsafe`) **must not** be used to silence the compiler. Use the top type (`unknown` in TypeScript) and narrow. Go's `any` follows [Go guidance](#go-provisional).
- Unchecked assertions **should** be a last resort. Each **must** explain its safety and why inference or narrowing cannot establish it. Checked conversions need no assertion justification. Potentially lossy conversions **must** check the valid range or document why loss is intentional.
- Suppression directives follow [Exceptions](#exceptions).
- Non-null assertions or unwraps **must not** be used on values that can legitimately be absent at runtime; handle absence explicitly.
- Exhaustiveness checking **must** cover sum-type matches. Where adding a variant must force a change, matches **must** handle every variant explicitly or use checked-unreachable branches. Language-required fallbacks, such as Rust's external `#[non_exhaustive]` enums, are exempt. See [Language guidance](#language-guidance-and-tools).
- Domain values with rules **should** use immutable value objects where reasonable, constructed through parsers: IDs, formatted strings, bounded quantities. Values without rules beyond primitive types stay primitive. [Language guidance](#language-guidance-and-tools) covers construction and bypasses.
- Instants **should** be stored and passed in UTC, converted at edges. Local dates and recurring local schedules **must** retain calendar and time-zone semantics rather than being forced into instants. Money **should** use integer minor units or a decimal type, not binary floating point.

## Errors

*Why:* inevitable failures need visibility, internal detail, external safety, and protection against silent state corruption.

- Internal errors **must** identify what failed and expected versus actual state where useful, using only diagnostic fields allowed by Security: `Chore 01HX3 not found in household 01HX9`, not `Not found`.
- Client-facing errors **must not** leak internals: stack traces, internal IDs, query details, existence leaks ("user exists"). Client-facing errors **should** return stable actionable error codes, correlated to internal errors by request ID.
- Expected outcomes (not found, rejected, conflict) **should** be return-type values.
- Invariant violations **must** throw or panic and abort the affected operation. Request or worker boundaries **may** catch, report, and isolate failure; they **must not** resume work depending on the violated invariant. Processes **must** terminate when shared state is untrustworthy. See the [TypeScript invariant helper](#typescript).
- You **should** define errors out of existence where semantics allow: idempotent operations, bounded retries masking low-level transient failures, centralized handling instead of every call site.
- External-system retries **must** be idempotent (idempotency keys or naturally idempotent operations) and **should** use backoff.
- Client errors (most 4xx) **should not** retry automatically; they need a fix or deliberate replay.
- Catching errors **must** handle, convert, or propagate them with context ([result handling](#robustness)).

## Testing

*Why:* tests protect changes; avoiding internal mocks keeps tests cheap and honest.

- New behavior **should** start with a failing test (red, green, refactor); user-facing features **should** start with acceptance tests, mostly against use cases or the API. Only critical user flows need a browser (see UI).
- Pure logic, including UI formatters, reducers, derived state, and functions behind hooks, **should** have fast unit tests. The shell **should** have a few focused integration tests against real dependencies (for example a real database).
- **Test doubles.** Except for documented legacy cases below, stubs (canned responses), mocks (interaction expectations), and fakes (working simplified implementations) **must** replace only systems or facilities the application does not own: network, filesystem, clock, third-party services. Fakes **should** be preferred where practical.
- **Internal doubles signal a design smell.** Wanting to replace an internal collaborator **should** prompt moving logic into the core. Where a legacy refactor is not yet practical, an internal double **may** be used with a PR-recorded reason and tracked follow-up link; no Must-level approval is needed.
- Tests **should** use arrange, act, assert, with one concept per test.
- **Names** **should** read `should <expected behavior> when <condition>`.
- Tests, including end-to-end tests, **must not** depend on execution order or shared mutable state.
- Every executable file (benchmarks, examples, scripts) **should** run in a check, even with minimal input. Code nothing runs **should** be deleted.
- **Property-based tests** **may** cover pure core logic with clear invariants, such as roundtrips.
- Every test **must** contain an assertion, enforced by lint where available, otherwise review. Assertion linting **must** recognize helper and harness assertions. Review **should** verify tests can fail for the relevant defect. Coverage measures execution, not correctness ([Test Coverage](https://martinfowler.com/bliki/TestCoverage.html)).

## Static analysis and deterministic checks

*Why:* failing checks clarify rules, enforce them consistently for humans and agents, and speed feedback in agent loops.

Tool-checkable rules **should** be automated. Table levels govern adoption and thresholds; see [rule levels](#purpose-and-scope). [Language guidance](#language-guidance-and-tools) covers language-specific settings and tool gaps; the [guide](https://github.com/smonn/coding-standards/blob/main/GUIDE.md#language-tools) suggests tools.

**How checks run**

- One entry point (for example `check`) **must** define the required suite, conditional checks with explicit applicability, and scheduled checks. Local and CI runs **must** use identical implementations and inputs for the same suite and revision. Partial local hooks **should** cover the same files, including every supported file type; hooks do not replace the completion gate.
- Before completion, changes **must** pass required and applicable conditional checks or have CI-accepted valid waivers. Results **should** distinguish pass, fail, waived, and not run. Scheduled checks are outside this gate unless explicitly included. Configuration **must not** be loosened to pass a change, including disabling rules, narrowing file coverage, or adding ignores outside [Exceptions](#exceptions).
- Without squash merges, each main-branch commit **should** pass code checks: fold red-test commits into their fixes. Per-PR checks apply to the last commit.
- Results **should** depend on the revision, lockfiles, pinned toolchain, and declared inputs (comparison revision, PR metadata), not local state such as sub-project installed dependencies or caches. CI or checks **should** set up every sub-project from its lockfile.
- New checks **should** demonstrably fail: deliberately break what they guard and record results in the PR.
- CI changes that cannot run before merge **should** name a safe post-merge first run and expected result in the PR.
- Repositories **should** pin development toolchains (for example `.nvmrc`); CI **should** use them and local checks **should** reject other versions. Supported library runtimes remain part of the contract ([Contracts and migrations](#contracts-and-migrations)). Contributor-only requirements (package manager, toolchain) **should** stay out of consumer metadata, such as `engines`.
- Repositories **should** configure tools, including AI agents, when defaults conflict with project rules.
- Checks **should** be fast enough for every iteration, including agent loops. Slow checks (mutation testing, full-repo analysis) **may** run on a schedule with a documented owner and failure-response process.
- Findings **should** be errors or off.
- New code **must** meet Must-level thresholds from day one and **should** meet Should-level ones.

**Baselines**

- Existing lint, dependency-boundary, and dead-code findings **may** use reviewed per-finding baselines. Complexity, duplication, maintainability, mutation score, and CRAP **may** use measured function, file, or project baselines. The repository **must** record adoption revision and scope. New or worsened violations fail; fixes cannot offset different findings.
- Baselines **must** tighten as findings disappear or metrics improve. Formatting, compiler errors, secrets, unhandled failure-bearing results, and package-resolution failures cannot be baselined. Security findings **must** use individual exceptions, regardless of tool baseline support.
- Coverage uses the changed-lines rule below, without a stored baseline.
- Metric-driven changes **should** report other affected metrics before and after and preserve readable structure over scores. Scores alone do not justify splitting cohesive files; exceeding a Should-level threshold requires a reason under [Exceptions](#exceptions).

**What to check**

| Check | What it enforces | Threshold | Level |
| --- | --- | --- | --- |
| Formatting | Single tool-applied format; no style discussion in review. | No diff | Must |
| Linting | Language pitfalls and project rules. | Zero unresolved findings outside baselines or exceptions | Must |
| Typechecking | Settings, assertions, suppressions from Types and language appendix. | Zero unsuppressed errors | Must |
| Dependency rules | Architecture boundaries, allowlists, no cycles, public-entry-point imports. | Zero unresolved violations outside baselines or exceptions | Must |
| Dead code | Unused files, exports, dependencies. | Zero findings | Should |
| Complexity | Cyclomatic complexity (cognitive in Rust). Exhaustive union matches may be suppressed with a reason. | At most 10 per function (Rust: 25, cognitive); projects may require less | Should |
| Changed-lines coverage | Added/modified executable lines and associated branches, where supported; recorded comparison revision, identical coverage configuration and suite selection. | Each supported metric: at least the lower of base coverage and target | Must |
| Coverage target | Project-wide line and branch coverage. | At least 90%; projects may require more | Should |
| Mutation testing | Tests catch real changes in core/library code. | Project-set score; scheduled run fails below it | Should |
| Change risk (CRAP) | Complexity and coverage; [explanation](https://github.com/smonn/coding-standards/blob/main/GUIDE.md#crap-scoring). | At most 30 per function | May |
| Secrets | Pre-commit and CI scanning. | Zero findings | Must |
| Duplication | Copy-pasted blocks, preserving rule of three. | Project-defined | May |
| Unhandled results | Detectable ignored failure-bearing/must-use values and unhandled promises; see [result-handling review](#robustness). | Zero unresolved findings | Must |
| Per-file maintainability | Combined complexity measures (TypeScript: FTA). | Below 50 | Should |
| Package shape | Published library entry points, types, module formats resolve as consumers load them. | Zero findings | Should |

The first measured PR **must** establish coverage for new or existing unmeasured projects; measured zero is valid. Missing established base measurements **must** be recovered or covered by a valid gate waiver; they **must not** reset the floor. For each supported metric, while project coverage is below its target, changed-lines coverage **should** meet that target; every shortfall needs a PR-stated reason.

Changed-lines coverage cannot guarantee project-wide non-regression: deleting covered code or changing execution of unchanged lines can lower totals. PRs **should** report project coverage separately and explain decreases. No eligible lines/branches means not applicable, not zero. Unsupported metrics **must** be identified, with the reason, in the repository's coverage configuration or check definition; coverage results **should** report them as unsupported, not passed. Below-target projects **should** record an improvement plan.

## Dependencies

*Why:* a dependency is executed code you neither wrote nor reviewed.

These rules cover every dependency, including [core allowlist entries](#architecture):

- Before addition, dependencies **must** be evaluated for maintenance activity, license, security history, transitive footprint, and whether a little own code suffices.
- Versions **must** be pinned in committed metadata: ecosystem lockfiles where available (for example `pnpm-lock.yaml`); Go uses `go.mod` for versions and `go.sum` for checksums.
- Projects **must** define scheduled automated update PRs (for example Renovate) or a documented manual cadence. Security patches **should** be applied promptly.
- Updates **should** have PRs separate from feature work; automated updates **may** be grouped.
- Blocked major upgrades **should** have an issue recording measured failures and a done-when condition; close the failing update PR.

## Security

*Why:* these rules target recurring security flaws because late discovery is expensive.

General practices, then [OWASP Top 10:2025](https://owasp.org/Top10/2025/) categories.

**General**

- Secrets **must not** be committed, logged, or shipped in clients; obtain them from the environment or a secret manager at runtime.
- Diagnostic fields **should** be limited to operational needs. Personal data **should not** be logged. Logs **should** use opaque internal IDs rather than direct identifiers (names, emails). A shared logging policy **must** record purpose, access, and retention for included personal data, including pseudonymous IDs. Personal data **should** be redacted or pseudonymized where appropriate. These rules cover errors and logs; secrets remain prohibited. See [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).
- Test and development data **should** be synthetic or anonymized, never copied from production.
- External input follows [boundary parsing](#design-principles).
- Processes, services, and credentials **should** have least privilege.
- Controls **should** be layered: no single check is the only barrier.
- Regexes on untrusted input **should** be checked for super-linear backtracking, using a tool in the check command where available (for example recheck).

**Access control (A01)**

- Access **must** default to denied and be enforced server-side.
- Every route **must** declare its authorization policy; routers **must** reject routes without one. Evaluation follows Exceptional conditions below.
- Data access **must** enforce resource authorization for the caller, including applicable tenant or ownership constraints. Public, shared, and administrative access **must** be explicit policies, not resource-check bypasses.
- Denials **should** return values (for example a 403), not throw.
- Outbound requests to user-supplied URLs **must** enforce allowed schemes and destinations against actual connection addresses. Allowlist destinations or exclude internal/non-public ones; disable redirects or check every hop. DNS changes between validation and connection **must not** bypass policy. See [OWASP SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

**Configuration (A02).** Defaults **must** be secure. Production configuration **must not** enable debug output, debug-level logs, or verbose errors, or contain sample credentials.

**Supply chain (A03)**

- Dependency vulnerability scanning **should** run in CI.
- Vulnerability findings **should** be fixed or accepted with a recorded reason.
- CI actions **should** be pinned by commit SHA; tokens follow least privilege above.
- Publishing **should** use short-lived credentials (for example OIDC trusted publishing), granted only to the publishing job. Packages **should** carry provenance where supported by the registry.

**Cryptography (A04)**

- Crypto primitives **must not** be hand-rolled; use vetted libraries.
- Passwords **must** be hashed with a slow, salted algorithm (for example Argon2id).

**Injection (A05)**

- Query values **must** be parameterized; dynamic identifiers or syntax **must** use controlled mappings or a builder that handles them safely. Untrusted command inputs **must** be passed as argument-array data, with option boundaries where needed, never interpolated into shell syntax.
- Output **must** be context-encoded (HTML, attributes, URLs).
- User-provided links **must** have parsed schemes checked against an allowlist (usually http: and https:), not string-matched.

**Design (A06).** Changes to authentication, authorization, payments, or personal data **should** include a brief PR threat note.

**Authentication (A07).** Authentication **should** use an IdP or vetted library, not in-house code.

**Integrity (A08)**

- Untrusted data **must not** be deserialized into executable objects.
- Signed inbound payloads **must** pass signature verification and the provider's freshness and replay checks before successful acknowledgment or processing. Original bytes **must** be preserved when the signature covers them. Provider verification libraries **should** be used where available. Inbox deduplication follows Background work and integrations. See [Stripe's webhook example](https://docs.stripe.com/webhooks).

**Logging and alerting (A09).** Security events (authentication failures, authorization denials, privilege changes) **should** be logged and alertable.

**Exceptional conditions (A10).** Security controls **must** fail closed: evaluation errors mean deny.

## UI

*Why:* separating logic from rendering enables testing; accessibility and localization keep UIs usable for everyone.

**Where logic goes**

- Components **should** render, not decide. Logic **should** live in pure functions (formatting, derived state, mapping) or hooks or framework equivalents (data fetching, effects, local state).
- React render scope **should** call hooks and pure functions and return markup. Business rules, data transformation, and effect orchestration **should not** be inline in component bodies.
- Server state **should** come from a data-fetching layer, not copies in component state.
- Domain rules **must not** be re-implemented in UI. Client validation serves user experience only; servers **must** still parse and authorize every request.

**Data from the backend**

- Frontends **should** map API responses through boundary functions into independent frontend-owned types; components never read API types directly.
- Shared backend DTO types **may** be mapping inputs. Boundary functions **may** return original objects fitting frontend-owned types; API type aliases alone do not replace mapping.
- API shape changes preserving meaning (such as renamed fields) affect only mappings; meaning changes still reach dependent components.

**Forms**

- Input types **should** match data (for example `email`), enabling appropriate keyboards and basic validation.
- Forms **should** ask only for task necessities.
- Password managers and autofill **must** work: real `<form>` elements, correct `autocomplete` values (`username`, `current-password`, `new-password`, `one-time-code`), no blocked credential pasting.
- Forms **must** preserve native keyboard behavior, including multiline inputs and composite controls, and offer keyboard-accessible submission. Tab order **must** follow logical reading order, with focus managed after submission and errors. Shortcuts **may** be added but **must not** override browser or assistive-technology shortcuts.

**Devices and rendering**

- UIs **should** support screen sizes (phone, tablet, desktop) and input methods (mouse, keyboard, touch). Hover **must not** be the only route to an action.
- Rendering strategy (server-side, single-page, mixed) **should** fit context, with slight preference for server-side rendering.

**Accessibility**

- UIs **should** meet WCAG 2.2 AA.
- Semantic HTML **must** precede ARIA: interactive elements are real buttons, links, and form controls.
- Every interactive element **must** be keyboard-reachable and operable, with visible focus.
- Images **must** have text alternatives (empty for decorative ones); form controls **must** have labels.
- Color **must not** carry meaning alone; contrast **must** meet AA.
- UIs **should** support screen readers: logical headings, landmarks, accessible names on every control, announced async status changes and errors (for example live regions). See Scoped deferrals below; deferring this support prevents WCAG 2.2 AA compliance.
- Accessibility lint **should** be enabled (for example oxlint jsx-a11y); automated checks (for example axe) **should** run in end-to-end tests. Manual keyboard and screen reader passes cover their gaps.

**Internationalization**

- User-facing strings **should** live in message catalogs, not inline components; see Scoped deferrals.
- Dates, numbers, currencies **must** use locale-aware formatting APIs (for example `Intl`), never concatenation.
- Variable messages **should** use placeholders and plural rules (for example ICU), not concatenated fragments.
- Layouts **should** tolerate text expansion and right-to-left scripts.

**Scoped deferrals**

Screen-reader support and message catalogs **may** be deferred when unneeded by current scope, with repository-recorded scope, reason, and concrete reconsideration trigger. On a trigger, review and implement or renew with updated reason and trigger. No Must-level approval is required.

**Testing**

- Critical user flows **should** have few, focused real-browser end-to-end tests against a running app (for example Playwright).
- Component tests **may** cover complex interactive components; they **should** query by role and accessible name, also checking accessibility.
- Selectors **should** use roles, labels, or test IDs, never CSS structure.

## Reasoning and communication

*Why:* sound decisions need sound claims and a clear distinction between observation and opinion.

For design docs, PR descriptions, reviews, and agent output:

- Reasoning **should** separate observe, evaluate, analyze, synthesize, communicate phases; scale rigor to reversibility and impact.
- Observation **must** be separate from interpretation: "the handler calls the DB three times" versus "the handler is slow" until measured.
- Confidence, tradeoffs, and knowledge gaps **should** be explicit. Prefer precise, falsifiable claims; avoid vague generalizations and absolutes. Factual claims in issues and PRs **should** cite measurements (tool versions for tool behavior) or be labeled unmeasured. Results tables contain only measured cases.
- Tradeoffs **must** name both sides, without silently choosing.
- Ambiguous requirements **should** get numbered options, not guesses, in conversations, issues, and PRs. When a measurable fact decides, measure first and include the data.
- Output **should** be dry and plain, moderate-to-high detail, without recapping.

## Scope and change discipline

*Why:* small, single-purpose changes speed review, reduce shipping risk, and ease reverts.

- Tech debt **should** be paid off soon; it compounds quickly. Tracking follows [Exceptions](#exceptions).
- A PR **should** cover one self-contained task, limited to its requirements and reviewable in one sitting. Small cleanups in touched code **may** accompany it.
- Larger refactors, renames, and reorganization outside the task **should not** accompany it. Fix blocking adjacent code minimally and explain; otherwise leave a contextual TODO under [Comments](#comments).
- Structural changes (refactors, moves, renames) and behavioral changes **should** land in separate commits or PRs.
- Refactoring **should** take small, behavior-preserving steps under green tests, passing after each step.
- `refactor:` commits **must not** change behavior; under [Conventional Commits](#commits-and-branches), behavior changes are `feat:` or `fix:`.
- Logic changes **must** include tests in the same PR. Independent test work **may** land first, such as characterization tests before refactoring untested code.
- Every PR **must** leave main working, including each stacked PR.
- Each new API **should** include a usage in its PR.
- Review size **should** consider changed lines and file spread: about 100 lines is usually fine, 1,000 usually too large, and 200 across 50 files too large. Deleted files and trusted automated refactors count less.
- Oversized PRs **should** be split, for example into stacks; reviewers **may** reject for size alone.

[Further rationale](https://github.com/smonn/coding-standards/blob/main/GUIDE.md#scope-and-change-discipline).

## Version control and PRs

*Why:* consistent history and PRs keep code's rationale searchable and reviewable.

### Commits and branches

- Commits **should** follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): description`, with a brief why in the body.
- Branches **should** follow [Conventional Branch](https://conventional-branch.github.io), aligned with commit type: `feature/...`, `bugfix/...`, `hotfix/...`, `release/...`, `chore/...`.
- Project conventions take precedence over both.

### Issues and PRs

- Issues and PRs **must** follow project templates; projects without them **should** add them.
- CI **may** check description templates (required sections, banned content).
- PR titles **should** use Conventional Commits (`feat(billing): add proration`), be imperative, and stand alone in history.
- Descriptions **should** explain the change, reason, limitations, and validation without relying on links, and be updated before merge.
- Description length **should** reflect impact and risk, not its line count: security-setting changes can need more explanation than large mechanical renames.
- Descriptions **should** cite standards only for deviations.
- Each fact **should** appear once; notes about other work **should** go on its issue.
- PRs **should** open as drafts.
- Independent findings **should** get separate issues or a tracking checklist.
- When PRs share an issue, the last to merge **should** close it. Where closing keywords do not fire (non-default branches), close it manually on merge or automate it.
- Issues **should** record negative results (checked, nothing found).

[Further rationale](https://github.com/smonn/coding-standards/blob/main/GUIDE.md#version-control-and-prs).

## Merge gates

- Main **must** be protected against direct pushes.
- CI **must** accept the current revision under the [completion gate](#static-analysis-and-deterministic-checks) before any PR merges, including bots and automation. Documented manual triggers **may** start missing checks without waiving them.
- New required checks **should** enter branch protection in the same change or run inside required jobs. The change **should** identify affected open PRs and arrange reruns or updates so each reports the check before merge.
- CI **should** run on PRs into any branch, checking stacked PRs before retargeting. Per-PR checks (release notes, changed-lines coverage, diff-based lint) **should** compare against the PR's base.
- At least one review approval **should** be required.

## Review

Adapted for authors and reviewers from [Google's engineering practices](https://google.github.io/eng-practices/). Departures: tech debt lowering code health through Must exceptions; solo-maintainer approval; emergency declaration/confirmation. [Merge gates](#merge-gates) define merge eligibility.

- **Standard.** Reviewers **should** approve changes that definitely improve code health despite imperfections. There is no perfect code, only better code. Worsening code health **should not** be approved except for tech debt recorded as a Must exception or an [emergency](#exceptions).
- **First pass.** Reviewers **should** first assess whether the change makes sense, then read main files and send major design comments early.
- **Coverage.** Reviewers **should** check design, behavior (edge cases and concurrency), complexity and over-engineering, updated naming, comments, and documentation, and [test quality](#testing).
- **Rigor.** Reviewers **should** read surrounding files, check security, size, and mixed structural and behavioral changes, and recheck findings before raising them.
- **Tone.** Comments **should** kindly discuss code rather than authors and explain why; good work **should** also be recognized with reasons.
- **Severity.** Findings **should** cite their rule and level; [Exceptions](#exceptions) governs fixes and exceptions.
- **Labels.** Nit (minor polish) and Optional (suggestion) are May-level; FYI is future reference requiring no action here.
- **Style.** Preferences outside formatter, linter, and standards **should not** block PRs.
- **Speed.** Reviewers **should** respond within one business day at their next break point, not mid-task. Prioritize response speed over merge time; when full review waits, promptly give its timing or broad design comments.
- **Approve with comments.** Reviewers **may** approve with minor or optional comments or when trusting the author to address them. Say which applies.
- **Disagreements** **should** be settled this way: facts and data beat opinions; formatter and linter settle style. If authors demonstrate equally valid approaches through data or sound engineering principles, their choice wins. Otherwise codebase consistency wins unless it lowers code health.
- **Escalation.** Reviewers **should** consider the author could be right, seek consensus, then call the author and record the outcome on the PR. If unresolved, escalate to a tech lead or maintainer. Disagreement **should not** leave a PR unresolved.
- **Replies.** Authors **should** respond calmly to comments about code, not themselves. Clarifications **should** become clearer code or useful [documentation](#comments), not only review replies.
- **Vocabulary.** Reviews **may** use [Refactoring catalog](https://refactoring.com/catalog/) smells, such as Primitive Obsession, as shared vocabulary.

[Further explanation](https://github.com/smonn/coding-standards/blob/main/GUIDE.md#review).

## Changing these standards

*Why:* unchangeable standards get ignored; unreviewed changes cause drift.

- Standards changes **must** use PRs, like code.
- Recurring review feedback **should** become a check (preferred) or a rule. A comment made three times is a missing lint rule.
- Agent instructions (CLAUDE.md, rules files, skills) **should** link to [these standards](#purpose-and-scope), not copy them, and contain only agent-specific rules.
- Ineffective rules **should** be removed, not ignored.

## Language guidance and tools

Read the guidance for each language used. Go and Rust guidance is provisional.

Repositories **should** pin tool versions and explicitly configure selected rules. Projects choose tools that enforce the [outcomes and thresholds](#static-analysis-and-deterministic-checks); the [guide](https://github.com/smonn/coding-standards/blob/main/GUIDE.md#language-tools) suggests options per language.

### Shared checks

Compute optional [CRAP scoring](https://github.com/smonn/coding-standards/blob/main/GUIDE.md#crap-scoring) from compatible coverage and cyclomatic-complexity reports, not Rust's cognitive complexity.

### TypeScript

- Hooks include supported `.mjs`/`.cjs` files ([Static analysis](#static-analysis-and-deterministic-checks)).
- `strict` **must** be on.
- `any` **must not** be used; `as T` and `!` follow [Types](#types).
- `@ts-expect-error` **should** replace `@ts-ignore`; both follow [Suppression requirements](#exceptions).
- Named exports **should** be preferred over defaults.
- Boundary validation **should** produce typed values in one step via schema parsers (Zod or custom), implementing [boundary parsing](#design-principles).
- Implement [exhaustiveness](#types) with a fallback `never` check, accepting only compiler-proven unreachable values.
- Implement [value objects](#types) with brands or tags and parsing constructors. Assertions can forge brands and follow the assertion rule.
- Unused class and enum members **may** be checked with [knip](https://knip.dev) when the selected dead-code checker does not cover them.
- Configure unhandled-promise checks to be type-aware and to count `void` as unhandled (for example oxlint's `no-floating-promises` with `ignoreVoid: false`). Review synchronous failure-bearing results separately ([Robustness](#robustness)).

Invariant checks **should** use a throwing type-guard helper, replacing `!` for required values:

```ts
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invariant failed: ${message}`);
}

invariant(household, `Household ${householdId} missing after insert`);
// household is narrowed to non-undefined from here
```

[Further rationale](https://github.com/smonn/coding-standards/blob/main/GUIDE.md#typescript).

### Go (provisional)

- Expected outcomes **should** return `error` values. Each layer **must** wrap errors with context: `fmt.Errorf("load household %s: %w", id, err)` ([Errors](#errors)). Callers **should** branch using `errors.Is` and `errors.As`, never message strings.
- Sentinel errors (`var ErrNotFound = errors.New(...)`) **may** represent conditions callers branch on.
- `panic` is reserved for invariant violations; it **must not** be used for expected failures.
- Domain code **should not** use `any` or `interface{}`; narrow with boundary type switches.
- Ports **should** be small consumer-defined interfaces. Accept interfaces, return concrete types.
- Value objects **should** use structs with unexported fields and parsing constructors: `type HouseholdID struct{ value string }`, `ParseHouseholdID(string) (HouseholdID, error)`. `type HouseholdID string` permits conversion bypassing parsing; zero values (`HouseholdID{}`) also bypass it and **should** be treated as invalid at boundaries.
- Shell IO **should** take `context.Context` first; the core **should not** need it.
- Packages **should** follow domains, not layers. Avoid `util` and `common`; use `internal/` for anything not meant to be imported.
- Tests **should** be table-driven when cases share a shape.
- Configure [exhaustive](https://github.com/nishanths/exhaustive) so `default` does not replace named cases when new enum values require changes ([Types](#types)).
- Go’s linear-time regexp package is exempt from the [backtracking check](#security).
- `errcheck` detects ignored errors; review assigned errors' subsequent handling ([Robustness](#robustness)).
- `go test -cover` measures statements only; Go has no standard branch-coverage tool.

### Rust (provisional)

- Expected outcomes **should** use `Result<T, E>`; libraries and the core **should** use typed error enums (such as `thiserror`). Opaque errors (`anyhow`) **may** serve binaries and the shell. Propagation with `?` **must** add context ([Errors](#errors)).
- Invariant violations **must** use `assert!` or `panic!` with the invariant in the message.
- For [absence violating an invariant](#types), `expect("...")` **may** replace `unwrap()`; its message states the invariant.
- Every `unsafe` block **must** have a `// SAFETY:` comment explaining soundness.
- Value objects **should** use private-field newtypes and `TryFrom` or `FromStr` constructors ([Types](#types)).
- States **should** be enums with data, preventing invalid combinations.
- Use exhaustive `match` without `_` when new variants require changes. External `#[non_exhaustive]` enums require fallbacks ([Types](#types)).
- Ports **should** be traits implemented by adapters.
- Layering **should** use workspace crates to enforce [dependency direction](#architecture).
- Integration tests **should** live in `tests/`.
- The linear-time regex crate is exempt from the [backtracking check](#security); backtracking crates such as fancy-regex are covered.
- Explicitly enable allow-by-default `clippy::cognitive_complexity` for the [complexity check](#static-analysis-and-deterministic-checks).
- Compiler `unused_must_use` covers annotated values and functions, denied by `-D warnings`. Project-defined must-use values **must** be annotated. Review remaining failure paths ([Robustness](#robustness)).
- Branch coverage with `cargo-llvm-cov` needs nightly; projects on stable toolchains treat it as unsupported ([coverage](#static-analysis-and-deterministic-checks)).
