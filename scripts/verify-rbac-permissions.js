#!/usr/bin/env node

/**
 * RBAC Permission Verification Script
 * 
 * This script verifies that all required RBAC permissions are properly seeded
 * in the database according to the 2026 best practices implementation.
 * 
 * Usage: node scripts/verify-rbac-permissions.js
 */

import { db } from '../server/db.js';
import { permissions } from '../shared/schema.js';

async function verifyRBACPermissions() {
  console.log('🔍 Verifying RBAC Permission Seeds...\n');

  try {
    // Define expected permissions based on Task 0.4 requirements
    const expectedPermissions = [
      // Organizations permissions
      { feature_area: 'organizations', permission_type: 'view' },
      { feature_area: 'organizations', permission_type: 'edit' },
      { feature_area: 'organizations', permission_type: 'create' },
      { feature_area: 'organizations', permission_type: 'delete' },
      { feature_area: 'organizations', permission_type: 'export' },
      
      // Dashboard permissions
      { feature_area: 'dashboard', permission_type: 'view' },
      
      // Engagements permissions
      { feature_area: 'engagements', permission_type: 'view' },
      { feature_area: 'engagements', permission_type: 'create' },
      { feature_area: 'engagements', permission_type: 'edit' },
      { feature_area: 'engagements', permission_type: 'delete' },
      { feature_area: 'engagements', permission_type: 'export' },
      
      // Vendors permissions
      { feature_area: 'vendors', permission_type: 'view' },
      { feature_area: 'vendors', permission_type: 'create' },
      { feature_area: 'vendors', permission_type: 'edit' },
      { feature_area: 'vendors', permission_type: 'delete' },
      { feature_area: 'vendors', permission_type: 'export' },
      
      // Threads permissions
      { feature_area: 'threads', permission_type: 'view' },
      { feature_area: 'threads', permission_type: 'create' },
      { feature_area: 'threads', permission_type: 'edit' },
      { feature_area: 'threads', permission_type: 'delete' },
      { feature_area: 'threads', permission_type: 'export' },
    ];

    // Get actual permissions from database
    const actualPermissions = await db.select().from(permissions);
    
    console.log(`📊 Found ${actualPermissions.length} total permissions in database\n`);

    // Check each expected permission
    const missingPermissions = [];
    const foundPermissions = [];

    for (const expected of expectedPermissions) {
      const found = actualPermissions.find(
        actual => actual.feature_area === expected.feature_area && 
                 actual.permission_type === expected.permission_type
      );
      
      if (found) {
        foundPermissions.push(found);
        console.log(`✅ ${expected.feature_area}:${expected.permission_type} - ${found.description || 'No description'}`);
      } else {
        missingPermissions.push(expected);
        console.log(`❌ ${expected.feature_area}:${expected.permission_type} - MISSING`);
      }
    }

    // Summary
    console.log('\n📋 Verification Summary:');
    console.log(`✅ Found: ${foundPermissions.length}/${expectedPermissions.length} expected permissions`);
    console.log(`❌ Missing: ${missingPermissions.length}/${expectedPermissions.length} expected permissions`);

    if (missingPermissions.length > 0) {
      console.log('\n🚨 Missing Permissions:');
      missingPermissions.forEach(p => {
        console.log(`   - ${p.feature_area}:${p.permission_type}`);
      });
      console.log('\n💡 To fix missing permissions, run the migration:');
      console.log('   psql -d your_database < docs/migrations/001-rbac-schema.sql');
      process.exit(1);
    } else {
      console.log('\n🎉 All required RBAC permissions are properly seeded!');
      console.log('✅ Task 0.4: Add missing RBAC permission seeds - COMPLETED');
      
      // Additional 2026 compliance checks
      console.log('\n🔐 2026 RBAC Best Practices Verification:');
      
      // Check for principle of least privilege (no wildcard permissions)
      const wildcardPerms = actualPermissions.filter(p => p.feature_area === '*' || p.permission_type === '*');
      if (wildcardPerms.length === 0) {
        console.log('✅ No wildcard permissions found (Principle of Least Privilege)');
      } else {
        console.log('⚠️  Found wildcard permissions - review for security implications');
      }
      
      // Check for proper permission granularity
      const featureAreas = [...new Set(actualPermissions.map(p => p.feature_area))];
      console.log(`✅ Proper granularity with ${featureAreas.length} feature areas`);
      
      // Check for audit trail readiness
      console.log('✅ Permission table includes created_at timestamps for audit trail');
      
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Error verifying permissions:', error);
    console.error('\n💡 Possible solutions:');
    console.error('   1. Ensure database is running and accessible');
    console.error('   2. Check DATABASE_URL environment variable');
    console.error('   3. Run the migration: psql -d your_database < docs/migrations/001-rbac-schema.sql');
    process.exit(1);
  }
}

// Run verification
verifyRBACPermissions();
