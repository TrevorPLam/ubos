# Documentation Standards & Frameworks

**Purpose**: Guide all UBOS documentation through proven, industry-standard approaches  
**Audience**: All engineers, technical writers, architects, and contributors  
**Status**: Living framework - continuously refined based on team feedback

---

## 🎯 Why Documentation Standards?

Documentation without standards becomes:
- **Inconsistent**: Same concepts explained differently in different places
- **Scattered**: Information buried where people won't find it
- **Hard to maintain**: No clear structure means constant reorganization
- **Difficult for new people**: Each doc teaches them a new format

**With standards**, documentation becomes:
- **Discoverable**: Everyone knows where to look
- **Maintainable**: Clear structure makes updates easier
- **Consistent**: Same patterns throughout UBOS
- **Professional**: Built on proven industry practices

---

## 🏆 The UBOS Standards Philosophy

### Three-Tier Documentation Approach

Every documentation piece in UBOS should serve three audiences:

**1. Fundamentals** (Industry Standards)
- What's the standard approach in the industry?
- What do successful companies do?
- How does this connect to established practices?

**2. Best Practices** (Enterprise Standards)
- What's the highest-quality implementation?
- What do the leaders in the space recommend?
- How do we apply this at scale?

**3. Differentiators** (UBOS Specifics)
- How do *we* implement this?
- What's unique about our approach?
- What decisions did we make and why?

### Example: Multi-Tenant Architecture

**Fundamentals**: Row-level isolation is an industry pattern (databases support it)  
**Best Practices**: Use database-level RLS for defense in depth + audit trails  
**UBOS Differentiators**: We use PostgreSQL RLS + tenant context in Express middleware (see ADR-005)

---

## 📚 Core Standards (Six Pillars)

### 1. Diátaxis Framework
**What**: How to organize *any* documentation  
**Why**: Prevents the "where does this doc go?" problem  
**When**: Use for structuring all documentation folders  
**Read**: [diataxis-framework/](diataxis-framework/README.md)

**Quick insight**: Structure docs into four modes:
- **Tutorials** (Learning) - Get started
- **How-To** (Tasks) - Solve a problem
- **Reference** (Information) - What are the details?
- **Explanation** (Understanding) - Why is it this way?

### 2. C4 Model
**What**: Four-level visual architecture documentation  
**Why**: Bridges gap between business and technical people  
**When**: Use for all architecture documentation  
**Read**: [c4-model/](c4-model/README.md)

**Quick insight**: Zoom from system context down to code:
1. Context (User + System + External)
2. Container (Apps + Databases + Services)
3. Component (Inside a container)
4. Code (Classes/functions - rarely needed)

### 3. ISO 42010 (Architecture Description)
**What**: Enterprise-grade architecture documentation standard  
**Why**: Ensures nothing is missed and everything is justified  
**When**: Use for complex architectural decisions  
**Read**: [iso-42010/](iso-42010/README.md)

**Quick insight**: Document architecture by identifying stakeholders, their concerns, and which views address those concerns.

### 4. Microsoft Style Guide
**What**: How to write clear, accessible technical documentation  
**Why**: Good writing is a skill that's learnable  
**When**: Apply to every single piece of writing  
**Read**: [microsoft-style-guide/](microsoft-style-guide/README.md)

**Quick insight**: Five principles:
1. **Conversational** - Write like talking to a colleague
2. **Clear** - Simple words, active voice
3. **Concise** - Remove unnecessary words
4. **Consistent** - Same terms for same concepts
5. **Helpful** - Focus on reader's needs

### 5. NIST Cybersecurity Framework
**What**: How to think about and document security  
**Why**: Security is everyone's job, framework ensures nothing is missed  
**When**: Use for security documentation and risk assessment  
**Read**: [nist-framework/](nist-framework/README.md)

**Quick insight**: Six functions cover the full security lifecycle:
1. **Govern** - Strategy
2. **Identify** - Know your assets
3. **Protect** - Prevent problems
4. **Detect** - Find issues
5. **Respond** - React to incidents
6. **Recover** - Get back to normal

### 6. ADR Pattern
**What**: Lightweight architecture decision records  
**Why**: Preserves the "why" so future developers understand  
**When**: Use whenever making significant architectural choices  
**Read**: [adr-pattern/](adr-pattern/README.md)

**Quick insight**: One document per significant decision:
- Context (why this decision now?)
- Options (what did we consider?)
- Decision (what we chose)
- Rationale (why this option?)
- Consequences (what do we gain/lose?)

