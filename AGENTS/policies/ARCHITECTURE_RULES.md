# ARCHITECTURE_RULES

## Purpose
Guardrails for maintaining modular-monolith boundaries.

## Rules
1. Enforce domain boundaries; no direct cross-domain database reads.
2. Keep shared contracts in `shared/` and avoid domain leakage.
3. Reserve cross-domain orchestration for workflow-orchestrator mechanisms.
4. Maintain tenant scoping and append-only audit/timeline patterns where applicable.
