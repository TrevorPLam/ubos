# ADR-019: pnpm v10 to v11 Migration Path

## Status
Accepted

## Context
UBOS currently uses pnpm v10.33.3 with catalog mode and strict dependency management. pnpm v11 introduces significant breaking changes that require migration planning.

## Decision
Stay on pnpm v10.33.x for now and document the migration path to v11. Upgrade to v11 when either:
1. pnpm v10 reaches end-of-life (EOL)
2. Critical v11 features are needed
3. Security vulnerabilities require v11

## Current State (v10.33.3)
- `packageManager`: `"pnpm@10.33.3"` (exact version)
- `engines.pnpm`: `">=10.29.1 <11"` (version range)
- `pnpm-workspace.yaml`: catalog mode with strict settings
- `.npmrc`: Not present (clean state)

## v11 Breaking Changes Overview

### Configuration Changes
- **package.json#pnpm**: No longer read, settings moved to pnpm-workspace.yaml
- **.npmrc**: Only auth/registry settings remain, others move to pnpm-workspace.yaml
- **Build dependencies**: Consolidated into single `allowBuilds` map
- **Package manager settings**: Collapsed into `pmOnFail` setting
- **ESM**: pnpm v11 is pure ESM distribution

### Removed Features
- `pnpm server` command (no replacement)
- `pnpm install -g` (use `pnpm add -g <pkg>`)
- `pnpm link <pkg-name>` (use `pnpm link ./foo`)

### Environment Variables
- `npm_config_*` → `pnpm_config_*` (rename required)

### Security Hardening Defaults
- `minimumReleaseAge`: 1 day
- `blockExoticSubdeps`: true
- `strictDepBuilds`: true

## Migration Steps

### Automated Migration (Codemod)
```bash
# Run the official codemod
npx codemod run pnpm-v10-to-v11

# Or install globally first
pnpm add --global codemod
codemod run pnpm-v10-to-v11
```

The codemod automatically handles:
- Moves `package.json#pnpm` settings to `pnpm-workspace.yaml`
- Splits `.npmrc` into auth/registry vs configuration
- Consolidates build dependencies into `allowBuilds`
- Renames settings (`allowNonAppliedPatches` → `allowUnusedPatches`)
- Bumps `packageManager` to v11

### Manual Follow-ups Required

#### CVE → GHSA Migration
```yaml
# Before (v10)
auditConfig:
  ignoreCves:
    - "CVE-2021-23424"

# After (v11)
auditConfig:
  ignoreGhsas:
    - "GHSA-xxxx-xxxx-xxxx"  # Manual lookup required
```

#### Environment Variables
```bash
# Before
export npm_config_cache=/path/to/cache

# After  
export pnpm_config_cache=/path/to/cache
```

#### Script Name Conflicts
Scripts named `clean`, `setup`, `deploy`, `rebuild` now shadow built-in commands:
```bash
# Before: pnpm clean (runs script)
# After: pnpm pm clean (runs built-in)
```

## Pre-Migration Checklist

### Dependencies
- [ ] All dependencies support pnpm v11
- [ ] No reliance on removed features (`pnpm server`)
- [ ] CI/CD uses `pnpm_config_*` environment variables
- [ ] Script names don't conflict with built-ins

### Configuration
- [ ] No settings in `package.json#pnpm` field
- [ ] `.npmrc` only contains auth/registry settings
- [ ] Build dependencies ready for `allowBuilds` consolidation

### Testing
- [ ] Test migration in separate branch
- [ ] Verify all build scripts work
- [ ] Check CI/CD pipeline compatibility

## Post-Migration Verification

```bash
# Verify pnpm version
pnpm --version  # Should be 11.x.x

# Check configuration
pnpm config list  # Should show migrated settings

# Test installation
rm -rf node_modules pnpm-lock.yaml
pnpm install  # Should complete without warnings

# Verify scripts
pnpm run build  # Should work as before
```

## Rollback Plan

If migration fails:
```bash
# Restore v10
pnpm add --global pnpm@10.33.3
git checkout pnpm-workspace.yaml package.json .npmrc
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Timeline

- **Current**: pnpm v10.33.3 (stable)
- **Q3 2026**: Evaluate v11 stability
- **Q4 2026**: Target migration window
- **2027**: pnpm v10 EOL (projected)

## References

- [pnpm v11 Migration Guide](https://pnpm.io/11.x/migration)
- [pnpm-v10-to-v11 Codemod](https://app.codemod.com/registry/pnpm-v10-to-v11)
- [v11 Changelog](https://github.com/pnpm/pnpm/blob/main/pnpm/CHANGELOG.md)

## Impact Assessment

### Benefits of v11
- Enhanced security defaults
- Pure ESM distribution (smaller, faster)
- Simplified configuration consolidation
- Better supply chain protection

### Migration Costs
- Configuration file changes
- Potential CI/CD updates
- Environment variable renaming
- Manual CVE → GHSA conversion

### Risk Mitigation
- Stay on v10.33.x (stable, proven)
- Documented migration path
- Automated codemod available
- Rollback plan prepared

---

**Decision Date**: 2026-05-06  
**Review Date**: 2026-09-01  
**Owner**: Infrastructure Team
