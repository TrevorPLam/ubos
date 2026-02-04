---
title: "HIPAA Compliance Documentation"
version: "1.0.0"
last_updated: "2026-02-04"
framework: "HIPAA/HITECH"
status: "active"
owner: "Security & Compliance Team"
classification: "internal"
---

# HIPAA Compliance Documentation

## Overview

This document outlines UBOS's approach to HIPAA (Health Insurance Portability and Accountability Act) compliance. HIPAA requires protection of Protected Health Information (PHI) for healthcare-related applications.

## Applicability

### When HIPAA Applies

UBOS would be subject to HIPAA if it:
- Stores or processes Protected Health Information (PHI)
- Acts as a Business Associate for covered entities
- Provides services to healthcare providers or health plans
- Handles any individually identifiable health information

### Current Status

- UBOS is designed to be HIPAA-compliant ready
- PHI handling must be explicitly enabled
- Business Associate Agreements (BAA) required
- Additional controls activated for PHI workloads

## Protected Health Information (PHI)

### Definition of PHI

PHI includes any individually identifiable health information:

1. **Health Status**: Past, present, or future physical/mental health
2. **Healthcare Provision**: Healthcare services provided to individual
3. **Payment**: Payment for healthcare services
4. **Identifiers**: Any of the following linked to health information:
   - Name
   - Address (geographic location)
   - Dates (birth, admission, discharge, death, etc.)
   - Telephone/fax numbers
   - Email addresses
   - Social Security numbers
   - Medical record numbers
   - Health plan beneficiary numbers
   - Account numbers
   - Certificate/license numbers
   - Device identifiers
   - URLs
   - IP addresses
   - Biometric identifiers
   - Full-face photographs
   - Any other unique identifying number/code

### De-Identification

```typescript
/**
 * PHI de-identification utilities
 * 
 * Two methods of de-identification:
 * 1. Safe Harbor: Remove 18 specific identifiers
 * 2. Expert Determination: Statistical analysis by expert
 */

interface PatientData {
  // Identifiable
  fullName: string;
  dateOfBirth: Date;
  ssn: string;
  email: string;
  address: string;
  
  // Health information
  diagnosis: string;
  medications: string[];
  treatmentPlan: string;
}

interface DeidentifiedData {
  // Anonymized identifiers
  patientId: string; // Pseudonym
  ageRange: string; // "35-40" instead of exact DOB
  zipPrefix: string; // "12345" → "123**"
  
  // Health information retained
  diagnosis: string;
  medications: string[];
  treatmentPlan: string;
}

function deidentifyPatientData(data: PatientData): DeidentifiedData {
  return {
    patientId: generatePseudonym(data.ssn), // One-way hash
    ageRange: calculateAgeRange(data.dateOfBirth),
    zipPrefix: data.address.match(/\d{5}/)?[0].slice(0, 3) + '**',
    diagnosis: data.diagnosis,
    medications: data.medications,
    treatmentPlan: data.treatmentPlan,
  };
}
```

## HIPAA Rules

### 1. Privacy Rule

Establishes national standards for protection of PHI.

**1.1 - Minimum Necessary Standard**
```typescript
/**
 * Only access minimum PHI necessary for the task
 * 
 * Example: Billing department doesn't need clinical notes
 */

// Role-based PHI access
enum PHIAccessLevel {
  CLINICAL_FULL = 'clinical_full',        // Physicians: full access
  CLINICAL_LIMITED = 'clinical_limited',  // Nurses: limited access
  ADMINISTRATIVE = 'administrative',       // Billing: demographics only
  TECHNICAL = 'technical',                 // IT: no PHI access
}

interface PHIAccessControl {
  role: PHIAccessLevel;
  allowedFields: string[];
  purpose: string;
}

// Enforce minimum necessary access
function filterPHI(data: PatientData, access: PHIAccessControl): Partial<PatientData> {
  const filtered: any = {};
  
  for (const field of access.allowedFields) {
    if (field in data) {
      filtered[field] = data[field];
    }
  }
  
  // Log access for audit
  auditLog({
    action: 'PHI_ACCESS',
    userId: access.userId,
    fields: access.allowedFields,
    purpose: access.purpose,
    timestamp: new Date(),
  });
  
  return filtered;
}
```

