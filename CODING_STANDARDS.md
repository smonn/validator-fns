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
- [AI assistance](#ai-assistance)
- [Changing these standards](#changing-these-standards)
- [Language guidance and tools](#language-guidance-and-tools)
  - [Shared checks](#shared-checks)
  - [TypeScript](#typescript)
  - [Go (provisional)](#go-provisional)
  - [Rust (provisional)](#rust-provisional)

## Purpose and scope

These are my recommended standards for code I write or review, by hand or with AI agents. They are language agnostic unless a section says otherwise. Projects under audit or regulatory regimes (SOC 2, HIPAA, PCI DSS, GDPR) layer those requirements on top; they tighten these standards, never loosen them.

The [table of contents](#contents) lists the technical rules, contribution workflow, and language-and-tool appendix. Language-specific rules take precedence over general language guidance.

The submitting author owns the change and **must** understand it well enough to explain and defend it in review. AI-generated code **must** meet the same standards; review scrutiny depends on demonstrated understanding, not the tool used.

Rules apply to the capabilities a project has: a library need not add a server, database, or UI to comply. Scripts and prototypes follow the applicable rules; their size alone does not exempt them. Generated and vendored files **may** be excluded from style and maintainability checks when the repository records their source and regeneration or update process. Security and build checks still apply.

Keywords carry weight:

- **Must**: hard constraint, used where a reviewer reading the diff can tell whether it was followed, or where a tool or the repository's configuration checks it. An exception needs approval (see Exceptions).
- **Should**: strong default. An exception needs a stated reason (see Exceptions).
- **May**: option worth considering. No justification needed either way.

Each binding rule uses one of these levels. Examples and rationale do not add requirements. Automation preserves a rule's level: a Should-level rule remains a Should even when a required check enforces it. A project **may** override style and naming conventions, and adjust Should-level defaults, with its reasons recorded in the repository. Other Must-level rules require scoped exceptions; project-wide policy cannot weaken them. Projects **may** tighten any rule.

## Exceptions

*Why:* a recorded exception makes a rule's limits visible without silently weakening it for other code.

- **Terms.** A change is one PR. An exception records the rule, affected code or check, and reason for deviating. It applies only to that scope, including after merge, until removed or reconsidered.
- **Should exceptions** need the rule and a reason in the PR description.
- **Must exceptions** need approval in review. Exceptions that persist after merge **must** have a repository record: an inline suppression, configuration comment, or exceptions file. PR-scoped gate waivers use the PR record instead. Temporary exceptions **must** link a tracking issue with an owner and removal condition from the affected code, configuration, exception record, or PR-scoped waiver. Permanent exceptions **must** explain why the rule or diagnostic is inapplicable to the stated scope and when to reconsider it; accepted violations that need repair remain temporary. Changes to the affected assumptions or scope **must** revisit the exception at its original level.
- **Who approves.** Approval comes from a reviewer other than the author. In a repository with a single maintainer, the maintainer approves their own exceptions and the PR says so. An AI agent's review never counts as approval.
- **Suppressions.** An inline or configuration suppression **must** carry its reason and any required exception reference. This includes options such as `skipLibCheck` and path-based ignores. Stale ignores **should** fail the check. Suppressions follow the level of the underlying rule, not the level of the job running it. Formatting and unsuppressed compiler errors cannot be waived; type-check suppressions follow Types. Approved scoped suppressions record exceptions; they do not weaken the rule for other code.
- **Gate waivers.** A check that cannot be suppressed locally **may** use a PR-scoped waiver at the underlying rule's level. At minimum, the PR **must** record the failed check, reason, and any required approval, with a CI-recognized label or equivalent marker. CI **should** validate approval and bind authorization to the reviewed revision automatically. Without that binding, the PR **must** record revalidation after later pushes, including any approval the rule requires. Local runs report the actual failure and need not read PR state. The CI gate **should** report waived failures separately from passing checks. A waiver never turns a failing check into a passing measurement.
- **Standing scopes.** A check **may** exclude a documented category of change under a permanent exception at the underlying rule's level. Identity-based exemptions **must** account for who controls the PR and subsequent updates, using trusted metadata and repository permissions. A same-repository branch **may** establish the trust boundary when repository write permissions match the exemption's intended trust; branch names alone cannot. Bot-specific exemptions **must** account for later pushes by other actors. CI **must** reevaluate eligibility on updates and report the selected suite; uncertain eligibility runs the full required suite.
- **Lowering code health.** Reviewers **should** identify concrete regressions in maintainability, correctness, or safety. A PR accepting an identified regression **must** record it as a temporary Must exception or declare an emergency.
- **Emergencies** are production outages, major bugs affecting users, legal issues, security holes, and launches with a hard deadline and serious consequences. They are not: wanting to ship sooner, soft deadlines, the end of the week, a reviewer being away, a manager asking for a same-day review, or rolling back a PR that broke tests or the build.
- **Emergency review.** The author declares the emergency in the PR and the reviewer confirms it. The review **may** focus on resolving the emergency safely. The reviewer **must** verify that outcome. Branch protection and non-waivable checks still apply; other failing checks follow the waiver process. Tests required by [Scope and change discipline](#scope-and-change-discipline) **may** be deferred only through a temporary Must exception.
- **After an emergency.** A full review and any missing tests **must** follow, tracked in an issue.

Changes to the standards follow [Changing these standards](#changing-these-standards).

Product, business, and customer needs drive the feature set and inform the technical implementation, not the other way around. Every rule here should be justified against a concrete problem, not an abstract ideal. A rule that does not fit a codebase is handled through the exceptions above, not dropped silently.

## Design principles

*Why:* most software cost comes from change, so these principles keep the next change cheap.

Simple over easy (in Rich Hickey's sense): fewer things braided together, even when the braided version is quicker to write.

- **YAGNI, aggressively.** You **must not** add parameters, options, or abstractions for hypothetical future requirements. This does not apply to structure that is expensive to retrofit (ports for external dependencies, an outbox, message catalogs, value objects): it **may** be built up front, with the retrofit cost stated.
- **Rule of three for DRY.** You **should** abstract duplication only once it reveals a real pattern, usually on the third occurrence. Two similar blocks are cheaper than a wrong abstraction.
- **Simplest correct solution.** You **should** pick the simplest approach that solves the problem correctly. Between two approaches of similar complexity, pick the more readable one. Cleverness needs a measured reason (see Performance).
- **Pure functions, immutable data, explicit data flow.** You **should** prefer these over hidden state and side effects.
- **Caller-owned arguments.** Functions **should not** mutate caller-owned inputs unless that is their documented purpose. Copy stateful inputs when an independent copy is available and appropriate. APIs taking iterators **must** document whether they consume them; APIs needing repeatable traversal **should** accept a collection or a factory for fresh iterators.
- **Data and behavior, not hybrids.** You **should** prefer plain data plus functions over objects that both expose their fields and carry behavior. A type is either a data structure (exposes data, no behavior) or an object (hides data, exposes behavior), not both.
- **Composition over inheritance.** You **should** compose small parts rather than build class hierarchies.
- **Parse, don't validate.** At boundaries you **must** transform untyped input into narrowed types once, rather than checking and passing the raw value along.
- **Make illegal states unrepresentable.** You **should** use the type system (sum types, branded or newtype IDs, required fields) so invalid combinations cannot be constructed.
- **Deep modules.** You **should** prefer a small interface over a large hidden implementation (Ousterhout). A module whose interface is as complex as its body adds cost without hiding anything.

## Architecture

*Why:* isolating the core business value from IO and vendors keeps it testable, portable, and cheap to change.

The structural default is functional core, imperative shell (Gary Bernhardt, "Boundaries"). Most rules in Testing follow from it.

Business logic determines domain outcomes and enforces domain invariants. Orchestration controls IO, retries, transactions, cancellation, and response mapping. Ports for external dependencies remain the default below. Core-dependency wrappers and UI mappings follow their own rules below. Beyond those boundaries, additional boundaries **should** isolate an identified source of change, enforce an invariant, or simplify consumers; an additional boundary that does none of these **may** be omitted with the reason recorded.

- **Functional core.** Business decisions **should** live in pure functions over values. The core takes already-loaded inputs and returns values, including descriptions of what to do next.
- **No impure APIs in the core.** The core **must not** use clock, randomness, filesystem, network, database, environment, or other IO APIs directly. The shell reads them and passes values in (the current time, a generated ID, a seed). Effects go out as returned values for the shell to execute.
- **No third-party dependencies in the core.** The core **should** depend only on the standard library and the project's own code. It is the main value of the software, and a dependency there ties that value to someone else's releases, licensing, and security. Allowed dependencies (for example a decimal library where the standard one is inadequate) **must** be deliberate, documented, and wrapped behind the project's own types, and listed in the dependency check's allowlist.
- **Imperative shell.** IO, mutation, and calls to external systems **should** live in a thin orchestration layer at the edges. The shell owns operational control flow and calls the core for business decisions.
- **Ports and adapters.** External dependencies (database, IdP, email, payments, queues) **should** sit behind a port the application owns. Adapters implement ports. Third-party types **should not** leak past the adapter.
- **Persistence models.** Adapters **should** map database rows and ORM entities to domain objects, isolating schema changes.
- **Thin entry points.** HTTP handlers, CLI commands, and job runners **must not** contain business logic. They check and parse input, call a use case, and map the result to a response.
- **One-directional dependencies.** Dependencies **must** point inward: shell to core, never core to shell. Cycles between modules are a defect.
- **Bounded contexts, sized to be navigable.** You **should** split by real domain boundaries, not by every product noun. If engineers cannot tell where new code belongs, there are too many contexts.
- **Modular monolith first.** You **should** prefer enforced module boundaries in one deployable over premature service splits.
- **Decision records.** Significant architectural decisions **should** get a short ADR in the repository: context, decision, consequences.
- **Optimistic concurrency** **may** replace long transactions: an explicit integer version column, compare on write, retry or abort on mismatch.

## Contracts and migrations

*Why:* other people's code depends on these shapes, and breaking them breaks systems you cannot see.

- Public contracts (HTTP APIs, library exports, package metadata such as entry points, types, and supported runtime versions, event and message schemas, persisted file formats, CLI flags and output) **must** stay backward compatible within a supported contract version. Breaking changes **must** introduce an explicitly identified new contract version and be announced; consumers outside the repository **should** get a deprecation period before the old version is retired.
- Libraries **should** follow Semantic Versioning. Dropping a supported runtime version is a breaking change. The lowest supported runtime version **should** run in CI.
- Database migrations **should** follow expand, migrate, contract: add the new shape, move data and readers, then remove the old shape in a later deploy. Running code **must** keep working at every step.
- Migrations **should** be plain SQL files run by a language-agnostic tool (for example [dbmate](https://github.com/amacneil/dbmate)), not ORM-generated code. The schema then outlives any one language, framework, or ORM.

## Background work and integrations

*Why:* requests should stay fast and predictable, and calls to systems you do not control will fail in ways you cannot prevent.

- Work that need not finish before responding (email, file and media processing, bulk jobs) **should** run in background workers. Required synchronous integrations still follow the timeout and retry rules.
- A committed state change that must reliably cause an external effect **should** use a transactional outbox: store the delivery intent in the same transaction, then deliver asynchronously. The atomic guarantee covers state and intent; remote delivery can be delayed or fail. Read-only integrations do not need an outbox. See the [transactional outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html).
- Inbound events that permit asynchronous handling **should** use an inbox: authenticate under Security, store durably, acknowledge, then process. Deduplication keys **must** include the sender or subscription scope when message IDs are not globally unique.
- Workers that can receive duplicate deliveries **must** make their effects idempotent. Deduplication state and local effects **must** commit atomically; remote effects need an idempotency mechanism at the receiving boundary (see Errors).
- Inbox and outbox records **must** have bounded retention, with separate policies for payloads and deduplication keys. The deduplication window **must** cover supported retries and replays. Raw payloads **should** be purged or redacted once no longer needed.
- Exhausted retries and expiring unprocessed messages **must** produce a recorded terminal outcome, with an owner or alert and a defined recovery or discard policy. Replay after deduplication expiry **must** reestablish idempotency or be rejected; records cannot silently expire while delivery is still promised.

## Robustness

*Why:* explicit bounds and checked results turn failures at system limits and unchecked paths into handled cases.

Adapted from NASA/JPL's "Power of 10" rules.

- **Everything bounded.** Every outbound call **must** have a timeout. Retries, queues, worker concurrency, caches, request body sizes, and query results **must** have explicit limits. Lists returned by APIs that can grow without bound **must** be paginated.
- **Bound traversal of untrusted input.** Traversal of external trees or graphs **must** limit depth and total work or input size, whether recursive or iterative. Iteration avoids call-stack exhaustion but does not itself bound memory or runtime.
- **Handle failure-bearing results.** Errors, failure-bearing result values, and designated must-use values **must** be handled or propagated. Intentional discards **must** be explicit and explain why they are safe. Promises **must** be awaited or returned to a responsible caller, or have a rejection handler; `void` alone does not handle rejection. A documented guarantee that a promise cannot reject **may** justify a scoped suppression.
- **Automate detectable omissions.** The check suite **must** enable available ignored-error and unhandled-promise diagnostics (see [Static analysis](#static-analysis-and-deterministic-checks)). Review **should** check handling beyond the tool's guarantees; [Language guidance](#language-guidance-and-tools) identifies those limits.
- **Smallest scope, immutable by default.** Bindings **should** be immutable (`const`, no `mut`) unless mutation is needed, and declared where they are used.
- **Limit indirection.** `eval`, reflection-based dispatch, monkey patching, and macro-heavy code **should not** be used where plain code works. Control flow **should** be visible in the source.
- **Assert what types cannot express.** Preconditions and postconditions the type system cannot capture **should** be checked with `invariant` (see Errors). There is no assertion density target.

## Performance

*Why:* optimizing without measurement targets the wrong thing, and regressions without a budget go unnoticed until users feel them.

- **Measure before optimizing.** Performance claims and optimizations **should** come with a benchmark or profile showing the problem and the gain. Benchmarks **should** use production-like input (distinct values, realistic sizes), not one value in a loop, and report memory as well as time. Keeping an optimization needs the same evidence as adding it.
- **Budgets.** What users feel **should** have a budget in the repository: p95 latency for key endpoints, and JavaScript bundle size and Core Web Vitals for UIs. Budgets **should** be checked in CI where practical.
- **No N+1 queries.** Data access per request **should** be bounded and visible. New hot queries and indexes **should** be checked against their query plans.
- **Caching needs a staleness story.** A cache **must** have a stated invalidation strategy or a stated, acceptable staleness window. Its key **must** include every input the result depends on. Results of caller-supplied functions are cached only when the contract states they are pure.
- **Benchmarks in CI.** Hot paths **may** have benchmarks that run in CI and fail on regressions past a threshold.

## Logging and metrics

*Why:* operational logs and metrics need to reveal incidents without hiding their signal in noise.

- Incidental debug logging **should not** be committed. What may reach production is set under Security (A02).
- Logs **should** be structured (key/value fields) and carry the request ID (see Errors). Logged fields follow the data policy in Security.
- Incidental metrics and instrumentation **should not** be added unless the task asks for them. Instrumentation that budgets and alerting need (see Performance and Security) is fine.

## Infrastructure and deployment

*Why:* an environment that can only be rebuilt from memory cannot be reproduced, reviewed, or trusted.

- Infrastructure **must** be defined as code (for example OpenTofu or Terraform) and changed through PRs like application code.
- Every environment **should** be reproducible from tracked definitions and documented prerequisites, including separately provisioned secrets and external services. Manual changes in a console are drift and **should** be folded back into code or reverted.
- Deployments **should** be automated and repeatable from a known commit. Configuration comes from the environment, not from per-environment builds.

## Releases

*Why:* notes written with the change and publishing from CI make releases reproducible and reviewable for people who cannot see the repository.

- Each user-facing change **should** carry its release note in the PR that makes it (for example a changeset). A check **should** fail a PR without one. A PR with no user-facing change records that explicitly (for example an empty changeset).
- Version numbers and changelogs **should** be generated from those notes, not edited by hand.
- Releases **should** be published by CI from a known commit after the required and applicable conditional checks pass, using the exact artifact that passed them, with no rebuild in between. Merge waivers do not authorize publication with failed checks. Publishing credentials follow Supply chain (A03).
- A library **should** be tested as published: build it with the same command the release uses, then load it from a separate project the way consumers do (for example with both require and import). The Package shape check covers the rest.
- A toolchain bump or structural refactor of a library **should** show its public API surface (for example built type declarations) and its built output's syntax level and built-ins unchanged against the base, or list each difference.
- The release process **should** document how to recover when publishing fails after the version is bumped.

## Code organization

*Why:* code that changes together should live together, so a feature can be understood and changed in one place.

- Code **should** be organized by feature or domain at the top level, rather than technical directories such as `controllers/`, `services/`, or `models/`.
- Within a feature, the technical split **should** apply: `billing/` holds its core, shell, entry points, and tests. Infrastructure code and genuinely generic shared helpers **should** live outside features.
- Tests **should** be colocated with the code they test, in the language's form: a sibling `*.test.ts`, a `_test.go` file in the same package, or an in-file `#[cfg(test)]` module in Rust.
- Functions **should** take few parameters; group related parameters into a named type. Before adding a utility, you **should** check for an existing one.
- Magic numbers and strings **should not** appear inline. Name them as constants, or as value objects when they carry a rule. Obvious values in obvious places (`0`, `1`, an empty string) are fine.
- Files **should** stay under roughly 200 lines, excluding imports and type-only declarations; test files under roughly 300. Split along cohesion lines, or record why the module is coherent at its size. Projects **may** override the numbers.

## Naming

*Why:* code is read far more than it is written, and names are the main interface for every reader, human or agent.

- Variables and parameters **should** name the domain concept, not the type or shape. `household`, not `data`, `result`, `item`, or `record`.
- Generic names (`temp`, `obj`, `val`, `res`, `info`) **must not** be used. Name the actual concept: `parseError`, `choreRow`. This does not apply to `err` or `error` in a catch block where the type is genuinely unknown.
- Booleans and predicates **should** use an `is`, `has`, or `can` prefix: `isApproved`, not `approved`.
- Functions **should** be verb-noun, so the name says what the function does: `approveChore`, not `choreApproval` or `doChore`. Factories **may** use a `create` or `make` prefix.
- Event handlers **should** use `handle` for the function and `on` for the prop or callback slot.
- A codebase **should** keep a domain glossary, and names **should** follow it. Use one term per concept within a context; document meanings that differ between contexts.

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

*Why:* code that explains itself avoids comments that drift from what they describe.

- Comments **should** explain reasons or constraints that code cannot express. Clarify confusing code first; opaque syntax or API workarounds **may** need a brief explanation of what they do.
- Workarounds and external constraints **must** carry a comment explaining their reason. Assertions follow [Types](#types); suppressions follow [Exceptions](#exceptions).
- Doc comments **should** cover contracts omitted by signatures: units, effects, ownership, ordering, failures, and guarantees. Avoid restating obvious operations or signature details. Document an ambiguous parameter directly (is `rate` 0.07 or 7?).
- Obvious operations **should not** get inline comments.
- TODOs **must** name the remaining work, why it was deferred, and a tracking issue: `TODO(#456): handle timezone edge case after #123 lands`.

## Types

*Why:* every rule the compiler enforces is one that review and tests no longer have to.

- The strictest practical compiler or checker settings **should** be on.
- Escape hatches that switch off checking (TypeScript `any`, Rust `unsafe` without need) **must not** be used to silence the compiler. Use the top type (`unknown` in TypeScript) and narrow. Go's `any` follows [Go guidance](#go-provisional).
- Unchecked type assertions **should** be a last resort. Each **must** explain why inference or narrowing cannot establish the claim and why it is safe. Checked conversions need no assertion justification. Potentially lossy conversions **must** check the valid range or document why the loss is intentional.
- Suppression directives (`@ts-ignore`, `#[allow(...)]`, `//nolint`) **must** say why and what would remove the need. Approval and exception records follow [Exceptions](#exceptions).
- Non-null assertions or unwraps **must not** be used on values that can legitimately be absent at runtime. Handle the absent case explicitly.
- Exhaustiveness checking **must** cover sum-type matches. Where adding a variant must force a change, matches **must** explicitly handle every variant or use a checked-unreachable branch. Language-required fallbacks, such as Rust's external `#[non_exhaustive]` enums, are exempt. See [Language guidance](#language-guidance-and-tools) for implementations.
- Domain values with rules **should** use immutable value objects where reasonable, constructed through a parser: IDs, formatted strings, or bounded quantities. A value with no rule beyond its primitive type stays primitive. [Language guidance](#language-guidance-and-tools) covers construction and bypass risks.
- Instants **should** be stored and passed in UTC, converted at the edges. Local dates and recurring local schedules **must** retain their calendar and time-zone semantics rather than being forced into instants. Money **should** use integer minor units or a decimal type rather than binary floating point.

## Errors

*Why:* failures will happen, so they should be visible, specific internally, safe externally, and never silently corrupt state.

- Internal errors **must** identify what failed and the expected versus actual state where useful, using only diagnostic fields allowed by Security. For example, `Chore 01HX3 not found in household 01HX9`, not `Not found`.
- Client-facing errors **must not** leak internals: no stack traces, internal IDs, query details, or existence leaks (for example "user exists"). Return a stable error code the client can act on, and correlate it with the internal error through a request ID.
- Expected outcomes (not found, rejected, conflict) **should** be values in the return type.
- Invariant violations **must** throw (or panic) and abort the affected operation. A request or worker boundary **may** catch the failure to report it and isolate the operation; it **must not** resume work that depends on the violated invariant. The process **must** terminate when shared state can no longer be trusted. See the [TypeScript invariant helper](#typescript).
- You **should** define errors out of existence where the semantics allow it: idempotent operations, masking low-level transient failures with bounded retries, handling errors once in a central place rather than at every call site.
- Retries against external systems **must** be idempotent (idempotency keys or naturally idempotent operations) and **should** use backoff.
- Client errors (most 4xx) **should not** be retried automatically. They need a fix or a deliberate replay.
- Catching an error **must** handle it, convert it, or propagate it with context (see [result handling](#robustness)).

## Testing

*Why:* tests make change safe, and a design that needs no internal mocks keeps them cheap and honest.

- **Test first.** New behavior **should** start with a failing test (red, green, refactor). Acceptance-level tests **should** come first for user-facing features. Most of them run against use cases or the API; only critical user flows need a browser (see UI).
- **Test the core, integration-test the shell.** Pure logic, including UI formatters, reducers, derived state, and the functions behind hooks, **should** have fast unit tests. The shell **should** have a small number of focused integration tests against real dependencies (real database, real filesystem, a test account). Test doubles follow the boundary rule below.
- **Test doubles at external boundaries.** Except for the documented legacy case below, substitutions **must** sit at boundaries to systems or facilities the application does not own: network, filesystem, clock, third-party services. This includes stubs (canned responses), mocks (interaction expectations), and fakes (working simplified implementations). Prefer fakes where practical; real internal collaborators remain in the test.
- **An internal test double is a design smell.** Wanting to replace an internal collaborator **should** prompt moving logic into the core. In legacy code where that refactor is not yet practical, an internal double **may** be used when the PR records the reason and links a tracked follow-up. This permitted legacy case does not require Must-level exception approval.
- **Structure.** Tests **should** follow arrange, act, assert, with one concept per test.
- **Names** **should** read as `should <expected behavior> when <condition>`.
- **Isolation.** Tests, including end-to-end tests, **must not** depend on execution order or shared mutable state.
- **Code that runs nowhere.** Every executable file (benchmarks, examples, scripts) **should** run in some check, if only once with minimal input. Code nothing runs **should** be deleted.
- **Property-based tests** **may** cover pure core logic with clear invariants: roundtrips, idempotence, monotonicity.
- **Test quality.** Every test **must** contain at least one assertion, enforced by lint where available and by review otherwise. Assertion linting **must** be configured for helper and harness assertions. Review **should** check that the test can fail for the relevant defect. Coverage reports execution, not correctness (see [Test Coverage](https://martinfowler.com/bliki/TestCoverage.html)).

## Static analysis and deterministic checks

*Why:* a failing check makes a written rule unambiguous, applies it consistently to humans and agents, and gives fast feedback inside an agent's loop.

Rules a tool can check **should** be automated. Table levels govern check adoption and thresholds; findings retain the level of their originating rule. [Language guidance](#language-guidance-and-tools) maps outcomes to tools.

**How checks run**

- One entry point (for example `check`) **must** define the required suite, conditional checks with explicit applicability rules, and scheduled checks. Local and CI runs **must** use the same implementations and inputs for the same suite and revision. Local hooks that run part of it **should** cover the same files, including every file type the tools support; hooks do not replace the completion gate.
- A change **must** pass the required suite and applicable conditional checks, or have valid waivers accepted by the CI gate, before it is declared done. Results **should** distinguish passes, failures, waivers, and checks not run. Scheduled checks are outside this per-change gate unless the project explicitly includes them. Check configuration **must not** be loosened to make a change pass (see Exceptions). This includes disabling rules, narrowing file coverage, and adding ignores outside the documented exception process.
- In repositories that merge without squashing, each commit on main **should** pass the code checks: fold a red-test commit into its fix before merge. Per-PR checks apply to the PR's last commit.
- A check's result **should** depend on the checked revision, lockfiles, pinned toolchain, and declared inputs such as the comparison revision or PR metadata, not on local state such as a sub-project's installed dependencies or caches. CI or the check itself **should** set up every sub-project from its lockfile. Gate authorization is separate from the underlying check result (see Gate waivers).
- A new check **should** be shown to fail once: break what it guards on purpose, and record the result in the PR.
- A CI change that cannot run before merge **should** name, in the PR, a safe first run after merge and its expected result.
- The development toolchain version **should** be pinned in the repository (.nvmrc, rust-toolchain.toml, the toolchain line in go.mod), and CI **should** use the pinned version. Local checks **should** fail on a toolchain version other than the pinned one. This is separate from the runtime versions a library supports, which are part of its contract (see [Contracts and migrations](#contracts-and-migrations)). Contributor-only requirements (package manager, toolchain) **should** stay out of metadata consumers see (for example engines).
- When a tool's default conflicts with a project rule, the repository **should** configure the tool, including AI agent settings.
- Checks **should** be fast enough to run on every iteration, including every agent loop. Slow checks (mutation testing, full-repo analysis) **may** run on a schedule with a documented owner and failure-response process. The required suite still runs before completion.
- Findings **should** be errors or off. Warnings that never fail the build become noise.
- New code **must** meet Must-level thresholds from day one and **should** meet Should-level ones. Project coverage and changed-lines coverage have separate thresholds below.

**Baselines**

- Existing lint, dependency-boundary, and dead-code findings **may** use reviewed per-finding baselines. Complexity, duplication, maintainability, mutation score, and CRAP **may** use measured baselines at function, file, or project scope. The repository **must** record the adoption revision and scope. New or worsened violations fail; fixes cannot offset different findings.
- Baselines **must** tighten as findings are removed or metrics improve. Formatting, compiler errors, secrets, unhandled failure-bearing results, and package-resolution failures cannot be baselined. Security findings **must** use individual exceptions, even if reported by a baseline-capable tool.
- Coverage has no stored baseline; it uses the changed-lines rule in the table instead.
- Metric-driven changes **should** report other affected metrics before and after, and preserve readable structure rather than optimize scores alone.

**What to check**

| Check | What it enforces | Threshold | Level |
| --- | --- | --- | --- |
| Formatting | One format, applied by a tool. No style discussion in review. | No diff | Must |
| Linting | Language pitfalls and configured project rules. | Zero unresolved findings outside baselines or exceptions | Must |
| Typechecking | Settings, assertions, and suppressions from Types and the language appendix. | Zero unsuppressed errors | Must |
| Dependency rules | Architecture boundaries and allowlists; no cycles; imports through public entry points. | Zero unresolved violations outside baselines or exceptions | Must |
| Dead code | Unused files, exports, and dependencies. | Zero findings | Should |
| Complexity | Per-function cyclomatic complexity (cognitive in Rust). Exhaustive matches over a union may be suppressed with a reason. | At most 10 per function (Rust: 25, cognitive); projects may require less | Should |
| Changed-lines coverage | Coverage of added or modified executable lines and associated branches, where supported. Compare with a recorded base revision using the same coverage configuration and suite selection. | For each supported metric, at least the lower of base coverage and the target; on a project with none yet, the first PR sets it | Must |
| Coverage target | Project-wide line and branch coverage. | At least 90%; projects may require more | Should |
| Mutation testing | Tests catch real changes in core and library code. | A project-set mutation score; the scheduled run fails below it | Should |
| Change risk (CRAP) | Combined complexity and coverage; definition in [Shared checks](#shared-checks). | At most 30 per function | May |
| Secrets | No committed secrets, scanned in pre-commit and CI (tools in the language appendix). | Zero findings | Must |
| Duplication | Copy-pasted blocks, tuned to preserve the rule of three. | Project-defined | May |
| Unhandled results | Detectable ignored failure-bearing or must-use values and unhandled promises (see Robustness); review covers the tool's gaps. | Zero unresolved findings | Must |
| Per-file maintainability | One score per file combining complexity measures (TypeScript: FTA). | Below 50 | Should |
| Package shape | A published library's entry points, types, and module formats resolve the way consumers load them. | Zero findings | Should |

Changed-lines coverage does not guarantee project-wide non-regression: deleting covered code or changing execution of unchanged lines can lower total coverage. PRs **should** report project coverage separately and explain decreases. A metric with no eligible lines or branches is not applicable, not zero; unsupported metrics **must** be identified. Projects below the target **should** record an improvement plan.

## Dependencies

*Why:* every dependency is code you run but did not write or review.

The core takes no third-party dependencies by default (see [Architecture](#architecture)). Every dependency, including one allowlisted for the core, follows these rules:

- A new dependency **must** be evaluated before it is added: maintenance activity, license, security history, transitive footprint, and whether a small amount of own code would do.
- Versions **must** be pinned through committed dependency metadata: a lockfile where the ecosystem has one (`pnpm-lock.yaml`, `Cargo.lock`), and `go.mod` with `go.sum` in Go, where `go.mod` fixes the versions and `go.sum` holds checksums.
- Every project **must** have a defined update story: automated update PRs on a schedule (Renovate, Dependabot, or similar), or a documented manual cadence. Security patches **should** be applied promptly.
- Dependency updates **should** land in their own PRs, separate from feature work.
- Automated update PRs **may** be grouped to reduce review load.
- When a dependency's new major version cannot be adopted yet, the blocker **should** be recorded in an issue with the measured failures and a done-when condition, and the failing update PR closed.

## Security

*Why:* security flaws are expensive to find late, so these rules target the classes that recur most.

Grouped by [OWASP Top 10:2025](https://owasp.org/Top10/2025/) category, after a few general practices.

**General**

- Secrets **must not** be committed, logged, or shipped in client code. They come from the environment or a secret manager at runtime.
- Diagnostic fields **should** be limited to those needed for operation. Personal data **should not** be logged. Log opaque internal IDs rather than direct identifiers (names, emails). A shared logging policy **must** record purpose, access, and retention for any personal data included, including pseudonymous IDs. Apply redaction or pseudonymization where appropriate. These rules apply to errors and logs alike; secrets remain prohibited. See [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).
- Test and development data **should** be synthetic or anonymized, never copied from production.
- External input follows [boundary parsing](#design-principles).
- Processes, services, and credentials **should** have the least privilege they need.
- Controls **should** be layered (defense in depth), so no single check is the only barrier.
- Regexes run on untrusted input **should** be checked for super-linear backtracking, by a tool in the check command where one exists (for example recheck).

**Access control (A01)**

- Access **must** be denied by default and enforced server-side.
- Every route **must** declare its authorization policy, and the router **must** reject a route without one. Policy evaluation follows Exceptional conditions below.
- Data access **must** enforce the resource's authorization policy for the caller, including tenant or ownership constraints where applicable. Public, shared, and administrative access **must** be explicit policies, not bypasses of resource-level checks.
- A denied request **should** be returned as a value (for example a 403), not thrown as an error: it is an expected outcome.
- Outbound requests to user-supplied URLs **must** enforce allowed schemes and destinations against the addresses actually used for connection. Use an allowlist or exclude internal and non-public destinations; disable redirects or apply the same checks to every hop. DNS changes between validation and connection **must not** bypass the policy. See [OWASP SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

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

- Query values **must** be parameterized. Dynamic identifiers or query syntax **must** come from controlled mappings or a builder that safely handles them. Untrusted command inputs **must** be passed as data through argument arrays, with option boundaries enforced where needed, never interpolated into shell syntax.
- Output **must** be encoded for its context (HTML, HTML attributes, URLs).
- URLs from users rendered as links **must** be checked against a scheme allowlist (usually http: and https:), using the parsed scheme, not a string match.

**Design (A06).** Changes touching authentication, authorization, payments, or personal data **should** include a brief threat note in the PR.

**Authentication (A07).** Authentication **should** be delegated to an IdP or a vetted library, not built in-house.

**Integrity (A08)**

- Untrusted data **must not** be deserialized into executable objects.
- Signed inbound payloads **must** pass signature verification and the provider's freshness and replay checks before successful acknowledgment or processing. Preserve the original bytes when the signature covers them; use the provider's verification library where available. Inbox deduplication follows Background work and integrations. See [Stripe's webhook verification example](https://docs.stripe.com/webhooks).

**Logging and alerting (A09).** Security events (authentication failures, authorization denials, privilege changes) **should** be logged and alertable.

**Exceptional conditions (A10).** Security controls **must** fail closed. An error while evaluating one means deny.

## UI

*Why:* keeping logic out of UI rendering makes it testable, while accessibility and localization keep it usable for everyone.

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
- Forms **must** preserve expected native keyboard behavior, including multiline inputs and composite controls, and offer keyboard-accessible submission. Tab order **must** follow a logical reading order, with focus managed after submission and errors. Keyboard shortcuts **may** be added, but **must not** override browser or assistive-technology shortcuts.

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

- Pure UI logic follows [Testing](#testing).
- Critical user flows **should** have end-to-end tests in a real browser against a running app (Playwright or Cypress). Keep them few and focused on what matters most.
- Component tests **may** cover complex interactive components. They **should** query by role and accessible name, which doubles as an accessibility check.
- Selectors **should** use roles, labels, or test IDs, never CSS structure.

## Reasoning and communication

*Why:* decisions are only as good as the claims behind them, and mixing observation with opinion hides which is which.

Applies to design docs, PR descriptions, reviews, and agent output alike.

- You **should** separate reasoning into phases: observe, evaluate, analyze, synthesize, communicate. Scale the rigor to the decision's reversibility and impact.
- You **must** separate observation from interpretation. "The handler calls the DB three times" is an observation; "the handler is slow" is an interpretation until measured.
- You **should** state confidence levels, tradeoffs, and knowledge gaps explicitly. Prefer precise, falsifiable claims over vague generalizations. Avoid absolutist claims. Factual claims in issues and PRs **should** state the measurement behind them (for tool behavior, the version observed) or be labeled unmeasured. Results tables hold only measured cases.
- When a tradeoff exists, you **must** name both sides. Do not silently pick one.
- When a requirement is ambiguous, you **should** present numbered options rather than guess and build, in conversation, issues, and PR bodies alike. When the choice hinges on a measurable fact, measure first and present the data with the options.
- Written output **should** be dry and plain, moderate-to-high detail, with no recap of what was just said.

## Scope and change discipline

*Why:* small, single-purpose changes are faster to review, safer to ship, and easier to revert.

- Tech debt **should** be paid off soon, since unpaid debt compounds quickly. Tracking requirements follow [Exceptions](#exceptions).
- A PR **should** implement only what its task requires, as one self-contained task small enough to review in one sitting. Small, local cleanups in touched code **may** be included.
- Larger refactoring, renaming, or reorganizing outside the task **should not** go in the same PR. If adjacent code blocks the task, fix the minimum and say so; otherwise leave a TODO with context. TODOs follow [Comments](#comments).
- Structural changes (refactors, moves, renames) and behavioral changes **should** land in separate commits or PRs (Kent Beck, *Tidy First?*).
- Refactoring **should** happen under green tests, in small behavior-preserving steps, with tests passing after each step.
- A `refactor:` commit **must not** change behavior. A commit that alters behavior is a `feat:` or `fix:`, whatever it is called.
- Logic changes **must** include their tests in the same PR. Independent test work **may** land first, for example characterization tests before refactoring untested code.
- Every PR **must** leave the main branch working, including each PR in a stack of dependent changes.
- A new API **should** ship with at least one usage in the same PR. Reviewers then see how it is used, and no unused API lands.
- Review size **should** account for both changed lines and file spread. Around 100 changed lines is usually fine, and around 1,000 is usually too large; 200 lines across 50 files is too large. Deleted files and trusted automated refactors count for less.
- A PR that is too large **should** be split, for example into stacked PRs. Reviewers **may** reject a change for size alone.

## Version control and PRs

*Why:* consistent history and PRs make the reasons behind the code searchable and reviewable.

### Commits and branches

- Commits **should** follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): description`, with a body that briefly says why.
- Branches **should** follow [Conventional Branch](https://conventional-branch.github.io): `feature/...`, `bugfix/...`, `hotfix/...`, `release/...`, `chore/...`, aligned with the commit type.
- A project's own conventions take precedence over both.

### Issues and PRs

- Issues and PRs **must** follow the project's established template, so each one covers the same aspects. A project without templates **should** add them.
- CI **may** check PR descriptions against the template's rules (required sections, banned content).
- PR titles **should** use the Conventional Commits format: `feat(billing): add proration`. The title **should** be imperative and stand alone in history.
- Descriptions **should** explain the change, its reason, limitations, and validation without relying on linked pages. Authors **should** update them before merge.
- Description length **should** scale with impact and risk, not its line count. A security-setting change may need more explanation than a large mechanical rename.
- A description **should** cite a standard only where the change deviates from it. Following a standard needs no citation.
- Each fact **should** appear once in a description.
- Notes about other work **should** go on that work's issue, not in the PR.
- PRs **should** open as drafts.
- Independent findings **should** get one issue each, or a tracking issue with a checklist.
- When several PRs share an issue, the last one to merge **should** close it.
- Negative results (checked, nothing found) **should** be recorded on the issue.

## Merge gates

- The main branch **must** be protected against direct pushes.
- The CI gate **must** accept the current revision before merge, including on bot or automation PRs: required and applicable conditional checks pass or have valid waivers (see Exceptions). A documented manual trigger **may** start missing checks, but does not waive them.
- A new required check **should** be added to branch protection in the same change, or run inside an already-required job. The change **should** identify affected open PRs and arrange a rerun or update so each reports the check before merge.
- CI **should** run on PRs into any branch, so each PR in a stack is checked before it is retargeted. Per-PR checks (release note, changed-lines coverage, diff-based lint) **should** compare against the PR's base branch.
- At least one review approval **should** be required.

## Review

Largely adapted from [Google's engineering practices](https://google.github.io/eng-practices/), for reviewers and authors alike. Departures: tech debt may lower code health as a must exception, where Google warns that cleaning up later is a common way for codebases to degrade. The solo-maintainer approval rule and the declare-and-confirm step for emergencies are additions.

Merge eligibility is defined by [Merge gates](#merge-gates).

- **Standard.** Reviewers **should** approve once a change definitely improves code health, even if it is not perfect. There is no perfect code, only better code. A change that makes code health worse **should not** be approved unless it is tech debt recorded as a must exception, or an emergency (see [Exceptions](#exceptions)).
- **First pass.** Reviewers **should** first decide whether the change makes sense at all, then read its main files, and send major design comments early.
- **What to look for.** Reviewers **should** check design, behavior (including edge cases and concurrency), and complexity, watching for over-engineering. They **should** check that naming, comments, and documentation are updated, and apply [Test quality](#testing).
- **Rigor.** Reviewers **should** read the surrounding files, not only the diff, and watch for security flaws, PR size, and mixed structural and behavioral changes. Each finding **should** survive a second look before it is raised.
- **Tone.** Comments **should** be kind, be about the code rather than the author, and explain why. Good work **should** be called out too, with the reason.
- **Severity.** Findings **should** cite the rule they apply and its level. A must violation blocks merge unless it is an approved exception. A should violation needs a fix or a stated reason (see [Exceptions](#exceptions)).
- **Labels.** Nit marks minor polish and Optional marks a suggestion; both are May-level. FYI is for future reference and needs no action in this change.
- **Style preferences.** A preference outside the formatter, linter, and standards **should not** block a PR.
- **Speed.** Reviewers **should** respond within one business day at most, at their next break point rather than mid-task. Quick individual responses matter more than total time to merge. When a full review has to wait, send a quick note saying when, or broad design comments first.
- **Approve with comments.** Reviewers **may** approve while leaving comments, when the remaining comments are minor or optional, or when they trust the author to address them. Say which applies.
- **Disagreements.** Technical facts and data beat opinions, and the formatter and linter settle style. When the author shows, with data or solid engineering principles, that approaches are equally valid, the author's choice wins. Otherwise, consistency with the existing codebase wins, unless it lowers code health.
- **When disagreement persists.** The reviewer **should** first consider that the author may be right. Then try for consensus, then a call between author and reviewer, and record the outcome on the PR. If that fails, escalate to a tech lead or maintainer. A PR **should not** sit unresolved because of a disagreement.
- **Explanations belong in code.** Clarifications **should** become clearer code or useful documentation under [Comments](#comments), not only a review reply.
- **Vocabulary.** Reviews **may** name smells from the [Refactoring catalog](https://refactoring.com/catalog/) (Primitive Obsession, Data Clumps, Feature Envy, Shotgun Surgery) as shared vocabulary.

**Handling review comments.** Authors **should** treat comments as being about the code, not about themselves, and reply calmly. When a reviewer is confused, the fix goes in the code (see Explanations belong in code).

## AI assistance

*Why:* code is judged by its quality, with ownership staying with the person who submits it regardless of the tool used.

Disclosure of AI assistance, including attribution trailers, follows the project's rules. Ownership and equal standards are defined in [Purpose and scope](#purpose-and-scope).

## Changing these standards

*Why:* standards that cannot change get ignored, and standards that change without review drift.

- Changes to these standards **must** go through a PR, like code.
- Review feedback that recurs **should** become a check (preferred) or a rule here. A comment made three times is a missing lint rule.
- Agent instruction files (CLAUDE.md, rules files, skills) **should** link to [the standards](#purpose-and-scope) rather than copy them, and hold only agent-specific rules.
- A rule that no longer pulls its weight **should** be removed, not ignored.

## Language guidance and tools

Read the section for each language used in a change. Language-specific rules take precedence over general language guidance; [rule levels and exceptions](#purpose-and-scope) still apply. Go and Rust guidance is provisional.

Tool tables map the [required outcomes and thresholds](#static-analysis-and-deterministic-checks) to implementation options. Tool names do not change rule levels. Repositories **should** pin versions and configure the selected rules explicitly; equivalent tools **may** replace these options if they enforce the same outcomes. Review covers guarantees the tools cannot establish.

### Shared checks

Secret scanning can use [gitleaks](https://github.com/gitleaks/gitleaks); duplication checks can use [jscpd](https://github.com/kucherenko/jscpd), tuned to the rule of three. These are options for the corresponding checks, not additional requirements.

Optional CRAP scoring (Change Risk Anti-Patterns; Savoia and Evans, 2007) uses `complexity² × (1 − coverage)³ + complexity`, with cyclomatic complexity and coverage from 0 to 1. Compute it from compatible reports; Rust's cognitive-complexity score is not a substitute for cyclomatic complexity here.

### TypeScript

Promise linting does not cover synchronous result unions; review those paths as well.

- Hook file coverage includes `.mjs` and `.cjs` when the tools support them (see [Static analysis](#static-analysis-and-deterministic-checks)).
- `strict` **must** be on.
- `any` **must not** be used; `as T` and `!` follow [Types](#types).
- `@ts-expect-error` **should** be used instead of `@ts-ignore`, so the directive fails once it is no longer needed. Both follow [Suppression requirements](#exceptions).
- Named exports **should** be preferred over default exports.
- Runtime validation at boundaries **should** produce typed values in one step (a schema parser, such as Zod or a custom one), implementing [boundary parsing](#design-principles).
- Implement [exhaustiveness](#types) with a `never` check in the fallback branch; it accepts only values proven unreachable by the compiler.
- Implement [value objects](#types) with brands or tags and parsing constructors. Assertions can forge a brand and remain subject to the assertion rule.

Invariants use a small helper that throws and doubles as a type guard, so it also replaces `!` for values that must be present:

```ts
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invariant failed: ${message}`);
}

invariant(household, `Household ${householdId} missing after insert`);
// household is narrowed to non-undefined from here
```

#### Tool mapping

| Check | Tool |
| --- | --- |
| Typechecking | `tsc --noEmit` |
| Linting | [oxlint](https://oxc.rs) |
| Formatting | [oxfmt](https://oxc.rs) |
| Dependency rules | [rev-dep](https://rev-dep.com): module boundaries, restricted imports, circular imports |
| Dead code | rev-dep: orphan files, unused exports, unused dependencies. [knip](https://knip.dev) **may** be added for unused class and enum members, when the selected dependency checker does not cover them. |
| Duplication | rev-dep |
| Complexity (per function) | oxlint's `eslint/complexity` rule with `max` set to 10 (its default is 20) |
| Per-file maintainability | [FTA](https://github.com/sgb-io/fta) (Halstead and cyclomatic measures) |
| Test coverage | Vitest coverage (`@vitest/coverage-v8`), line and branch |
| Every test asserts | An `expect-expect` lint rule configured for helper and harness assertions; `expect.hasAssertions()` can enforce assertion presence at runtime |
| Mutation testing | [StrykerJS](https://stryker-mutator.io) |
| Unhandled results | oxlint's type-aware `no-floating-promises` with `ignoreVoid` set to false; review synchronous failure-bearing results separately |
| Secrets | See Shared checks |
| Package shape | publint and attw (@arethetypeswrong/cli) on the packed package |

### Go (provisional)

`errcheck` detects ignored errors but does not prove that assigned errors are handled.

- Expected outcomes **should** be returned as `error` values. Wrap with context at each layer: `fmt.Errorf("load household %s: %w", id, err)`. Callers **should** branch with `errors.Is` and `errors.As`, never on message strings.
- Sentinel errors (`var ErrNotFound = errors.New(...)`) **may** be used for conditions callers branch on.
- `panic` is reserved for invariant violations. It **must not** be used for expected failures.
- `any` or `interface{}` **should not** appear in domain code. Narrow it with type switches at boundaries.
- Ports **should** be small interfaces defined by the consumer, not the implementer. Accept interfaces, return concrete types.
- Value objects **should** be structs with an unexported field and a parsing constructor: `type HouseholdID struct{ value string }` plus `ParseHouseholdID(string) (HouseholdID, error)`. A named type such as `type HouseholdID string` does not enforce the rule, since any string converts to it without the parser. The zero value (`HouseholdID{}`) still bypasses the parser, so code at boundaries **should** treat it as invalid.
- IO functions in the shell **should** take `context.Context` as the first parameter. The core **should not** need it.
- Packages **should** be organized by domain, not by layer type. Avoid `util` and `common` packages. Use `internal/` for anything not meant to be imported.
- Tests **should** be table-driven where cases share a shape.
- Configure [exhaustive](https://github.com/nishanths/exhaustive) so a `default` arm does not replace named cases when new enum values must force changes, following [Types](#types).
- The regexp package guarantees linear-time matching, so the [backtracking check](#security) does not apply to it.

#### Tool mapping

| Check | Tool |
| --- | --- |
| Formatting | `gofmt` or `goimports` |
| Linting | `go vet` plus `golangci-lint` (including `staticcheck`) |
| Typechecking | The compiler |
| Dependency rules | `depguard` via golangci-lint |
| Dead code | `unused` via golangci-lint; `deadcode` from golang.org/x/tools |
| Complexity | `gocyclo` or `cyclop` via golangci-lint |
| Exhaustiveness | `exhaustive` via golangci-lint |
| Unhandled results | `errcheck` via golangci-lint; review subsequent handling of assigned errors |
| Test coverage | `go test -cover` (statement coverage only; no standard branch coverage tool) |
| Every test asserts | Assertion linting where available, configured for helper and harness assertions; review otherwise |
| Mutation testing | `gremlins`; evaluate runtime on the project before choosing the schedule |
| Secrets, duplication | See Shared checks |

### Rust (provisional)

`unused_must_use` covers annotated values and functions; review the remaining failure paths.

- Expected outcomes **should** be `Result<T, E>`. Libraries and the core **should** use typed error enums (for example via `thiserror`). Opaque errors (for example `anyhow`) **may** be used in binaries and the shell. Add context when propagating with `?`.
- Invariant violations **must** use `assert!` or `panic!` with a message stating the invariant.
- Under [the absence rule](#types), `expect("...")` **may** replace `unwrap()` when absence violates an invariant; its message states that invariant.
- Every `unsafe` block **must** carry a `// SAFETY:` comment explaining why it is sound.
- Value objects **should** use private-field newtypes and `TryFrom` or `FromStr` constructors, following [Types](#types).
- States **should** be enums with data, so invalid combinations cannot be built.
- Use exhaustive `match` arms; omit `_` when new variants must force changes. External `#[non_exhaustive]` enums require a fallback, as allowed by [Types](#types).
- Ports **should** be traits. Adapters implement them.
- Layering **should** be enforced with workspace crates: the core crate does not depend on the shell crate, so the compiler checks the dependency direction.
- Unit tests **should** live next to the code in `#[cfg(test)]` modules; integration tests in `tests/`.
- The regex crate guarantees linear-time matching, so the [backtracking check](#security) does not apply to it. Backtracking crates (for example fancy-regex) are covered.

#### Tool mapping

| Check | Tool |
| --- | --- |
| Formatting | `rustfmt` |
| Linting | `clippy` with warnings as errors (`-D warnings`) |
| Typechecking | The compiler |
| Dependency rules | Workspace crate boundaries; `cargo-deny` for third-party dependencies |
| Dead code | Compiler `dead_code` lint; `cargo-machete` or `cargo-udeps` for unused dependencies |
| Complexity | `clippy::cognitive_complexity`, enabled explicitly since it is allow-by-default. Rust uses cognitive instead of cyclomatic complexity, with clippy's default threshold of 25. |
| Unhandled results | Compiler `unused_must_use` lint, denied by `-D warnings`; annotate project-defined must-use values and review remaining failure paths |
| Test coverage | `cargo-llvm-cov` (branch coverage needs nightly) |
| Every test asserts | Assertion linting where available, configured for helper and harness assertions; review otherwise |
| Mutation testing | `cargo-mutants` |
| Secrets, duplication | See Shared checks |
