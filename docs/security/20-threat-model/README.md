# Threat Model & Vulnerability Management

**Purpose**: STRIDE threat analysis, risk register, vulnerability tracking  
**Audience**: Security team, architects, risk managers  
**Status**: Living documents - threats evolve, update quarterly

---

## 📋 Overview

Documents threats to the system using STRIDE methodology, maintains risk register, and defines vulnerability management processes.

---

## 📚 Documents in This Folder

| Document | Purpose | Read Time | Status |
|----------|---------|-----------|--------|
| [THREAT_MODEL.md](THREAT_MODEL.md) | STRIDE analysis + risk register | 30 min | ✅ Complete |
| [VULNERABILITY_MANAGEMENT.md](VULNERABILITY_MANAGEMENT.md) | Vuln discovery, assessment, remediation | 15 min | ✅ Complete |

---

## 🎯 STRIDE Threat Categories

**S**poofing: Impersonating someone/something  
**T**ampering: Modifying data or code  
**R**epudiation: Denying actions performed  
**I**nformation Disclosure: Exposing information to unauthorized parties  
**D**enial of Service: Degrading or denying service  
**E**levation of Privilege: Gaining unauthorized capabilities  

---

## 🏗️ Threat Modeling Process

1. **Identify Assets**: Data, systems, processes to protect
2. **Create Architecture Diagrams**: Data flow diagrams
3. **Identify Threats**: Use STRIDE for each component
4. **Rate Risks**: DREAD scoring (Damage, Reproducibility, Exploitability, Affected users, Discoverability)
5. **Define Mitigations**: Controls to reduce risk
6. **Validate**: Test mitigations are effective

---

## 💡 Risk Assessment

### Risk Formula

**Risk = Likelihood × Impact**

**Likelihood** (1-5):
1. Very Unlikely (< 5% chance)
2. Unlikely (5-25%)
3. Possible (25-50%)
4. Likely (50-75%)
5. Very Likely (> 75%)

**Impact** (1-5):
1. Negligible (< $1k damage)
2. Minor ($1k-$10k)
3. Moderate ($10k-$100k)
4. Major ($100k-$1M)
5. Catastrophic (> $1M or loss of life)

**Risk Score**: 1-4 = Low, 5-9 = Medium, 10-15 = High, 16-25 = Critical

---

## 📊 Risk Register Summary

| Risk Level | Count | Mitigation Status |
|------------|-------|-------------------|
| **Critical (16-25)** | 0 | N/A |
| **High (10-15)** | 3 | 2 mitigated, 1 in progress |
| **Medium (5-9)** | 12 | 8 mitigated, 4 accepted |
| **Low (1-4)** | 25 | Monitored |

---

## 🔗 Related Documentation

- **Parent**: [docs/security/README.md](../README.md)
- **Controls**: [docs/security/10-controls/](../10-controls/)
- **Implementation**: [docs/security/30-implementation-guides/](../30-implementation-guides/)

---

**Quick Navigation**: [Back to Security](../README.md) | [Threat Model](THREAT_MODEL.md) | [Vuln Management](VULNERABILITY_MANAGEMENT.md)
