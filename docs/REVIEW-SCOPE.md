# Source scope and provenance

This repository is a fresh, allowlisted source snapshot for technical review. It contains selected original implementation modules, a small unsigned SDK-construction extraction and tests. It contains no inherited development Git history or archived application bundle.

## Included

- The named DBC integration, fee policy, exact accounting and reader-state modules.
- A constructor that follows the actual application's pool/optional first-buy assembly, reduced to unsigned review inputs and outputs.
- Selected existing arithmetic/reader tests, with public or generated synthetic keys only.
- Additional offline SDK tests using generated configuration accounts built from the public Meteora IDL.
- Pinned dependency/lock files, a small BigInt buffer adapter and documentation sufficient to run these tests.

Implementation comments are removed from copied modules. The configuration validator includes only its community validation prefix, leaving project-token logic outside this scope. Versioned accounting includes only the V3/V4 manual-policy subset used by the current receipt projection; older accounting versions are not exported. Its behavior is preserved for those supported versions, while other versions are rejected by this review subset. `prepare-community-launch.ts` is an extraction for this review rather than the full launch-screen implementation. Synthetic curve parameters are test choices, not a production curve dump.

## Excluded

- Credentials, provider/API settings, environment files and deployment identifiers.
- Account records, contact details, operator interfaces, payment execution and privileged workflows.
- Communications, internal strategy, planning documents and development history.
- Private studios, generated build outputs, caches, source maps and local validation artifacts.
- Full production frontend/backend and the original art/3D asset pipeline.

Those exclusions are deliberate. The source available here proves only the code behaviors covered by its tests. The live product and submission demonstration are reviewed separately. It is a partial source export, not a complete deployment or full open-source release.

## Verification scope

`npm test` verifies offline SDK instruction construction, packet size, exact arithmetic, migration-coverage labels and stale/unavailable reader behavior. `npm run typecheck` checks this package's source dependency closure. Neither check is an independent security audit, a validator trade execution or a mainnet payout proof.

`SOURCE-SCOPE.json` enumerates the public package. `SHA256SUMS.txt` pins the files reviewed for publication; dependency installation directories and private validation records are not included.
