/**
 * Security Rules Verification Suite (Phase 0 TDD Spec)
 * Validates the 12 "Dirty Dozen" adversarial payloads against firestore.rules.
 * Intended for execution against the Firebase Emulator Suite (`@firebase/rules-unit-testing`).
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  actorUid: string | null;
  emailVerified: boolean;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated read on enrollmentReports',
    actorUid: null,
    emailVerified: false,
    operation: 'get',
    path: 'users/u1/enrollmentReports/2025-2026',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified email creating private profile',
    actorUid: 'u1',
    emailVerified: false,
    operation: 'create',
    path: 'users/u1/private/profile',
    payload: {
      uid: 'u1',
      email: 'u1@school.edu.kh',
      displayName: 'Teacher',
      schoolName: 'Primary School',
      academicYear: '2025-2026',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-user read on another user private profile',
    actorUid: 'u2',
    emailVerified: true,
    operation: 'get',
    path: 'users/u1/private/profile',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Identity spoofing with mismatched ownerId',
    actorUid: 'u1',
    emailVerified: true,
    operation: 'create',
    path: 'users/u1/enrollmentReports/2025-2026',
    payload: {
      ownerId: 'u2',
      academicYear: '2025-2026',
      schoolName: 'School A',
      rowCount: 10,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow / ghost field injection on EnrollmentReport',
    actorUid: 'u1',
    emailVerified: true,
    operation: 'create',
    path: 'users/u1/enrollmentReports/2025-2026',
    payload: {
      ownerId: 'u1',
      academicYear: '2025-2026',
      schoolName: 'School A',
      rowCount: 10,
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Oversized / invalid reportId poisoning',
    actorUid: 'u1',
    emailVerified: true,
    operation: 'create',
    path: `users/u1/enrollmentReports/${'a'.repeat(150)}`,
    payload: {
      ownerId: 'u1',
      academicYear: '2025-2026',
      schoolName: 'School A',
      rowCount: 10,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned ageRow created without parent enrollmentReport',
    actorUid: 'u1',
    emailVerified: true,
    operation: 'create',
    path: 'users/u1/enrollmentReports/missing-report/ageRows/age_6',
    payload: {
      ownerId: 'u1',
      reportId: 'missing-report',
      ageId: 'age_6',
      g1_new_total: 10,
      g1_new_female: 5,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable ownerId modification on update',
    actorUid: 'u1',
    emailVerified: true,
    operation: 'update',
    path: 'users/u1/enrollmentReports/2025-2026',
    payload: {
      ownerId: 'u2',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client-forged updatedAt timestamp instead of request.time',
    actorUid: 'u1',
    emailVerified: true,
    operation: 'update',
    path: 'users/u1/enrollmentReports/2025-2026',
    payload: {
      schoolName: 'Updated School',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Negative count poisoning in ageRow',
    actorUid: 'u1',
    emailVerified: true,
    operation: 'update',
    path: 'users/u1/enrollmentReports/2025-2026/ageRows/age_6',
    payload: {
      g1_new_total: -1,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Disallowed categoryId outside 20-category allowlist',
    actorUid: 'u1',
    emailVerified: true,
    operation: 'create',
    path: 'users/u1/specialNeedsReports/2025-2026/categoryRows/fake_category',
    payload: {
      ownerId: 'u1',
      reportId: '2025-2026',
      categoryId: 'fake_category',
      g1_total: 3,
      g1_female: 2,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Blanket list query on private PII subcollection',
    actorUid: 'u1',
    emailVerified: true,
    operation: 'list',
    path: 'users/u1/private',
    expected: 'PERMISSION_DENIED',
  },
];