**1.2 - Notice of Privacy Practices**
- Inform patients how PHI is used
- Describe patient rights
- Explain complaint process
- Provide contact information

**1.3 - Patient Rights**

```typescript
/**
 * HIPAA patient rights implementation
 */

interface PatientRights {
  // Right to access PHI
  requestAccess(): Promise<PatientData>;
  
  // Right to amend PHI
  requestAmendment(amendment: string): Promise<void>;
  
  // Right to accounting of disclosures
  getDisclosureHistory(): Promise<Disclosure[]>;
  
  // Right to request restrictions
  requestRestriction(restriction: string): Promise<void>;
  
  // Right to confidential communications
  requestConfidentialComms(preference: string): Promise<void>;
  
  // Right to paper copy of privacy notice
  getPrivacyNotice(): Promise<Document>;
}

// Access request handling (must respond within 30 days)
async function handleAccessRequest(patientId: string): Promise<PatientData> {
  // Verify identity
  await verifyPatientIdentity(patientId);
  
  // Compile all PHI
  const phi = await getAllPHI(patientId);
  
  // Log the access request
  await auditLog({
    action: 'PATIENT_ACCESS_REQUEST',
    patientId,
    timestamp: new Date(),
    status: 'fulfilled',
  });
  
  return phi;
}
```

**1.4 - Uses and Disclosures**

PHI may be used/disclosed without authorization for:
- Treatment
- Payment
- Healthcare operations
- Required by law
- Public health activities
- Victims of abuse, neglect, or domestic violence
- Health oversight activities
- Judicial and administrative proceedings
- Law enforcement purposes
- Coroners, medical examiners, funeral directors
- Organ donation
- Research (with IRB approval or de-identified)
- Serious threat to health or safety
- Essential government functions
- Workers' compensation

All other uses require written patient authorization.

### 2. Security Rule

Establishes standards for protecting electronic PHI (ePHI).

**2.1 - Administrative Safeguards**

```typescript
/**
 * Security management process
 */

// Risk analysis
interface SecurityRiskAssessment {
  threatAnalysis: Threat[];
  vulnerabilityAssessment: Vulnerability[];
  currentControls: Control[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigationPlan: string;
}

// Conduct annual risk assessment
async function conductHIPAARiskAssessment(): Promise<SecurityRiskAssessment> {
  return {
    threatAnalysis: identifyThreats(),
    vulnerabilityAssessment: scanVulnerabilities(),
    currentControls: inventoryControls(),
    riskLevel: calculateRiskLevel(),
    mitigationPlan: developMitigationPlan(),
  };
}

// Workforce security
interface WorkforceSecurity {
  // Authorization and supervision
  authorizeAccess(userId: string, level: PHIAccessLevel): void;
  
  // Workforce clearance
  performBackgroundCheck(userId: string): Promise<boolean>;
  
  // Termination procedures
  terminateAccess(userId: string): Promise<void>;
}

// Implement termination procedures
async function terminateEmployeeAccess(userId: string) {
  // Immediate access revocation
  await revokeAllAccess(userId);
  
  // Retrieve access credentials
  await disableCredentials(userId);
  
  // Audit all their PHI access
  const accessHistory = await getAccessHistory(userId);
  await reviewAccessHistory(accessHistory);
  
  // Log termination
  await auditLog({
    action: 'EMPLOYEE_TERMINATION',
    userId,
    timestamp: new Date(),
  });
}
```

**Information Access Management**
```typescript
// Access authorization
const hipaaRoles = pgTable("hipaa_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  organizationId: text("organization_id").notNull(),
  
  role: varchar("role", { length: 50 }).notNull(),
  accessLevel: varchar("access_level", { length: 50 }).notNull(),
  
  // Justification for access
  businessJustification: text("business_justification").notNull(),
  
  // Approval workflow
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  
  // Access period
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Security Awareness Training**
```typescript
/**
 * HIPAA training requirements
 */