---

## 🚀 How to Use These Standards

### Start Here: The Decision Tree

```
"What am I documenting?"
        ↓
    ┌───┴───┬──────────┬──────────┐
    ↓       ↓          ↓          ↓
 Feature  Architecture Security  Decision
    ↓       ↓          ↓          ↓
Diátaxis C4+ISO42010  NIST      ADR
    +       +          +          +
MS Style MS Style  MS Style  MS Style
```

### Practical Application

#### Scenario 1: "I'm writing a feature guide"

1. **Start with structure** (Diátaxis)
   - What mode? Tutorial/How-To/Reference/Explanation?
   - Organize sections accordingly

2. **Apply writing standards** (Microsoft Style)
   - Use conversational tone
   - Keep sentences short
   - Active voice

3. **Include examples** from UBOS
   - Real code snippets
   - Real use cases

**Result**: Clear, scannable, actionable documentation

#### Scenario 2: "I'm redesigning a major system"

1. **Create an ADR** (ADR Pattern)
   - Document the decision and rationale
   - Consider alternatives
   - Record consequences

2. **Create architecture views** (C4 Model)
   - Context diagram
   - Container diagram
   - Key component diagrams

3. **Document architecture** (ISO 42010)
   - Identify stakeholders
   - Map concerns to views
   - Justify decisions

4. **Write explanation** (Diátaxis)
   - Why this architecture?
   - How does it work?
   - What are the tradeoffs?

**Result**: Comprehensive, justified, well-understood architecture

#### Scenario 3: "I'm writing security documentation"

1. **Use NIST framework** for structure
   - Govern/Identify/Protect/Detect/Respond/Recover
   - Makes sure you cover all angles

2. **Organize with Diátaxis**
   - Tutorials for getting started with a control
   - How-To guides for implementing
   - Reference for technical details
   - Explanation for security reasoning

3. **Use C4 to visualize** (optional)
   - Show where controls live in architecture
   - Show data flows

4. **Write with Microsoft Style**
   - Assume non-security readers
   - Explain why controls matter
   - Make it actionable

**Result**: Security that everyone understands and follows

---

## 🎓 Standards in Practice (Real Examples)

### Example 1: Multi-Tenant Data Isolation

**Framework**: NIST (Protect) + ADR + C4 + Microsoft Style

1. **ADR-005** documents the decision
   - Why PostgreSQL RLS over other approaches
   - What we gain (isolation) and lose (performance)

2. **C4 Component diagram** shows how it works
   - RLS policies in database
   - Tenant context middleware
   - Query patterns

3. **NIST Protect** section in security docs
   - What isolation means
   - How it prevents data leaks
   - How to verify it works

4. **Microsoft Style** makes it all clear
   - Simple explanations
   - Real examples
   - Actionable procedures

**Result**: Everyone understands multi-tenancy, can implement it correctly, and knows why it matters

### Example 2: Getting Started Guide

**Framework**: Diátaxis + Microsoft Style

1. **Tutorial section** (Diátaxis)
   - Step-by-step for first-time users
   - 10-minute walkthrough
   - "You're done!" celebration

2. **How-To section** (Diátaxis)
   - "How to add a new user"
   - "How to create a deal"
   - Problem → solution pattern

3. **Reference section** (Diátaxis)
   - All keyboard shortcuts
   - All menu options
   - Searchable, scannable

4. **Explanation section** (Diátaxis)
   - Why the interface is organized this way
   - How different sections relate
   - Philosophy behind the design

5. **Microsoft Style** throughout
   - Conversational tone
   - Short sentences
   - Real examples
   - Helpful warnings

**Result**: Onboarding takes 10 minutes instead of 2 hours

---

## 🔧 Standards for Different Roles

### For Engineers (Writing Code Documentation)
- **Primary**: Diátaxis (organize by mode)
- **Secondary**: Microsoft Style (write clearly)
- **When needed**: C4 (show architecture)
- **For decisions**: ADR (document why)

### For Architects (System Design)
- **Primary**: C4 Model (visualize)
- **Primary**: ISO 42010 (structure)
- **Required**: ADR (decisions)
- **Apply**: Microsoft Style (write it down)

### For Security Team (Security Docs)
- **Primary**: NIST Framework (structure)
- **Secondary**: Diátaxis (organize)
- **Apply**: Microsoft Style (write clearly)
- **When needed**: C4 (show security architecture)

