---
title: "GDPR Compliance Documentation"
version: "1.0.0"
last_updated: "2026-02-04"
framework: "GDPR (EU 2016/679)"
status: "active"
owner: "Security & Compliance Team"
classification: "internal"
---

# GDPR Compliance Documentation

## Overview

This document outlines UBOS's compliance with the General Data Protection Regulation (GDPR), the EU's comprehensive data protection law. GDPR applies to any organization processing personal data of EU residents.

## Applicability

### When GDPR Applies

GDPR applies when UBOS:
- Processes personal data of EU residents
- Offers goods or services to EU residents
- Monitors behavior of EU residents
- Has an establishment in the EU

### Scope of Personal Data

**Personal Data**: Any information relating to an identified or identifiable natural person:
- Name, email, phone number
- IP address, cookie identifiers
- Location data
- Online identifiers
- Financial information
- Health information
- Biometric data
- Racial or ethnic origin
- Political opinions
- Religious beliefs
- Trade union membership
- Genetic data
- Data concerning sex life or sexual orientation

## GDPR Principles

### Article 5: Principles Relating to Processing

```typescript
/**
 * GDPR Principles Implementation
 */

enum GDPRPrinciple {
  LAWFULNESS = 'lawfulness',           // Article 5(1)(a)
  FAIRNESS = 'fairness',               // Article 5(1)(a)
  TRANSPARENCY = 'transparency',        // Article 5(1)(a)
  PURPOSE_LIMITATION = 'purpose_limitation',     // Article 5(1)(b)
  DATA_MINIMIZATION = 'data_minimization',      // Article 5(1)(c)
  ACCURACY = 'accuracy',               // Article 5(1)(d)
  STORAGE_LIMITATION = 'storage_limitation',    // Article 5(1)(e)
  INTEGRITY_CONFIDENTIALITY = 'integrity_confidentiality', // Article 5(1)(f)
  ACCOUNTABILITY = 'accountability',    // Article 5(2)
}

// Data minimization implementation
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  
  // Essential data only
  email: varchar("email", { length: 255 }).unique().notNull(),
  
  // Optional data with explicit consent
  fullName: varchar("full_name", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  
  // Consent tracking
  consentGiven: boolean("consent_given").default(false),
  consentDate: timestamp("consent_date"),
  consentVersion: integer("consent_version"),
  
  // Data retention
  dataRetentionPeriod: integer("data_retention_period"), // days
  scheduledDeletionDate: timestamp("scheduled_deletion_date"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

## Legal Bases for Processing (Article 6)

```typescript
/**
 * Legal basis for processing personal data
 */

enum LegalBasis {
  CONSENT = 'consent',                    // Article 6(1)(a)
  CONTRACT = 'contract',                  // Article 6(1)(b)
  LEGAL_OBLIGATION = 'legal_obligation',  // Article 6(1)(c)
  VITAL_INTERESTS = 'vital_interests',    // Article 6(1)(d)
  PUBLIC_TASK = 'public_task',            // Article 6(1)(e)
  LEGITIMATE_INTERESTS = 'legitimate_interests', // Article 6(1)(f)
}

interface DataProcessingRecord {
  dataType: string;
  purpose: string;
  legalBasis: LegalBasis;
  dataSubjects: string;
  recipients: string[];
  retentionPeriod: string;
  securityMeasures: string[];
}

// Example: User registration
const userRegistrationProcessing: DataProcessingRecord = {
  dataType: 'Email address, name',
  purpose: 'Account creation and service provision',
  legalBasis: LegalBasis.CONTRACT,
  dataSubjects: 'Platform users',
  recipients: ['Internal staff', 'Email service provider'],
  retentionPeriod: 'Duration of account + 30 days',
  securityMeasures: ['Encryption at rest', 'TLS in transit', 'Access controls'],
};
```

## Data Subject Rights (Chapter III)

### Article 15: Right of Access

```typescript
/**
 * Data subject access request (DSAR) implementation
 * Must respond within 1 month (extendable by 2 months if complex)
 */