interface HIPAATraining {
  // Initial training
  initialTraining: {
    completedDate: Date;
    trainingProvider: string;
    certificateId: string;
  };
  
  // Annual refresher
  annualTraining: {
    dueDate: Date;
    completedDate?: Date;
    status: 'current' | 'overdue';
  };
  
  // Role-specific training
  roleTraining: {
    role: string;
    completed: boolean;
    topics: string[];
  };
}

// Training topics
const requiredTrainingTopics = [
  'HIPAA Privacy Rule',
  'HIPAA Security Rule',
  'Breach Notification Rule',
  'Patient rights',
  'Minimum necessary standard',
  'De-identification methods',
  'Incident reporting',
  'Security best practices',
  'Social engineering awareness',
  'Physical security',
];
```

**2.2 - Physical Safeguards**

```typescript
/**
 * Physical access controls
 */

// Facility access controls
interface FacilityAccess {
  // Contingency operations
  disasterRecoveryPlan: string;
  backupSite: string;
  
  // Facility security plan
  accessControlMeasures: string[];
  surveillanceSystems: string[];
  
  // Access control and validation
  badgeSystem: string;
  visitorLog: string;
  
  // Maintenance records
  maintenanceLog: MaintenanceRecord[];
}

// Workstation security
const workstationSecurityPolicy = {
  // Physical location restrictions
  lockedOffice: true,
  screenPrivacyFilters: true,
  
  // Automatic logout
  inactivityTimeout: 10 * 60 * 1000, // 10 minutes
  
  // Encryption requirements
  fullDiskEncryption: true,
  
  // Clean desk policy
  noPhiOnDesks: true,
  securePaperStorage: true,
};

// Device and media controls
interface DeviceControls {
  // Disposal
  secureErasureRequired: boolean;
  physicalDestructionForSensitiveMedia: boolean;
  
  // Media re-use
  sanitizationProcedure: string;
  
  // Accountability
  inventoryTracking: boolean;
  
  // Data backup and storage
  encryptedBackups: boolean;
  offSiteBackupStorage: boolean;
}
```

**2.3 - Technical Safeguards**

```typescript
/**
 * Access controls
 */

// Unique user identification
export const hipaaUsers = pgTable("hipaa_users", {
  id: text("id").primaryKey(), // Unique identifier required
  email: varchar("email", { length: 255 }).unique().notNull(),
  
  // Emergency access procedure
  emergencyAccessGranted: boolean("emergency_access_granted").default(false),
  emergencyAccessReason: text("emergency_access_reason"),
  emergencyAccessExpiry: timestamp("emergency_access_expiry"),
  
  // Automatic logoff
  lastActivityAt: timestamp("last_activity_at"),
  
  // Encryption and decryption
  publicKey: text("public_key"),
  encryptionMethod: varchar("encryption_method", { length: 50 }),
});

// Emergency access procedure
async function grantEmergencyAccess(
  userId: string, 
  reason: string,
  duration: number = 60 * 60 * 1000 // 1 hour
): Promise<void> {
  await db.update(hipaaUsers)
    .set({
      emergencyAccessGranted: true,
      emergencyAccessReason: reason,
      emergencyAccessExpiry: new Date(Date.now() + duration),
    })
    .where(eq(hipaaUsers.id, userId));
  
  // Critical audit log
  await auditLog({
    action: 'EMERGENCY_ACCESS_GRANTED',
    userId,
    reason,
    timestamp: new Date(),
    severity: 'critical',
  });
  
  // Alert security team
  await alertSecurityTeam({
    type: 'emergency_access',
    userId,
    reason,
  });
}