### For Product Team (User Documentation)
- **Primary**: Diátaxis (organization)
- **Primary**: Microsoft Style (clarity)
- **Secondary**: C4 (show how system works)

---

## ✅ Checklist: "Is my documentation standards-compliant?"

### Structure
- [ ] Documentation is organized by Diátaxis mode (Tutorial/How-To/Reference/Explanation)?
- [ ] If architectural: Follows C4 levels or ISO 42010 viewpoints?
- [ ] If decision: Documented as an ADR?
- [ ] If security: Organized by NIST function?

### Writing
- [ ] Tone is conversational (like talking to a colleague)?
- [ ] Sentences are short (< 25 words)?
- [ ] Uses active voice (not "is implemented" but "we implement")?
- [ ] Consistent terminology (same term for same concept)?
- [ ] First sentence explains purpose?

### Content
- [ ] Audience is clear?
- [ ] Examples are provided (code, screenshots, scenarios)?
- [ ] UBOS-specific information is included?
- [ ] Links to related standards are present?
- [ ] Content is current (not outdated)?

### Maintenance
- [ ] Version or date is included?
- [ ] Review cycle is documented?
- [ ] Status is clear (current, deprecated, planned)?
- [ ] Someone is assigned to maintain it?

---

## 🌱 Growing Your Standards Knowledge

### Tier 1: Baseline (Required)
Understand these to write any documentation:
1. Read [Diátaxis Framework](diataxis-framework/README.md) (30 min)
2. Skim [Microsoft Style Guide](microsoft-style-guide/README.md) (20 min)
3. You're ready to document!

### Tier 2: Intermediate (For Architects)
Understand these to design systems:
1. Study [C4 Model](c4-model/README.md) (1 hour)
2. Review [ISO 42010](iso-42010/README.md) (1 hour)
3. Learn [ADR Pattern](adr-pattern/README.md) (1 hour)
4. You can document architecture!

### Tier 3: Advanced (For Security & Leadership)
Understand these for specialized domains:
1. Deep dive [NIST Framework](nist-framework/README.md) (2 hours)
2. Apply to your domain
3. You can build security strategies!

---

## 🔄 Evolution & Feedback

These standards are **living documents**. They evolve as:
- Team learns what works
- Industry best practices change
- New problems emerge

**How to suggest improvements**:
1. Try the standard
2. Note what works/doesn't
3. Create an issue or PR
4. We discuss and update

---

## 🎯 Quick Reference by Use Case

### "I'm writing documentation for a feature"
→ Start with [Diátaxis Framework](diataxis-framework/README.md)  
→ Then apply [Microsoft Style Guide](microsoft-style-guide/README.md)

### "I'm documenting system architecture"
→ Start with [C4 Model](c4-model/README.md)  
→ Then follow [ISO 42010](iso-42010/README.md)  
→ Finally, use [ADR Pattern](adr-pattern/README.md) for decisions

### "I'm documenting security controls"
→ Start with [NIST Framework](nist-framework/README.md)  
→ Organize using [Diátaxis Framework](diataxis-framework/README.md)

### "I'm writing an ADR"
→ Reference [ADR Pattern](adr-pattern/README.md)  
→ Apply [Microsoft Style Guide](microsoft-style-guide/README.md)

---

## 📊 Standards Coverage in UBOS

| Standard | Used In | Adoption Status |
|----------|---------|-----------------|
| **Diátaxis** | All documentation folders | ✅ Active |
| **C4 Model** | Architecture docs | ✅ Active |
| **ISO 42010** | Architecture docs | ✅ Active |
| **Microsoft Style** | All written docs | ✅ Active |
| **NIST CSF** | Security docs | ✅ Active |
| **ADR Pattern** | Architectural decisions | ✅ Active |

---

## 🔗 Related Documentation

- **Main Docs**: [docs/](../README.md)
- **Architecture**: [docs/architecture/](../architecture/)
- **Security**: [docs/security/](../security/)
- **Data**: [docs/data/](../data/)

---

## 📝 How to Use This Folder

1. **Reference**: When writing docs, check relevant standards
2. **Copy Templates**: Use provided templates in each folder
3. **Apply Examples**: Follow examples for your documentation type
4. **Validate**: Ensure your docs meet standard requirements
5. **Iterate**: Improve based on feedback

---

**Last Updated**: 2026-02-04  
**Next Review**: 2026-05-01