interface DSARResponse {
  // What data we process
  personalData: Record<string, any>;
  
  // Why we process it
  purposes: string[];
  
  // Legal basis
  legalBasis: LegalBasis[];
  
  // Who receives it
  recipients: string[];
  
  // How long we keep it
  retentionPeriod: string;
  
  // Rights information
  rights: {
    rectification: boolean;
    erasure: boolean;
    restriction: boolean;
    dataPortability: boolean;
    objection: boolean;
  };
  
  // Source of data
  dataSource: string;
  
  // Automated decision making
  automatedDecisionMaking: {
    exists: boolean;
    logic?: string;
    significance?: string;
  };
}

async function handleDataAccessRequest(userId: string): Promise<DSARResponse> {
  // Compile all personal data
  const userData = await getAllUserData(userId);
  const activityData = await getUserActivity(userId);
  const communicationData = await getUserCommunications(userId);
  
  return {
    personalData: {
      profile: userData,
      activity: activityData,
      communications: communicationData,
    },
    purposes: [
      'Account management',
      'Service provision',
      'Communication',
      'Legal compliance',
    ],
    legalBasis: [LegalBasis.CONTRACT, LegalBasis.CONSENT],
    recipients: [
      'Internal staff',
      'Cloud hosting provider (AWS/Azure)',
      'Email service provider',
    ],
    retentionPeriod: 'Duration of account plus 30 days',
    rights: {
      rectification: true,
      erasure: true,
      restriction: true,
      dataPortability: true,
      objection: true,
    },
    dataSource: 'Directly from data subject',
    automatedDecisionMaking: {
      exists: false,
    },
  };
}
```

### Article 16: Right to Rectification

```typescript
/**
 * Allow users to correct inaccurate personal data
 */

