---
title: Incident Response Plan
version: "1.0.0"
last_updated: "2026-02-04"
status: "active"
owner: "Security Team"
classification: "confidential"
related_docs:
  - SECURITY_MONITORING.md
  - ACCESS_CONTROL.md
  - DATA_PROTECTION.md
---

# Incident Response Plan

## Table of Contents

- [Overview](#overview)
- [Incident Classification](#incident-classification)
- [Response Team Roles and Responsibilities](#response-team-roles-and-responsibilities)
- [Detection and Analysis Procedures](#detection-and-analysis-procedures)
- [Containment Strategies](#containment-strategies)
- [Eradication and Recovery Steps](#eradication-and-recovery-steps)
- [Post-Incident Activities](#post-incident-activities)
- [Communication Plan](#communication-plan)
- [Escalation Procedures](#escalation-procedures)
- [Lessons Learned Process](#lessons-learned-process)
- [Incident Response Drills](#incident-response-drills)
- [Incident Response Tools](#incident-response-tools)

## Overview

This Incident Response Plan (IRP) defines UBOS's procedures for detecting, responding to, and recovering from security incidents. The plan follows the NIST SP 800-61 framework and ensures rapid, coordinated response to minimize impact on operations, data, and users.

### Objectives

1. **Rapid Detection**: Identify security incidents quickly through monitoring and alerts
2. **Effective Response**: Contain and mitigate threats with minimal business disruption
3. **Complete Recovery**: Restore systems to normal operations safely
4. **Continuous Improvement**: Learn from incidents to strengthen security posture
5. **Compliance**: Meet regulatory requirements for incident response

### Incident Response Lifecycle

```
┌─────────────┐
│ Preparation │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Detection &      │
│ Analysis         │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Containment,     │
│ Eradication &    │
│ Recovery         │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Post-Incident    │
│ Activity         │
└──────────────────┘
```

## Incident Classification

### Severity Levels

Incidents are classified by severity to determine appropriate response procedures and resources.

```typescript
// shared/incident-types.ts
export enum IncidentSeverity {
  CRITICAL = "critical",  // Production down, data breach, active attack
  HIGH = "high",          // Significant impact, potential breach, vulnerability
  MEDIUM = "medium",      // Limited impact, suspicious activity
  LOW = "low",           // Minor issues, false positives
}

export enum IncidentCategory {
  UNAUTHORIZED_ACCESS = "unauthorized_access",
  DATA_BREACH = "data_breach",
  MALWARE = "malware",
  DENIAL_OF_SERVICE = "denial_of_service",
  INSIDER_THREAT = "insider_threat",
  PHYSICAL_SECURITY = "physical_security",
  LOST_STOLEN_DEVICE = "lost_stolen_device",
  MISCONFIGURATION = "misconfiguration",
  VULNERABILITY_EXPLOITATION = "vulnerability_exploitation",
  SUPPLY_CHAIN_COMPROMISE = "supply_chain_compromise",
}

export interface SecurityIncident {
  id: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  status: "open" | "investigating" | "contained" | "resolved" | "closed";
  title: string;
  description: string;
  detectedAt: Date;
  detectedBy: string;
  assignedTo?: string;
  affectedSystems: string[];
  affectedOrganizations: string[];
  impactAssessment?: {
    usersAffected: number;
    dataCompromised: boolean;
    serviceDisruption: boolean;
    estimatedCost?: number;
  };
  timeline: IncidentTimelineEntry[];
  actions: IncidentAction[];
  rootCause?: string;
  lessonsLearned?: string;
  closedAt?: Date;
}
```

### Severity Classification Matrix

| Severity | Response Time | Example Scenarios |
|----------|--------------|-------------------|
| **CRITICAL** | < 15 minutes | • Active data breach<br>• Production system completely down<br>• Ransomware attack<br>• Root access compromised<br>• Customer data exposed publicly |
| **HIGH** | < 1 hour | • Suspected data breach<br>• Major service degradation<br>• Critical vulnerability actively exploited<br>• Multiple failed authentication attempts<br>• Unauthorized database access |
| **MEDIUM** | < 4 hours | • Suspicious network activity<br>• Non-critical service disruption<br>• Vulnerability detected (not exploited)<br>• Failed privilege escalation attempt<br>• DDoS attempt (mitigated) |
| **LOW** | < 24 hours | • Isolated failed login attempts<br>• Minor configuration issues<br>• False positive alerts<br>• Policy violations<br>• Expired certificates (non-critical) |

### Incident Classification Decision Tree

```typescript
// server/incident-classification.ts
export function classifyIncident(incident: Partial<SecurityIncident>): IncidentSeverity {
  // Critical: Data breach or production down
  if (
    incident.category === IncidentCategory.DATA_BREACH ||
    incident.impactAssessment?.dataCompromised ||
    incident.impactAssessment?.serviceDisruption
  ) {
    return IncidentSeverity.CRITICAL;
  }

  // Critical: Multiple high-value systems affected
  if (
    incident.affectedSystems && 
    incident.affectedSystems.length > 5
  ) {
    return IncidentSeverity.CRITICAL;
  }

  // High: Unauthorized access or exploitation
  if (
    incident.category === IncidentCategory.UNAUTHORIZED_ACCESS ||
    incident.category === IncidentCategory.VULNERABILITY_EXPLOITATION
  ) {
    return IncidentSeverity.HIGH;
  }

  // Medium: Suspicious activity or vulnerabilities
  if (
    incident.category === IncidentCategory.MISCONFIGURATION ||
    incident.category === IncidentCategory.DENIAL_OF_SERVICE
  ) {
    return IncidentSeverity.MEDIUM;
  }

  // Default: Low
  return IncidentSeverity.LOW;
}
```

## Response Team Roles and Responsibilities

### Core Incident Response Team (IRT)

```typescript
// shared/incident-team.ts
export enum IncidentRole {
  INCIDENT_COMMANDER = "incident_commander",
  SECURITY_LEAD = "security_lead",
  ENGINEERING_LEAD = "engineering_lead",
  COMMUNICATIONS_LEAD = "communications_lead",
  LEGAL_COUNSEL = "legal_counsel",
  COMPLIANCE_OFFICER = "compliance_officer",
}

export interface TeamMember {
  role: IncidentRole;
  name: string;
  email: string;
  phone: string;
  alternates: string[];
}

const INCIDENT_RESPONSE_TEAM: TeamMember[] = [
  {
    role: IncidentRole.INCIDENT_COMMANDER,
    name: "VP of Engineering",
    email: "vp-eng@ubos.com",
    phone: "+1-555-0001",
    alternates: ["CTO", "Director of Engineering"],
  },
  {
    role: IncidentRole.SECURITY_LEAD,
    name: "Security Engineer",
    email: "security@ubos.com",
    phone: "+1-555-0002",
    alternates: ["Senior Backend Engineer"],
  },
  {
    role: IncidentRole.ENGINEERING_LEAD,
    name: "Senior DevOps Engineer",
    email: "devops@ubos.com",
    phone: "+1-555-0003",
    alternates: ["Backend Team Lead"],
  },
  {
    role: IncidentRole.COMMUNICATIONS_LEAD,
    name: "VP of Marketing",
    email: "marketing@ubos.com",
    phone: "+1-555-0004",
    alternates: ["Customer Success Manager"],
  },
  {
    role: IncidentRole.LEGAL_COUNSEL,
    name: "General Counsel",
    email: "legal@ubos.com",
    phone: "+1-555-0005",
    alternates: ["External Legal Counsel"],
  },
  {
    role: IncidentRole.COMPLIANCE_OFFICER,
    name: "Compliance Manager",
    email: "compliance@ubos.com",
    phone: "+1-555-0006",
    alternates: ["VP of Operations"],
  },
];
```

### Role Responsibilities

#### Incident Commander
- **Primary**: Overall incident coordination and decision-making
- **Responsibilities**:
  - Declare incident severity and activate response team
  - Coordinate response activities across teams
  - Make final decisions on containment and recovery strategies
  - Authorize external communications
  - Approve resource allocation
  - Decide when incident is resolved

#### Security Lead
- **Primary**: Technical security investigation and analysis
- **Responsibilities**:
  - Analyze attack vectors and indicators of compromise (IoCs)
  - Identify affected systems and data
  - Recommend containment and eradication strategies
  - Collect and preserve forensic evidence
  - Coordinate with external security resources if needed
  - Update threat intelligence

#### Engineering Lead
- **Primary**: System containment, recovery, and remediation
- **Responsibilities**:
  - Execute containment strategies (isolate systems, block IPs)
  - Implement security patches and configuration changes
  - Restore affected systems and services
  - Verify system integrity post-recovery
  - Deploy monitoring and detection improvements
  - Document technical changes

#### Communications Lead
- **Primary**: Internal and external communications
- **Responsibilities**:
  - Draft customer notifications and status updates
  - Coordinate with PR and legal teams
  - Manage social media and public statements
  - Update internal stakeholders
  - Handle media inquiries
  - Prepare breach notification letters

#### Legal Counsel
- **Primary**: Legal compliance and liability management
- **Responsibilities**:
  - Advise on legal obligations (breach notification laws)
  - Coordinate with law enforcement if needed
  - Review external communications for legal issues
  - Assess liability and insurance coverage
  - Manage regulatory reporting requirements
  - Preserve attorney-client privilege for investigations

#### Compliance Officer
- **Primary**: Regulatory compliance and reporting
- **Responsibilities**:
  - Identify applicable compliance requirements (GDPR, HIPAA, etc.)
  - Ensure proper breach notifications (72-hour GDPR deadline)
  - Coordinate with regulatory authorities
  - Document compliance activities
  - Update compliance policies based on incident
  - Manage audit evidence

## Detection and Analysis Procedures

### Detection Sources

```typescript
// server/incident-detection.ts
export enum DetectionSource {
  AUTOMATED_ALERT = "automated_alert",      // Monitoring system alert
  MANUAL_REVIEW = "manual_review",          // Engineer discovered during review
  USER_REPORT = "user_report",              // Customer or employee report
  THREAT_INTELLIGENCE = "threat_intelligence", // External threat feed
  SECURITY_SCAN = "security_scan",          // Vulnerability scan or pentest
  LOG_ANALYSIS = "log_analysis",            // SIEM or log review
  THIRD_PARTY = "third_party",              // Vendor or partner notification
}

interface IncidentAlert {
  source: DetectionSource;
  timestamp: Date;
  severity: IncidentSeverity;
  title: string;
  description: string;
  indicators: string[];
  affectedSystems: string[];
  rawData?: any;
}
```

### Automated Detection Rules

```typescript
// server/detection-rules.ts
export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  condition: (event: SecurityEvent) => boolean;
  actions: AlertAction[];
}

const DETECTION_RULES: DetectionRule[] = [
  {
    id: "AUTH-001",
    name: "Multiple Failed Login Attempts",
    description: "More than 5 failed login attempts in 5 minutes from same IP",
    severity: IncidentSeverity.MEDIUM,
    category: IncidentCategory.UNAUTHORIZED_ACCESS,
    condition: (event) => {
      const recentFailures = getRecentFailedLogins(event.ipAddress, 5);
      return recentFailures > 5;
    },
    actions: [
      { type: "block_ip", duration: 3600 },
      { type: "notify_security_team" },
      { type: "create_incident" },
    ],
  },
  {
    id: "DATA-001",
    name: "Unusual Data Export Volume",
    description: "Single user exports > 10,000 records in 1 hour",
    severity: IncidentSeverity.HIGH,
    category: IncidentCategory.DATA_BREACH,
    condition: (event) => {
      const exports = getUserExportsInLastHour(event.userId);
      return exports > 10000;
    },
    actions: [
      { type: "suspend_user" },
      { type: "alert_incident_commander" },
      { type: "create_incident" },
    ],
  },
  {
    id: "ACCESS-001",
    name: "Cross-Organization Data Access",
    description: "User attempted to access data from another organization",
    severity: IncidentSeverity.CRITICAL,
    category: IncidentCategory.UNAUTHORIZED_ACCESS,
    condition: (event) => {
      return event.requestedOrgId !== event.userOrgId;
    },
    actions: [
      { type: "block_request" },
      { type: "suspend_user" },
      { type: "alert_incident_commander" },
      { type: "create_incident" },
    ],
  },
  {
    id: "PRIV-001",
    name: "Privilege Escalation Attempt",
    description: "User attempted to access admin-only endpoint",
    severity: IncidentSeverity.HIGH,
    category: IncidentCategory.UNAUTHORIZED_ACCESS,
    condition: (event) => {
      return event.endpoint.startsWith("/api/admin") && event.userRole !== "admin";
    },
    actions: [
      { type: "block_request" },
      { type: "notify_security_team" },
      { type: "create_incident" },
    ],
  },
];

// Detection engine
export class DetectionEngine {
  async evaluateEvent(event: SecurityEvent): Promise<void> {
    for (const rule of DETECTION_RULES) {
      try {
        if (rule.condition(event)) {
          await this.triggerAlert(rule, event);
        }
      } catch (error) {
        console.error(`Detection rule ${rule.id} failed:`, error);
      }
    }
  }

  private async triggerAlert(rule: DetectionRule, event: SecurityEvent): Promise<void> {
    // Create incident
    const incident = await storage.createIncident({
      severity: rule.severity,
      category: rule.category,
      title: rule.name,
      description: rule.description,
      detectedAt: new Date(),
      detectedBy: "DETECTION_ENGINE",
      status: "open",
      affectedSystems: [event.system],
    });

    // Execute actions
    for (const action of rule.actions) {
      await this.executeAction(action, event, incident);
    }

    // Notify team
    await this.notifyTeam(incident);
  }

  private async executeAction(
    action: AlertAction,
    event: SecurityEvent,
    incident: SecurityIncident
  ): Promise<void> {
    switch (action.type) {
      case "block_ip":
        await this.blockIP(event.ipAddress, action.duration);
        break;
      case "suspend_user":
        await this.suspendUser(event.userId);
        break;
      case "notify_security_team":
        await this.notifySecurityTeam(incident);
        break;
      case "alert_incident_commander":
        await this.alertIncidentCommander(incident);
        break;
      case "create_incident":
        // Already created above
        break;
    }
  }
}
```

### Analysis Checklist

When analyzing a potential incident, the Security Lead should:

1. **Validate the Alert**
   - [ ] Confirm the incident is not a false positive
   - [ ] Gather initial evidence (logs, screenshots, reports)
   - [ ] Identify affected systems and users

2. **Assess Impact**
   - [ ] Determine what data/systems are affected
   - [ ] Estimate number of users/organizations impacted
   - [ ] Identify if data was accessed, modified, or exfiltrated
   - [ ] Check for continued attacker access

3. **Classify Severity**
   - [ ] Use severity matrix to assign initial classification
   - [ ] Consider business impact and regulatory requirements
   - [ ] Escalate if severity is HIGH or CRITICAL

4. **Collect Evidence**
   - [ ] Preserve relevant logs before they rotate
   - [ ] Take snapshots of affected systems
   - [ ] Document indicators of compromise (IoCs)
   - [ ] Capture network traffic if possible

5. **Initial Containment**
   - [ ] Isolate affected systems if needed
   - [ ] Block malicious IPs or accounts
   - [ ] Reset compromised credentials

## Containment Strategies

### Short-Term Containment

Immediate actions to limit incident spread while maintaining business operations.

```typescript
// server/incident-containment.ts
export class ContainmentManager {
  // Block malicious IP addresses
  async blockIPAddress(ip: string, duration: number): Promise<void> {
    // Add to firewall blocklist
    await this.updateFirewallRules([
      {
        action: "deny",
        source: ip,
        expiration: Date.now() + duration * 1000,
      },
    ]);

    // Log the action
    await storage.createAuditLog({
      organizationId: "SYSTEM",
      action: "ip.blocked",
      actorId: "INCIDENT_RESPONSE",
      metadata: { ip, duration },
    });
  }

  // Suspend compromised user account
  async suspendUser(userId: string, reason: string): Promise<void> {
    // Revoke all sessions
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.userId, userId));

    // Revoke API keys
    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.createdBy, userId));

    // Mark user as suspended
    await db
      .update(users)
      .set({ 
        suspendedAt: new Date(),
        suspensionReason: reason,
      })
      .where(eq(users.id, userId));

    // Notify user (if not malicious)
    if (!reason.includes("malicious")) {
      await this.notifyUserSuspension(userId, reason);
    }

    // Log the action
    await storage.createAuditLog({
      organizationId: "SYSTEM",
      action: "user.suspended",
      actorId: "INCIDENT_RESPONSE",
      targetId: userId,
      metadata: { reason },
    });
  }

  // Isolate affected system/service
  async isolateSystem(system: string): Promise<void> {
    // Remove from load balancer
    await this.updateLoadBalancer({
      action: "remove",
      target: system,
    });

    // Block network traffic
    await this.updateNetworkPolicy({
      action: "isolate",
      target: system,
    });

    // Notify on-call team
    await this.notifyOnCall({
      title: `System Isolated: ${system}`,
      severity: "critical",
      message: `System ${system} has been isolated due to security incident`,
    });

    // Log the action
    await storage.createAuditLog({
      organizationId: "SYSTEM",
      action: "system.isolated",
      actorId: "INCIDENT_RESPONSE",
      metadata: { system },
    });
  }

  // Rotate compromised credentials
  async rotateCredentials(credentialType: string): Promise<void> {
    switch (credentialType) {
      case "database":
        await this.rotateDatabasePassword();
        break;
      case "api_keys":
        await this.revokeAllApiKeys();
        break;
      case "encryption_keys":
        await this.rotateEncryptionKeys();
        break;
      case "jwt_secret":
        await this.rotateJWTSecret();
        break;
    }

    // Log the action
    await storage.createAuditLog({
      organizationId: "SYSTEM",
      action: "credentials.rotated",
      actorId: "INCIDENT_RESPONSE",
      metadata: { credentialType },
    });
  }

  // Enable enhanced monitoring
  async enableEnhancedMonitoring(systems: string[]): Promise<void> {
    for (const system of systems) {
      // Increase log verbosity
      await this.updateLogLevel(system, "debug");

      // Enable additional audit logging
      await this.enableAuditLogging(system, {
        logAllRequests: true,
        logRequestBodies: true,
        logResponses: true,
      });

      // Add real-time alerting
      await this.addRealtimeAlerts(system, [
        "failed_authentication",
        "unauthorized_access",
        "data_export",
        "configuration_change",
      ]);
    }
  }
}
```

### Long-Term Containment

Sustainable security measures while investigation continues.

- **Network Segmentation**: Isolate affected network segments
- **Access Restrictions**: Implement temporary access controls
- **Backup Verification**: Verify integrity of backups
- **Monitoring Enhancement**: Deploy additional monitoring tools
- **Patch Priority Vulnerabilities**: Apply security updates

## Eradication and Recovery Steps

### Eradication

Remove threat completely from environment.

```typescript
// server/incident-eradication.ts
export class EradicationManager {
  async eradicateThreat(incident: SecurityIncident): Promise<void> {
    switch (incident.category) {
      case IncidentCategory.MALWARE:
        await this.removeMalware(incident);
        break;
      case IncidentCategory.UNAUTHORIZED_ACCESS:
        await this.removeUnauthorizedAccess(incident);
        break;
      case IncidentCategory.VULNERABILITY_EXPLOITATION:
        await this.patchVulnerability(incident);
        break;
      case IncidentCategory.MISCONFIGURATION:
        await this.correctConfiguration(incident);
        break;
    }

    // Update incident status
    await storage.updateIncident(incident.id, {
      status: "contained",
      actions: [
        ...incident.actions,
        {
          timestamp: new Date(),
          actor: "ERADICATION_MANAGER",
          action: "threat_eradicated",
          description: "Threat successfully removed from environment",
        },
      ],
    });
  }

  private async removeMalware(incident: SecurityIncident): Promise<void> {
    for (const system of incident.affectedSystems) {
      // Stop malicious processes
      await this.stopMaliciousProcesses(system);

      // Remove malicious files
      await this.removeMaliciousFiles(system);

      // Clear persistence mechanisms
      await this.clearPersistence(system);

      // Scan for remaining threats
      await this.runSecurityScan(system);
    }
  }

  private async removeUnauthorizedAccess(
    incident: SecurityIncident
  ): Promise<void> {
    // Revoke all compromised credentials
    await this.revokeCompromisedCredentials(incident);

    // Remove unauthorized accounts
    await this.removeUnauthorizedAccounts(incident);

    // Remove backdoors
    await this.removeBackdoors(incident);

    // Verify no residual access
    await this.verifyAccessRemoved(incident);
  }

  private async patchVulnerability(incident: SecurityIncident): Promise<void> {
    // Apply security patches
    for (const system of incident.affectedSystems) {
      await this.applySecurityPatch(system, incident.rootCause);
    }

    // Verify patch effectiveness
    await this.verifyPatch(incident);
  }
}
```

### Recovery

Restore systems to normal operations.

```typescript
// server/incident-recovery.ts
export class RecoveryManager {
  async recoverFromIncident(incident: SecurityIncident): Promise<void> {
    // 1. Verify eradication complete
    await this.verifyEradication(incident);

    // 2. Restore from clean backup if needed
    if (incident.impactAssessment?.dataCompromised) {
      await this.restoreFromBackup(incident);
    }

    // 3. Rebuild compromised systems
    for (const system of incident.affectedSystems) {
      await this.rebuildSystem(system);
    }

    // 4. Restore services
    await this.restoreServices(incident.affectedSystems);

    // 5. Verify system integrity
    await this.verifyIntegrity(incident.affectedSystems);

    // 6. Resume normal operations
    await this.resumeOperations(incident);

    // 7. Enhanced monitoring for 30 days
    await this.enablePostIncidentMonitoring(incident, 30);

    // Update incident status
    await storage.updateIncident(incident.id, {
      status: "resolved",
      actions: [
        ...incident.actions,
        {
          timestamp: new Date(),
          actor: "RECOVERY_MANAGER",
          action: "recovery_complete",
          description: "Systems restored to normal operations",
        },
      ],
    });
  }

  private async restoreFromBackup(incident: SecurityIncident): Promise<void> {
    // Find clean backup (before incident)
    const cleanBackup = await this.findCleanBackup(incident.detectedAt);

    if (!cleanBackup) {
      throw new Error("No clean backup available");
    }

    // Restore data
    const backupManager = new BackupManager();
    await backupManager.restoreFromBackup(cleanBackup.key);

    // Verify restoration
    await this.verifyBackupRestoration(cleanBackup);

    // Log restoration
    await storage.createAuditLog({
      organizationId: "SYSTEM",
      action: "backup.restored",
      actorId: "RECOVERY_MANAGER",
      metadata: {
        incidentId: incident.id,
        backupKey: cleanBackup.key,
        backupDate: cleanBackup.createdAt,
      },
    });
  }

  private async rebuildSystem(system: string): Promise<void> {
    // 1. Take offline
    await this.takeSystemOffline(system);

    // 2. Wipe and reinstall OS
    await this.reinstallOS(system);

    // 3. Apply all security patches
    await this.applyAllPatches(system);

    // 4. Restore application code from git
    await this.deployFromGit(system);

    // 5. Restore configuration (verified clean)
    await this.restoreConfiguration(system);

    // 6. Run security hardening
    await this.hardenSystem(system);

    // 7. Verify integrity
    await this.verifySystemIntegrity(system);

    // 8. Bring back online
    await this.bringSystemOnline(system);
  }

  private async verifyIntegrity(systems: string[]): Promise<boolean> {
    for (const system of systems) {
      // Check file integrity
      const fileIntegrity = await this.checkFileIntegrity(system);
      if (!fileIntegrity.valid) {
        throw new Error(`File integrity check failed for ${system}`);
      }

      // Check for malware
      const malwareScan = await this.scanForMalware(system);
      if (malwareScan.threatsFound > 0) {
        throw new Error(`Malware found on ${system}`);
      }

      // Check for unauthorized accounts
      const accountAudit = await this.auditAccounts(system);
      if (accountAudit.unauthorizedAccounts.length > 0) {
        throw new Error(`Unauthorized accounts found on ${system}`);
      }

      // Check for backdoors
      const backdoorScan = await this.scanForBackdoors(system);
      if (backdoorScan.backdoorsFound > 0) {
        throw new Error(`Backdoors found on ${system}`);
      }
    }

    return true;
  }
}
```

### Recovery Verification Checklist

- [ ] All malware removed
- [ ] All unauthorized access removed
- [ ] All vulnerabilities patched
- [ ] All compromised credentials rotated
- [ ] System integrity verified
- [ ] Backups restored (if needed)
- [ ] Services functioning normally
- [ ] Enhanced monitoring active
- [ ] Security posture improved

## Post-Incident Activities

### Post-Incident Review (PIR)

Conduct within 5 business days of incident resolution.

```typescript
// server/post-incident-review.ts
export interface PostIncidentReview {
  incidentId: string;
  reviewDate: Date;
  attendees: string[];
  
  // What happened
  incidentSummary: string;
  detectionMethod: DetectionSource;
  rootCause: string;
  
  // Timeline analysis
  timeToDetect: number;      // Minutes from incident start to detection
  timeToRespond: number;     // Minutes from detection to initial response
  timeToContain: number;     // Minutes from response to containment
  timeToRecover: number;     // Minutes from containment to recovery
  totalDuration: number;     // Total incident duration
  
  // Impact assessment
  systemsAffected: string[];
  usersAffected: number;
  organizationsAffected: number;
  dataCompromised: boolean;
  dataVolume?: string;
  serviceDowntime: number;   // Minutes
  estimatedCost: number;     // USD
  
  // Response effectiveness
  whatWentWell: string[];
  whatWentPoorly: string[];
  surprises: string[];
  
  // Improvements
  actionItems: ActionItem[];
  processImprovements: string[];
  toolingNeeds: string[];
  trainingNeeds: string[];
  
  // Follow-up
  nextReviewDate?: Date;
  documentationUpdated: boolean;
}

export interface ActionItem {
  id: string;
  description: string;
  owner: string;
  priority: "high" | "medium" | "low";
  dueDate: Date;
  status: "open" | "in_progress" | "completed";
}

// Generate PIR template
export async function conductPostIncidentReview(
  incidentId: string
): Promise<PostIncidentReview> {
  const incident = await storage.getIncident(incidentId);
  
  if (incident.status !== "resolved" && incident.status !== "closed") {
    throw new Error("Cannot conduct PIR on unresolved incident");
  }

  // Calculate metrics
  const timeline = incident.timeline;
  const detectionTime = timeline.find(e => e.event === "detected")?.timestamp;
  const responseTime = timeline.find(e => e.event === "response_started")?.timestamp;
  const containmentTime = timeline.find(e => e.event === "contained")?.timestamp;
  const recoveryTime = timeline.find(e => e.event === "recovered")?.timestamp;

  return {
    incidentId: incident.id,
    reviewDate: new Date(),
    attendees: [],
    incidentSummary: incident.description,
    detectionMethod: incident.detectedBy as DetectionSource,
    rootCause: incident.rootCause || "To be determined",
    timeToDetect: calculateDuration(incident.detectedAt, detectionTime),
    timeToRespond: calculateDuration(detectionTime, responseTime),
    timeToContain: calculateDuration(responseTime, containmentTime),
    timeToRecover: calculateDuration(containmentTime, recoveryTime),
    totalDuration: calculateDuration(incident.detectedAt, recoveryTime),
    systemsAffected: incident.affectedSystems,
    usersAffected: incident.impactAssessment?.usersAffected || 0,
    organizationsAffected: incident.affectedOrganizations.length,
    dataCompromised: incident.impactAssessment?.dataCompromised || false,
    serviceDowntime: 0, // To be filled
    estimatedCost: incident.impactAssessment?.estimatedCost || 0,
    whatWentWell: [],
    whatWentPoorly: [],
    surprises: [],
    actionItems: [],
    processImprovements: [],
    toolingNeeds: [],
    trainingNeeds: [],
    documentationUpdated: false,
  };
}
```

### Lessons Learned Documentation

```typescript
// server/lessons-learned.ts
export interface LessonLearned {
  incidentId: string;
  category: "detection" | "response" | "recovery" | "prevention";
  lesson: string;
  recommendation: string;
  implemented: boolean;
  implementedAt?: Date;
}

const LESSONS_LEARNED_EXAMPLES: LessonLearned[] = [
  {
    incidentId: "INC-2024-001",
    category: "detection",
    lesson: "Suspicious login attempts were not detected until manual review",
    recommendation: "Implement automated alerting for >5 failed logins in 5 minutes",
    implemented: true,
    implementedAt: new Date("2024-01-15"),
  },
  {
    incidentId: "INC-2024-002",
    category: "response",
    lesson: "On-call engineer couldn't access production systems during incident",
    recommendation: "Ensure all on-call engineers have emergency access credentials",
    implemented: true,
    implementedAt: new Date("2024-02-01"),
  },
  {
    incidentId: "INC-2024-003",
    category: "prevention",
    lesson: "Vulnerability was present for 6 months before exploitation",
    recommendation: "Implement weekly automated vulnerability scanning",
    implemented: false,
  },
];

// Track implementation of lessons learned
export async function trackLessonsLearned(): Promise<{
  total: number;
  implemented: number;
  pending: number;
  overdue: number;
}> {
  const lessons = await storage.getAllLessonsLearned();
  
  return {
    total: lessons.length,
    implemented: lessons.filter(l => l.implemented).length,
    pending: lessons.filter(l => !l.implemented).length,
    overdue: lessons.filter(l => 
      !l.implemented && 
      l.dueDate && 
      l.dueDate < new Date()
    ).length,
  };
}
```

## Communication Plan

### Internal Communication

```typescript
// server/incident-communication.ts
export enum CommunicationChannel {
  SLACK_SECURITY = "slack_security",
  EMAIL_IRT = "email_irt",
  SMS_ONCALL = "sms_oncall",
  INCIDENT_CHANNEL = "incident_channel",
}

export interface CommunicationPlan {
  severity: IncidentSeverity;
  channels: CommunicationChannel[];
  recipients: string[];
  updateFrequency: number; // Minutes
  escalationPath: string[];
}

const COMMUNICATION_PLANS: Record<IncidentSeverity, CommunicationPlan> = {
  [IncidentSeverity.CRITICAL]: {
    severity: IncidentSeverity.CRITICAL,
    channels: [
      CommunicationChannel.SLACK_SECURITY,
      CommunicationChannel.SMS_ONCALL,
      CommunicationChannel.INCIDENT_CHANNEL,
    ],
    recipients: [
      "cto@ubos.com",
      "vp-eng@ubos.com",
      "security@ubos.com",
      "legal@ubos.com",
    ],
    updateFrequency: 30, // Every 30 minutes
    escalationPath: ["VP Engineering", "CTO", "CEO"],
  },
  [IncidentSeverity.HIGH]: {
    severity: IncidentSeverity.HIGH,
    channels: [
      CommunicationChannel.SLACK_SECURITY,
      CommunicationChannel.EMAIL_IRT,
    ],
    recipients: [
      "vp-eng@ubos.com",
      "security@ubos.com",
    ],
    updateFrequency: 60, // Every hour
    escalationPath: ["VP Engineering", "CTO"],
  },
  [IncidentSeverity.MEDIUM]: {
    severity: IncidentSeverity.MEDIUM,
    channels: [CommunicationChannel.SLACK_SECURITY],
    recipients: ["security@ubos.com"],
    updateFrequency: 240, // Every 4 hours
    escalationPath: ["Security Lead", "VP Engineering"],
  },
  [IncidentSeverity.LOW]: {
    severity: IncidentSeverity.LOW,
    channels: [CommunicationChannel.SLACK_SECURITY],
    recipients: ["security@ubos.com"],
    updateFrequency: 1440, // Daily
    escalationPath: ["Security Lead"],
  },
};

// Send incident notification
export async function notifyIncident(incident: SecurityIncident): Promise<void> {
  const plan = COMMUNICATION_PLANS[incident.severity];

  for (const channel of plan.channels) {
    await sendNotification(channel, {
      title: `[${incident.severity.toUpperCase()}] ${incident.title}`,
      message: formatIncidentMessage(incident),
      recipients: plan.recipients,
      urgent: incident.severity === IncidentSeverity.CRITICAL,
    });
  }
}

function formatIncidentMessage(incident: SecurityIncident): string {
  return `
**Incident ID:** ${incident.id}
**Severity:** ${incident.severity}
**Category:** ${incident.category}
**Status:** ${incident.status}

**Description:**
${incident.description}

**Affected Systems:**
${incident.affectedSystems.join(", ")}

**Detected:** ${incident.detectedAt.toISOString()}
**Detected By:** ${incident.detectedBy}
**Assigned To:** ${incident.assignedTo || "Unassigned"}

**Next Steps:**
1. Investigate and assess impact
2. Contain threat
3. Regular updates every ${COMMUNICATION_PLANS[incident.severity].updateFrequency} minutes
  `.trim();
}
```

### External Communication

#### Customer Notification

```typescript
// server/customer-notification.ts
export interface CustomerNotification {
  incidentId: string;
  subject: string;
  body: string;
  recipients: "all" | "affected";
  channels: ("email" | "in_app" | "status_page")[];
  approvedBy: string;
  sentAt: Date;
}

// Template for data breach notification
export const DATA_BREACH_NOTIFICATION_TEMPLATE = `
Subject: Important Security Notice - Data Breach Notification

Dear [Customer Name],

We are writing to inform you of a security incident that may have affected your account.

**What Happened:**
[Brief description of the incident]

**What Information Was Involved:**
[List of data types potentially affected]

**What We're Doing:**
- Immediately contained the incident
- Launched a thorough investigation
- Implemented additional security measures
- Notified relevant authorities
- Providing this notification to affected users

**What You Should Do:**
1. Change your password immediately
2. Enable multi-factor authentication
3. Monitor your account for suspicious activity
4. Review our security recommendations at [link]

**Support:**
If you have questions, please contact our security team at security@ubos.com

We take this matter very seriously and sincerely apologize for any concern or inconvenience.

Sincerely,
[Name]
[Title]
UBOS Security Team
`;

// GDPR-compliant breach notification (72-hour requirement)
export async function sendGDPRBreachNotification(
  incident: SecurityIncident
): Promise<void> {
  // Must be sent within 72 hours of discovery
  const hoursSinceDetection = 
    (Date.now() - incident.detectedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceDetection > 72) {
    console.warn(`GDPR notification sent after 72-hour deadline (${hoursSinceDetection} hours)`);
  }

  // Notify data protection authority
  await notifyDataProtectionAuthority({
    incidentId: incident.id,
    notificationDate: new Date(),
    dataCategories: ["personal_data", "contact_information"],
    dataSubjectsAffected: incident.impactAssessment?.usersAffected || 0,
    consequencesOfBreach: "Potential unauthorized access to user data",
    measuresTaken: "Immediate containment, credential rotation, enhanced monitoring",
  });

  // Notify affected individuals
  if (incident.impactAssessment?.usersAffected > 0) {
    await sendCustomerNotification({
      incidentId: incident.id,
      subject: "Important: Data Breach Notification",
      body: DATA_BREACH_NOTIFICATION_TEMPLATE,
      recipients: "affected",
      channels: ["email", "in_app"],
      approvedBy: "legal@ubos.com",
      sentAt: new Date(),
    });
  }
}
```

## Escalation Procedures

### Escalation Matrix

| Time Since Detection | Action | Escalate To |
|---------------------|--------|-------------|
| **0-15 min** | Initial response | Security Lead |
| **15-30 min** | No containment | Incident Commander |
| **30-60 min** | No resolution plan | VP Engineering |
| **1-2 hours** | Ongoing critical impact | CTO |
| **2+ hours** | Data breach confirmed | CEO + Legal |

### Automated Escalation

```typescript
// server/escalation.ts
export class EscalationManager {
  async checkEscalation(incident: SecurityIncident): Promise<void> {
    const timeSinceDetection = Date.now() - incident.detectedAt.getTime();
    const minutesSinceDetection = timeSinceDetection / (1000 * 60);

    // Critical incidents escalate faster
    const escalationThreshold = 
      incident.severity === IncidentSeverity.CRITICAL ? 15 : 60;

    if (minutesSinceDetection > escalationThreshold && incident.status === "open") {
      await this.escalate(incident, "No containment achieved within threshold");
    }

    // Escalate if impact grows
    if (incident.affectedOrganizations.length > 10) {
      await this.escalate(incident, "Impact exceeds 10 organizations");
    }

    // Escalate if data breach confirmed
    if (incident.impactAssessment?.dataCompromised) {
      await this.escalate(incident, "Data breach confirmed");
    }
  }

  private async escalate(incident: SecurityIncident, reason: string): Promise<void> {
    const plan = COMMUNICATION_PLANS[incident.severity];
    
    // Notify escalation path
    for (const role of plan.escalationPath) {
      await this.notifyEscalation(role, incident, reason);
    }

    // Log escalation
    await storage.updateIncident(incident.id, {
      actions: [
        ...incident.actions,
        {
          timestamp: new Date(),
          actor: "ESCALATION_MANAGER",
          action: "escalated",
          description: reason,
        },
      ],
    });
  }
}
```

## Lessons Learned Process

### Quarterly Security Review

```typescript
// server/security-review.ts
export interface QuarterlySecurityReview {
  quarter: string; // "2024-Q1"
  reviewDate: Date;
  
  // Incident statistics
  totalIncidents: number;
  incidentsBySeverity: Record<IncidentSeverity, number>;
  incidentsByCategory: Record<IncidentCategory, number>;
  
  // Response metrics
  averageTimeToDetect: number;
  averageTimeToContain: number;
  averageTimeToRecover: number;
  
  // Trends
  trendsUp: string[];
  trendsDown: string[];
  
  // Improvements made
  improvementsMade: string[];
  outstandingActionItems: ActionItem[];
  
  // Next quarter goals
  securityGoals: string[];
}

export async function generateQuarterlyReview(
  quarter: string
): Promise<QuarterlySecurityReview> {
  const incidents = await storage.getIncidentsByQuarter(quarter);
  
  return {
    quarter,
    reviewDate: new Date(),
    totalIncidents: incidents.length,
    incidentsBySeverity: groupBySeverity(incidents),
    incidentsByCategory: groupByCategory(incidents),
    averageTimeToDetect: calculateAverageMetric(incidents, "timeToDetect"),
    averageTimeToContain: calculateAverageMetric(incidents, "timeToContain"),
    averageTimeToRecover: calculateAverageMetric(incidents, "timeToRecover"),
    trendsUp: identifyTrendsUp(incidents),
    trendsDown: identifyTrendsDown(incidents),
    improvementsMade: await getImplementedImprovements(quarter),
    outstandingActionItems: await getOutstandingActionItems(),
    securityGoals: generateSecurityGoals(incidents),
  };
}
```

## Incident Response Drills

### Tabletop Exercises

Conduct quarterly to practice incident response procedures.

```typescript
// tests/incident-response-drill.ts
export interface IncidentDrill {
  id: string;
  name: string;
  date: Date;
  scenario: string;
  objectives: string[];
  participants: string[];
  duration: number; // Minutes
  results: DrillResults;
}

export interface DrillResults {
  objectivesMet: boolean[];
  strengths: string[];
  weaknesses: string[];
  actionItems: ActionItem[];
}

const DRILL_SCENARIOS: IncidentDrill[] = [
  {
    id: "DRILL-001",
    name: "Ransomware Attack Simulation",
    date: new Date("2024-03-15"),
    scenario: `
      At 2:00 AM, automated monitoring detects encryption activity across
      multiple database servers. Investigation reveals ransomware has encrypted
      production databases and a ransom note is displayed demanding Bitcoin payment.
    `,
    objectives: [
      "Detect ransomware within 15 minutes",
      "Isolate affected systems within 30 minutes",
      "Notify incident response team within 15 minutes",
      "Recover from backup within 4 hours",
      "Communicate with stakeholders",
    ],
    participants: [
      "Security Lead",
      "DevOps Engineer",
      "VP Engineering",
      "Communications Lead",
    ],
    duration: 120,
    results: {
      objectivesMet: [true, true, false, true, true],
      strengths: [
        "Quick detection and isolation",
        "Effective backup recovery",
        "Clear communication",
      ],
      weaknesses: [
        "Delayed team notification (25 minutes)",
        "Unclear escalation procedures",
      ],
      actionItems: [
        {
          id: "DRILL-001-AI-01",
          description: "Implement automated SMS alerts for critical incidents",
          owner: "DevOps Engineer",
          priority: "high",
          dueDate: new Date("2024-04-01"),
          status: "open",
        },
      ],
    },
  },
  {
    id: "DRILL-002",
    name: "Data Breach - Customer PII Exposed",
    date: new Date("2024-06-20"),
    scenario: `
      A security researcher reports finding a publicly accessible S3 bucket
      containing customer PII (names, emails, phone numbers) for 50,000 users.
      The bucket was misconfigured 3 months ago.
    `,
    objectives: [
      "Secure the bucket within 15 minutes of notification",
      "Determine scope of exposure within 2 hours",
      "Notify GDPR authorities within 72 hours",
      "Notify affected customers within 72 hours",
      "Implement preventive controls",
    ],
    participants: [
      "Security Lead",
      "Legal Counsel",
      "Compliance Officer",
      "Communications Lead",
    ],
    duration: 180,
    results: {
      objectivesMet: [true, true, true, true, false],
      strengths: [
        "Quick bucket remediation",
        "Thorough impact assessment",
        "Timely regulatory notifications",
      ],
      weaknesses: [
        "Preventive controls not implemented during drill",
        "Customer communication template needs improvement",
      ],
      actionItems: [
        {
          id: "DRILL-002-AI-01",
          description: "Implement automated S3 bucket security scanning",
          owner: "Security Lead",
          priority: "high",
          dueDate: new Date("2024-07-15"),
          status: "open",
        },
      ],
    },
  },
];

// Conduct incident drill
export async function conductDrill(drillId: string): Promise<void> {
  const drill = DRILL_SCENARIOS.find(d => d.id === drillId);
  if (!drill) {
    throw new Error(`Drill ${drillId} not found`);
  }

  console.log(`\n=== INCIDENT RESPONSE DRILL: ${drill.name} ===\n`);
  console.log(`Scenario: ${drill.scenario}\n`);
  console.log(`Objectives:`);
  drill.objectives.forEach((obj, i) => {
    console.log(`${i + 1}. ${obj}`);
  });
  console.log(`\n--- BEGIN DRILL ---\n`);

  // Simulate incident response
  // ... (drill-specific logic)

  console.log(`\n--- END DRILL ---\n`);
  console.log(`Duration: ${drill.duration} minutes\n`);

  // Review results
  console.log(`Results:`);
  console.log(`Strengths: ${drill.results.strengths.join(", ")}`);
  console.log(`Weaknesses: ${drill.results.weaknesses.join(", ")}`);
  console.log(`Action Items: ${drill.results.actionItems.length}\n`);
}
```

### Annual Full-Scale Exercise

Conduct annual full-scale simulation with:
- All incident response team members
- External stakeholders (legal, PR, law enforcement)
- Simulated media inquiries
- After-hours response testing
- Multi-day incident simulation

## Incident Response Tools

### Required Tools and Access

```typescript
// Configuration checklist
export const INCIDENT_RESPONSE_TOOLS = {
  monitoring: [
    "AWS CloudWatch",
    "Datadog",
    "Sentry",
  ],
  forensics: [
    "PostgreSQL logs",
    "Application logs",
    "Network flow logs",
  ],
  communication: [
    "Slack #security-incidents channel",
    "PagerDuty",
    "Email distribution lists",
  ],
  documentation: [
    "Incident tracking system (JIRA/Linear)",
    "Post-incident review templates",
    "Runbook wiki",
  ],
  recovery: [
    "Backup system access",
    "Infrastructure as Code (Terraform)",
    "Deployment pipelines",
  ],
};

// Verify tool access during drills
export async function verifyToolAccess(userId: string): Promise<{
  tool: string;
  hasAccess: boolean;
}[]> {
  const results = [];

  for (const category of Object.keys(INCIDENT_RESPONSE_TOOLS)) {
    for (const tool of INCIDENT_RESPONSE_TOOLS[category]) {
      const hasAccess = await checkToolAccess(userId, tool);
      results.push({ tool, hasAccess });
    }
  }

  return results;
}
```

## Related Documents

- [SECURITY_MONITORING.md](./SECURITY_MONITORING.md) - Detection and alerting
- [ACCESS_CONTROL.md](./ACCESS_CONTROL.md) - Authentication and authorization
- [DATA_PROTECTION.md](./DATA_PROTECTION.md) - Encryption and data handling
- [GDPR_COMPLIANCE.md](./GDPR_COMPLIANCE.md) - GDPR breach notification

## Compliance References

- **NIST SP 800-61**: Computer Security Incident Handling Guide
- **GDPR**: Article 33 (Notification of a personal data breach to the supervisory authority)
- **GDPR**: Article 34 (Communication of a personal data breach to the data subject)
- **SOC 2**: CC7.3 (Security Incident Response)
- **HIPAA**: §164.308(a)(6) (Security Incident Procedures)

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-04 | Security Team | Initial release |