// Automatic logoff implementation
function setupAutomaticLogoff() {
  setInterval(async () => {
    const inactivityThreshold = 15 * 60 * 1000; // 15 minutes
    const now = Date.now();
    
    const inactiveSessions = await db.query.hipaaUsers.findMany({
      where: and(
        isNotNull(hipaaUsers.lastActivityAt),
        sql`${hipaaUsers.lastActivityAt} < ${new Date(now - inactivityThreshold)}`
      ),
    });
    
    for (const user of inactiveSessions) {
      await terminateSession(user.id);
      await auditLog({
        action: 'AUTOMATIC_LOGOFF',
        userId: user.id,
        reason: 'inactivity',
        timestamp: new Date(),
      });
    }
  }, 60 * 1000); // Check every minute
}
```

**Audit Controls**
```typescript
/**
 * HIPAA audit logging requirements
 */

interface HIPAAAuditLog {
  // Who
  userId: string;
  userRole: string;
  
  // What
  action: string;
  resourceType: 'patient' | 'phi' | 'system';
  resourceId?: string;
  
  // When
  timestamp: Date;
  
  // Where
  ipAddress: string;
  location?: string;
  
  // Why (for access)
  purpose?: string;
  
  // Result
  success: boolean;
  errorCode?: string;
  
  // PHI accessed (references, not content)
  phiFields?: string[];
}

// Comprehensive audit logging
function logPHIAccess(params: {
  userId: string;
  patientId: string;
  fields: string[];
  purpose: string;
}) {
  const auditEntry: HIPAAAuditLog = {
    userId: params.userId,
    userRole: getUserRole(params.userId),
    action: 'PHI_ACCESS',
    resourceType: 'phi',
    resourceId: params.patientId,
    timestamp: new Date(),
    ipAddress: getRequestIP(),
    purpose: params.purpose,
    success: true,
    phiFields: params.fields,
  };
  
  // Store audit log (must be tamper-evident)
  storeAuditLog(auditEntry);
  
  // Real-time monitoring
  if (isAnomalousAccess(auditEntry)) {
    alertSecurityTeam(auditEntry);
  }
}

// Audit log retention: Minimum 6 years
const HIPAA_LOG_RETENTION_DAYS = 6 * 365;
```

**Integrity Controls**
```typescript
/**
 * Ensure ePHI is not improperly altered or destroyed
 */

// Implement checksums/hashes
interface PHIIntegrity {
  dataHash: string; // SHA-256 hash of PHI
  lastModified: Date;
  modifiedBy: string;
  version: number;
}

async function updatePHI(patientId: string, updates: Partial<PatientData>) {
  // Get current version
  const current = await getPHI(patientId);
  
  // Calculate hash of current data
  const currentHash = calculateHash(current);
  
  // Verify integrity
  if (current.dataHash !== currentHash) {
    throw new Error('Data integrity violation detected');
  }
  
  // Apply updates
  const updated = { ...current, ...updates };
  
  // Calculate new hash
  updated.dataHash = calculateHash(updated);
  updated.version = current.version + 1;
  updated.lastModified = new Date();
  
  // Store with audit trail
  await savePHI(updated);
  await auditLog({
    action: 'PHI_UPDATE',
    patientId,
    oldVersion: current.version,
    newVersion: updated.version,
    fields: Object.keys(updates),
  });
}
```

**Transmission Security**
```typescript
/**
 * Technical security measures for ePHI transmission
 */

// Encryption in transit
const tlsConfig = {
  minVersion: 'TLSv1.2' as const,
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
  ].join(':'),
};

// Email encryption for PHI
async function sendSecurePHI(
  to: string,
  subject: string,
  phi: PatientData
) {
  // Never send PHI via unencrypted email
  // Use secure portal instead
  
  const portalLink = await createSecurePortalLink({
    patientId: phi.id,
    expiresIn: 24 * 60 * 60 * 1000, // 24 hours
    singleUse: true,
  });
  
  // Send notification email (no PHI in email)
  await sendEmail({
    to,
    subject: 'Secure Health Information Available',
    body: `
      You have new health information available.
      Access it securely at: ${portalLink}
      
      This link expires in 24 hours.
    `,
  });
  
  await auditLog({
    action: 'SECURE_PHI_TRANSMISSION',
    patientId: phi.id,
    recipient: hashEmail(to),
    method: 'secure_portal',
  });
}
```

### 3. Breach Notification Rule

**3.1 - Breach Definition**

A breach is unauthorized acquisition, access, use, or disclosure of PHI that compromises security or privacy.

**Exceptions (not breaches):**
- Unintentional access by workforce member
- Inadvertent disclosure among authorized persons
- Good faith belief recipient couldn't retain information

**3.2 - Risk Assessment**
```typescript
/**
 * Breach risk assessment (required within 60 days)
 */