async function handleRectificationRequest(
  userId: string,
  corrections: Partial<UserData>
): Promise<void> {
  // Verify user identity
  await verifyUserIdentity(userId);
  
  // Validate corrections
  const validated = await validateUserData(corrections);
  
  // Apply corrections
  await db.update(users)
    .set({
      ...validated,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  
  // Log the rectification
  await auditLog({
    action: 'DATA_RECTIFICATION',
    userId,
    fields: Object.keys(corrections),
    timestamp: new Date(),
  });
  
  // Notify affected third parties if necessary
  await notifyThirdPartiesOfRectification(userId, corrections);
}
```

### Article 17: Right to Erasure ("Right to be Forgotten")

```typescript
/**
 * Delete personal data when:
 * - No longer necessary for purpose
 * - Consent withdrawn
 * - Objection to processing
 * - Unlawfully processed
 * - Legal obligation to delete
 * - Collected from children
 */

interface ErasureRequest {
  userId: string;
  reason: 'no_longer_necessary' | 'consent_withdrawn' | 'objection' | 
          'unlawful' | 'legal_obligation' | 'child_data';
  exceptions?: string[]; // Reasons we might need to keep data
}

async function handleErasureRequest(request: ErasureRequest): Promise<void> {
  // Check for legal obligations to retain data
  const legalHolds = await checkLegalRetentionRequirements(request.userId);
  
  if (legalHolds.length > 0) {
    throw new Error(`Cannot delete due to legal retention: ${legalHolds.join(', ')}`);
  }
  
  // Pseudonymize instead of delete if needed for legal/statistical purposes
  const needsPseudonymization = await checkPseudonymizationRequirement(request.userId);
  
  if (needsPseudonymization) {
    await pseudonymizeUserData(request.userId);
  } else {
    // Complete erasure
    await deleteAllUserData(request.userId);
  }
  
  // Notify third parties with whom data was shared
  await notifyThirdPartiesOfErasure(request.userId);
  
  // Log the erasure (with minimal data)
  await auditLog({
    action: 'DATA_ERASURE',
    userId: hashUserId(request.userId),
    reason: request.reason,
    timestamp: new Date(),
  });
}

async function deleteAllUserData(userId: string): Promise<void> {
  // Delete in transaction
  await db.transaction(async (tx) => {
    // Delete user profile
    await tx.delete(users).where(eq(users.id, userId));
    
    // Delete associated data
    await tx.delete(userActivity).where(eq(userActivity.userId, userId));
    await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
    
    // Anonymize data that must be retained
    await tx.update(auditLogs)
      .set({ userId: 'DELETED_USER' })
      .where(eq(auditLogs.userId, userId));
  });
}
```

### Article 18: Right to Restriction of Processing

```typescript
/**
 * Users can restrict processing while:
 * - Accuracy is verified
 * - Processing is unlawful but user doesn't want deletion
 * - We no longer need data but user needs it for legal claims
 * - Objection is pending
 */

export const processingRestrictions = pgTable("processing_restrictions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  
  reason: varchar("reason", { length: 100 }).notNull(),
  restrictedOperations: jsonb("restricted_operations").$type<string[]>(),
  
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  
  status: varchar("status", { length: 20 }).default('active').notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

async function restrictProcessing(
  userId: string,
  reason: string,
  operations: string[]
): Promise<void> {
  // Add restriction
  await db.insert(processingRestrictions).values({
    id: generateId(),
    userId,
    reason,
    restrictedOperations: operations,
  });
  
  // Flag user account
  await db.update(users)
    .set({ processingRestricted: true })
    .where(eq(users.id, userId));
  
  // Notify systems
  await notifySystemsOfRestriction(userId, operations);
}
```

### Article 20: Right to Data Portability

```typescript
/**
 * Provide data in structured, commonly used, machine-readable format
 */

interface PortableData {
  version: string;
  exportDate: string;
  user: {
    id: string;
    email: string;
    name: string;
    // ... other data
  };
  activity: Array<any>;
  preferences: Record<string, any>;
  // ... other data categories
}

async function exportUserData(userId: string): Promise<PortableData> {
  const user = await getUser(userId);
  const activity = await getUserActivity(userId);
  const preferences = await getUserPreferences(userId);
  
  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.fullName,
      createdAt: user.createdAt.toISOString(),
    },
    activity: activity.map(a => ({
      type: a.type,
      timestamp: a.timestamp.toISOString(),
      data: a.data,
    })),
    preferences: preferences,
  };
}

// API endpoint for data export
app.get('/api/user/export', requireAuth, async (req, res) => {
  const userId = req.user!.claims.sub;
  
  const data = await exportUserData(userId);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.json"`);
  res.json(data);
  
  await auditLog({
    action: 'DATA_EXPORT',
    userId,
    timestamp: new Date(),
  });
});
```

### Article 21: Right to Object

```typescript
/**
 * Users can object to processing based on legitimate interests
 * Must stop processing unless compelling legitimate grounds
 */

async function handleObjection(
  userId: string,
  processingActivity: string,
  reason: string
): Promise<void> {
  // Assess whether we have compelling legitimate grounds
  const assessment = await assessLegitimateGrounds(processingActivity);
  
  if (assessment.compellingGrounds) {
    // Notify user we must continue
    await notifyUserOfContinuedProcessing(userId, assessment.justification);
  } else {
    // Stop the processing
    await stopProcessingActivity(userId, processingActivity);
    
    // Update user preferences
    await db.update(users)
      .set({
        marketingOptOut: processingActivity === 'marketing',
        analyticsOptOut: processingActivity === 'analytics',
      })
      .where(eq(users.id, userId));
  }
  
  await auditLog({
    action: 'PROCESSING_OBJECTION',
    userId,
    activity: processingActivity,
    outcome: assessment.compellingGrounds ? 'continued' : 'stopped',
  });
}
```

## Consent Management (Article 7)

```typescript
/**
 * GDPR consent requirements:
 * - Freely given
 * - Specific
 * - Informed
 * - Unambiguous
 * - Withdrawable
 */

export const consents = pgTable("consents", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  
  // What consent is for
  purpose: varchar("purpose", { length: 100 }).notNull(),
  
  // Consent details
  consentGiven: boolean("consent_given").notNull(),
  consentText: text("consent_text").notNull(), // What user agreed to
  consentVersion: integer("consent_version").notNull(),
  
  // When and how
  consentDate: timestamp("consent_date").notNull(),
  consentMethod: varchar("consent_method", { length: 50 }).notNull(), // checkbox, click, etc.
  
  // Withdrawal
  withdrawn: boolean("withdrawn").default(false),
  withdrawnDate: timestamp("withdrawn_date"),
  
  // Evidence
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Consent collection
async function collectConsent(params: {
  userId: string;
  purpose: string;
  consentText: string;
  method: string;
  ipAddress: string;
  userAgent: string;
}): Promise<void> {
  await db.insert(consents).values({
    id: generateId(),
    userId: params.userId,
    purpose: params.purpose,
    consentGiven: true,
    consentText: params.consentText,
    consentVersion: await getCurrentConsentVersion(params.purpose),
    consentDate: new Date(),
    consentMethod: params.method,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

// Consent withdrawal
async function withdrawConsent(userId: string, purpose: string): Promise<void> {
  await db.update(consents)
    .set({
      withdrawn: true,
      withdrawnDate: new Date(),
    })
    .where(and(
      eq(consents.userId, userId),
      eq(consents.purpose, purpose),
      eq(consents.withdrawn, false)
    ));
  
  // Stop processing based on this consent
  await stopConsentBasedProcessing(userId, purpose);
}
```

## Data Protection by Design and Default (Article 25)

```typescript
/**
 * Privacy by design principles
 */

// 1. Pseudonymization
function pseudonymize(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex');
}

// 2. Encryption at rest
const encryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyRotationPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
};

// 3. Minimize data collection
const minimalUserSchema = z.object({
  email: z.string().email(), // Essential
  name: z.string().optional(), // Optional
  // Don't collect: DOB, SSN, etc. unless absolutely necessary
});

// 4. Default to privacy-friendly settings
const defaultUserSettings = {
  analyticsEnabled: false,      // Opt-in, not opt-out
  marketingEnabled: false,      // Opt-in, not opt-out
  dataSharing: false,           // Opt-in, not opt-out
  profileVisibility: 'private', // Private by default
};

// 5. Data retention limits
const dataRetentionPolicy = {
  inactiveAccounts: 365 * 2,    // 2 years of inactivity
  deletedAccounts: 30,          // 30 days grace period
  auditLogs: 365 * 7,           // 7 years (legal requirement)
  analyticsData: 365 * 2,       // 2 years
};
```

## Data Protection Impact Assessment (Article 35)

```typescript
/**
 * DPIA required when processing likely to result in high risk
 * - Systematic and extensive evaluation
 * - Large scale processing of special categories
 * - Systematic monitoring of public areas
 */

interface DPIA {
  // Description of processing
  description: string;
  purposes: string[];
  dataTypes: string[];
  
  // Necessity and proportionality
  necessity: string;
  proportionality: string;
  
  // Risk assessment
  risks: Array<{
    risk: string;
    likelihood: 'low' | 'medium' | 'high';
    severity: 'low' | 'medium' | 'high';
    mitigations: string[];
  }>;
  
  // Consultation
  dpoConsultation: {
    consulted: boolean;
    date: Date;
    advice: string;
  };
  
  // Outcome
  outcome: 'proceed' | 'mitigate_and_proceed' | 'do_not_proceed';
  residualRisk: string;
}

// Example DPIA
const userAnalyticsDPIA: DPIA = {
  description: 'Collection and analysis of user behavior data',
  purposes: ['Service improvement', 'User experience optimization'],
  dataTypes: ['Page views', 'Click events', 'Session duration', 'IP addresses'],
  
  necessity: 'Required to improve service quality and user experience',
  proportionality: 'Only aggregate data analyzed, no individual profiling',
  
  risks: [
    {
      risk: 'Re-identification of users from analytics data',
      likelihood: 'low',
      severity: 'medium',
      mitigations: [
        'IP address anonymization',
        'No correlation with user accounts',
        'Aggregate reporting only',
      ],
    },
  ],
  
  dpoConsultation: {
    consulted: true,
    date: new Date('2026-01-15'),
    advice: 'Implement IP anonymization and limit data retention',
  },
  
  outcome: 'mitigate_and_proceed',
  residualRisk: 'Low - mitigations adequately address identified risks',
};
```

## Data Breach Notification (Article 33 & 34)

```typescript
/**
 * Breach notification requirements:
 * - To supervisory authority within 72 hours (if high risk)
 * - To data subjects without undue delay (if high risk to rights/freedoms)
 */

interface DataBreach {
  // Breach details
  id: string;
  discoveryDate: Date;
  breachDate: Date;
  description: string;
  
  // Impact
  dataTypes: string[];
  affectedSubjects: number;
  potentialConsequences: string[];
  
  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high';
  
  // Mitigation
  mitigationsTaken: string[];
  
  // Notifications
  supervisoryAuthorityNotified: boolean;
  supervisoryAuthorityNotificationDate?: Date;
  dataSubjectsNotified: boolean;
  dataSubjectsNotificationDate?: Date;
  
  // DPO involvement
  dpoNotified: boolean;
  dpoNotificationDate?: Date;
}

async function handleDataBreach(breach: DataBreach): Promise<void> {
  // Immediate containment
  await containBreach(breach.id);
  
  // Notify DPO immediately
  await notifyDPO(breach);
  
  // Assess risk
  const requiresNotification = breach.riskLevel !== 'low';
  
  if (requiresNotification) {
    // Notify supervisory authority within 72 hours
    const deadline = new Date(breach.discoveryDate.getTime() + 72 * 60 * 60 * 1000);
    
    if (new Date() < deadline) {
      await notifySupervisoryAuthority(breach);
    } else {
      // Late notification requires justification
      await notifySupervisoryAuthority(breach, 'Late notification: [reason]');
    }
    
    // Notify data subjects if high risk
    if (breach.riskLevel === 'high') {
      await notifyDataSubjects(breach);
    }
  }
  
  // Document breach
  await documentBreach(breach);
}
```

## International Data Transfers (Chapter V)

```typescript
/**
 * Data transfer mechanisms:
 * - Adequacy decisions
 * - Standard Contractual Clauses (SCCs)
 * - Binding Corporate Rules (BCRs)
 * - Derogations
 */

interface DataTransfer {
  dataType: string;
  recipient: string;
  recipientCountry: string;
  
  transferMechanism: 
    | 'adequacy_decision'
    | 'standard_contractual_clauses'
    | 'binding_corporate_rules'
    | 'consent'
    | 'contract_performance'
    | 'public_interest'
    | 'legal_claims'
    | 'vital_interests';
  
  safeguards: string[];
  dataSubjectRights: string;
}

// Example: Cloud hosting in US
const awsDataTransfer: DataTransfer = {
  dataType: 'User personal data',
  recipient: 'Amazon Web Services',
  recipientCountry: 'United States',
  
  transferMechanism: 'standard_contractual_clauses',
  
  safeguards: [
    'AWS compliant with EU-US Data Privacy Framework',
    'Standard Contractual Clauses in place',
    'Encryption in transit and at rest',
    'Regular security audits',
  ],
  
  dataSubjectRights: 'Users can object to transfer, request local processing',
};
```

## Record of Processing Activities (Article 30)

```typescript
/**
 * Organizations with 250+ employees must maintain records
 * Smaller organizations if processing is not occasional, likely to result in risk,
 * or includes special categories/criminal data
 */

export const processingActivities = pgTable("processing_activities", {
  id: text("id").primaryKey(),
  
  // Identity
  controllerName: varchar("controller_name", { length: 255 }).notNull(),
  controllerContact: varchar("controller_contact", { length: 255 }).notNull(),
  dpoContact: varchar("dpo_contact", { length: 255 }),
  
  // Processing
  activityName: varchar("activity_name", { length: 255 }).notNull(),
  purposes: jsonb("purposes").$type<string[]>().notNull(),
  legalBasis: jsonb("legal_basis").$type<string[]>().notNull(),
  
  // Data
  dataCategories: jsonb("data_categories").$type<string[]>().notNull(),
  dataSubjectCategories: jsonb("data_subject_categories").$type<string[]>().notNull(),
  
  // Recipients
  recipients: jsonb("recipients").$type<string[]>(),
  
  // International transfers
  internationalTransfers: jsonb("international_transfers").$type<DataTransfer[]>(),
  
  // Retention
  retentionPeriod: varchar("retention_period", { length: 255 }).notNull(),
  
  // Security
  securityMeasures: jsonb("security_measures").$type<string[]>().notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

## Compliance Checklist

### Lawfulness
- [ ] Legal basis identified for each processing activity
- [ ] Consent mechanisms implemented where required
- [ ] Contract terms include data processing clauses

### Transparency
- [ ] Privacy policy published and accessible
- [ ] Privacy notices provided at data collection
- [ ] Clear information about data usage
- [ ] Cookie consent banner implemented

### Data Subject Rights
- [ ] Access request process (within 1 month)
- [ ] Rectification process
- [ ] Erasure process ("right to be forgotten")
- [ ] Data portability export functionality
- [ ] Objection handling process
- [ ] Automated decision-making transparency

### Security
- [ ] Encryption at rest and in transit
- [ ] Access controls and authentication
- [ ] Regular security assessments
- [ ] Pseudonymization where appropriate
- [ ] Data breach notification process

### Accountability
- [ ] Data Protection Officer appointed (if required)
- [ ] Record of processing activities maintained
- [ ] DPIAs conducted for high-risk processing
- [ ] Data protection policies documented
- [ ] Staff training on GDPR compliance

### International Transfers
- [ ] Transfer mechanisms documented
- [ ] Standard Contractual Clauses in place
- [ ] Privacy Shield/adequacy decisions verified

## Testing and Validation

```typescript
describe('GDPR Compliance', () => {
  it('should handle data access request within 1 month', async () => {
    const request = await submitAccessRequest(userId);
    
    expect(request.deadline).toBeLessThanOrEqual(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );
  });
  
  it('should delete user data on erasure request', async () => {
    await handleErasureRequest({ userId, reason: 'consent_withdrawn' });
    
    const userData = await getUser(userId);
    expect(userData).toBeNull();
  });
  
  it('should export data in machine-readable format', async () => {
    const exported = await exportUserData(userId);
    
    expect(exported).toHaveProperty('version');
    expect(exported).toHaveProperty('user');
    expect(JSON.stringify(exported)).toBeTruthy();
  });
  
  it('should respect consent withdrawal', async () => {
    await withdrawConsent(userId, 'marketing');
    
    const marketingEnabled = await isMarketingEnabled(userId);
    expect(marketingEnabled).toBe(false);
  });
});
```

## References

- [GDPR Official Text](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [ICO GDPR Guidance](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/)
- [European Data Protection Board](https://edpb.europa.eu/)
- [GDPR.eu](https://gdpr.eu/)

## Document Control

**Review Schedule:**
- Annual comprehensive review
- Following significant processing changes
- After data breaches
- When regulatory guidance updates

**Next Review Date**: 2027-02-04  
**Document Owner**: Security & Compliance Team

---

**Note**: This document provides guidance for GDPR compliance. Actual compliance requires comprehensive implementation and may require legal review. Consult with data protection experts and legal counsel.
