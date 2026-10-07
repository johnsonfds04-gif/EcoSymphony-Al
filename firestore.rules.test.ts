/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads in security_spec.md are rejected with PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_SECURITY_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Incident Creation (citizenId != request.auth.uid)',
    collectionPath: '/incidents/ES-0099',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow / Ghost Field Injection (undeclared isAdmin field)',
    collectionPath: '/citizenProfiles/user_A',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Spoof Attack (email_verified == false)',
    collectionPath: '/incidents/ES-0001',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'ID Poisoning Guard (invalid characters or > 128 chars)',
    collectionPath: '/incidents/INVALID$ID#WITH*SPECIAL',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Value Poisoning on Update (invalid status enum)',
    collectionPath: '/incidents/ES-0001',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Terminal State Bypass (updating an already Closed incident as non-admin)',
    collectionPath: '/incidents/ES-0005',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Immortal Field Mutation (modifying createdAt or citizenId on update)',
    collectionPath: '/incidents/ES-0001',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Forged Client Timestamp (createdAt != request.time)',
    collectionPath: '/citizenProfiles/user_A',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Orphaned Incident Write (missing parent citizenProfile)',
    collectionPath: '/incidents/ES-0010',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Array Overflow / Type Poisoning (materials array > 15 items)',
    collectionPath: '/incidents/ES-0011',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Cross-Tenant Notification Scraping (listing another citizen notifications)',
    collectionPath: '/citizenProfiles/user_B/notifications',
    operation: 'list',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Escalation (writing to /admins/{uid})',
    collectionPath: '/admins/user_A',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
];