interface BreachRiskAssessment {
  // Nature and extent of PHI involved
  phiTypes: string[];
  numberOfPatients: number;
  
  // Person who accessed PHI
  unauthorizedPerson: {
    identity: string;
    relationship: string;
  };
  
  // Was PHI actually acquired/viewed?
  actualAcquisition: boolean;
  
  // Extent of risk mitigation
  mitigationActions: string[];
}

async function assessBreachRisk(incident: SecurityIncident): Promise<boolean> {
  const assessment: BreachRiskAssessment = {
    phiTypes: identifyPHITypes(incident),
    numberOfPatients: countAffectedPatients(incident),
    unauthorizedPerson: identifyUnauthorizedPerson(incident),
    actualAcquisition: wasDataActuallyAccessed(incident),
    mitigationActions: getMitigationActions(incident),
  };
  
  // If low probability of compromise, may not be reportable breach
  return determineIfReportable(assessment);
}
```

**3.3 - Notification Requirements**

```typescript
/**
 * Breach notification timeline
 */

interface BreachNotification {
  // Individual notification (within 60 days)
  notifyPatients: {
    deadline: Date;
    method: 'written' | 'email' | 'phone' | 'substitute';
    content: BreachNotificationContent;
  };
  
  // Media notification (if >500 in jurisdiction)
  notifyMedia?: {
    deadline: Date; // Within 60 days
    outlets: string[];
  };
  
  // HHS notification
  notifyHHS: {
    deadline: Date; // Immediate if >500, annual if <500
    method: 'immediate' | 'annual_report';
  };
  
  // Business Associate notification (if BA caused breach)
  notifyBusinessAssociates?: {
    deadline: Date; // Within 60 days
    entities: string[];
  };
}

// Notification content requirements
interface BreachNotificationContent {
  // Required elements
  briefDescription: string;
  dateOfBreach: Date;
  dateOfDiscovery: Date;
  typesOfPHI: string[];
  stepsIndividualsShouldTake: string[];
  stepsEntityIsTaking: string[];
  contactInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
}

async function handleBreach(incident: SecurityIncident) {
  // Immediate containment
  await containBreach(incident);
  
  // Risk assessment
  const isReportableBreach = await assessBreachRisk(incident);
  
  if (isReportableBreach) {
    // Determine affected individuals
    const affectedPatients = await identifyAffectedPatients(incident);
    
    // Prepare notifications
    const notification = prepareBreachNotification(incident, affectedPatients);
    
    // Send notifications within 60 days
    if (affectedPatients.length > 500) {
      // Major breach
      await notifyMedia(notification);
      await notifyHHSImmediately(notification);
    }
    
    await notifyPatients(affectedPatients, notification);
    
    // Document everything
    await documentBreachResponse(incident, notification);
  }
}
```

### 4. Omnibus Rule (HITECH)

**4.1 - Business Associate Liability**
- Business Associates directly liable under HIPAA
- Must comply with Security Rule
- Subject to civil and criminal penalties
- Must report breaches to covered entities

**4.2 - Business Associate Agreements (BAA)**
```typescript
/**
 * BAA requirements for vendors
 */

interface BusinessAssociateAgreement {
  // Parties
  coveredEntity: string;
  businessAssociate: string;
  
  // Permitted uses and disclosures
  permittedUses: string[];
  
  // Obligations
  obligations: {
    // Implement safeguards
    implementSafeguards: boolean;
    
    // Report breaches
    reportBreachesWithin: number; // days
    
    // Ensure subcontractor compliance
    subcontractorCompliance: boolean;
    
    // Return or destroy PHI at termination
    dataReturnOrDestruction: 'return' | 'destroy';
    
    // Allow audits
    allowAudits: boolean;
  };
  
  // Term and termination
  term: {
    startDate: Date;
    endDate?: Date;
    terminationClauses: string[];
  };
}

// Vendor compliance tracking
const businessAssociates = pgTable("business_associates", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  
  // BAA status
  baaSignedDate: timestamp("baa_signed_date"),
  baaExpiryDate: timestamp("baa_expiry_date"),
  baaDocumentUrl: text("baa_document_url"),
  
  // Compliance status
  lastAuditDate: timestamp("last_audit_date"),
  nextAuditDate: timestamp("next_audit_date"),
  complianceStatus: varchar("compliance_status", { length: 20 }),
  
  // Services provided
  servicesProvided: text("services_provided"),
  phiAccess: boolean("phi_access").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## Implementation Checklist

### Administrative
- [ ] Designate HIPAA Security Officer
- [ ] Designate HIPAA Privacy Officer
- [ ] Develop security policies and procedures
- [ ] Implement workforce training program
- [ ] Establish Business Associate Agreements
- [ ] Conduct annual risk assessments
- [ ] Develop incident response plan
- [ ] Implement sanction policy

### Physical
- [ ] Facility access controls
- [ ] Workstation security measures
- [ ] Device and media controls
- [ ] Secure disposal procedures

### Technical
- [ ] Unique user identification
- [ ] Emergency access procedures
- [ ] Automatic logoff
- [ ] Encryption at rest and in transit
- [ ] Audit logging system
- [ ] Integrity controls
- [ ] Authentication mechanisms
- [ ] Transmission security

### Privacy
- [ ] Notice of Privacy Practices
- [ ] Patient rights procedures
- [ ] Minimum necessary policies
- [ ] Accounting of disclosures system
- [ ] Authorization forms and tracking
- [ ] Complaint process

## Testing and Validation

```typescript
describe('HIPAA Compliance', () => {
  it('should enforce automatic logoff after inactivity', async () => {
    const session = await createSession(userId);
    
    // Simulate inactivity
    await wait(16 * 60 * 1000); // 16 minutes
    
    // Session should be terminated
    const sessionStatus = await checkSession(session.id);
    expect(sessionStatus).toBe('terminated');
  });
  
  it('should log all PHI access', async () => {
    await accessPHI(userId, patientId);
    
    const logs = await getAuditLogs({
      userId,
      action: 'PHI_ACCESS',
      resourceId: patientId,
    });
    
    expect(logs).toHaveLength(1);
    expect(logs[0].timestamp).toBeDefined();
  });
  
  it('should enforce minimum necessary access', async () => {
    const billingUser = createUser({ role: 'billing' });
    const phi = await accessPHI(billingUser.id, patientId);
    
    // Billing should only see demographic and payment info
    expect(phi).not.toHaveProperty('clinicalNotes');
    expect(phi).not.toHaveProperty('labResults');
  });
  
  it('should encrypt PHI in transit', async () => {
    const response = await fetch('/api/patients/123');
    const protocol = new URL(response.url).protocol;
    
    expect(protocol).toBe('https:');
  });
});
```

## References

- [HHS HIPAA Guidelines](https://www.hhs.gov/hipaa/)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/)
- [HIPAA Privacy Rule](https://www.hhs.gov/hipaa/for-professionals/privacy/)
- [Breach Notification Rule](https://www.hhs.gov/hipaa/for-professionals/breach-notification/)

## Document Control

**Review Schedule:**
- Annual comprehensive review
- After any security incident
- When handling PHI for first time
- Following regulatory changes

**Next Review Date**: 2027-02-04  
**Document Owner**: Security & Compliance Team

---

**IMPORTANT**: This document provides guidance for HIPAA compliance. Actual HIPAA compliance requires comprehensive implementation, validation, and may require legal review. Consult with HIPAA compliance experts and legal counsel.
