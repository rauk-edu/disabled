# Security Specification — School Enrollment & Special Needs Registry

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every user's private profile (`users/{userId}/private/profile`), enrollment reports (`users/{userId}/enrollmentReports/{reportId}`), and special needs reports (`users/{userId}/specialNeedsReports/{reportId}`) are strictly owned by `userId == request.auth.uid`. Cross-user reads, lists, writes, or deletes are unconditionally denied.
2. **Verified Email Requirement**: All writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Isolation**: Email addresses and staff display names live exclusively inside `users/{userId}/private/profile` with no `list` access allowed.
4. **Master Gate & Atomicity**: Subcollection rows (`ageRows/{ageId}` and `categoryRows/{categoryId}`) cannot exist without a valid parent report owned by `request.auth.uid`, enforced via `existsAfter` / `getAfter` on create/update and `exists` / `get` on read.
5. **Strict Schema & Bounds**: Every numeric count must be an `int` within `[0, 100000]`, and `ageId` / `categoryId` must match closed allowlists. Every string field has strict `.size()` bounds and regex checks.
6. **Immutable Metadata & Server Timestamps**: `ownerId`, `reportId`, `ageId`, `categoryId`, `uid`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Read/Write**: Reading or writing `users/u1/enrollmentReports/2025-2026` with `auth == null`.
2. **Unverified Email Spoof**: Creating a profile or report with `auth.token.email_verified == false`.
3. **Cross-User Read/List**: User `u2` attempting `get` or `list` on `users/u1/enrollmentReports` or `users/u1/private/profile`.
4. **Identity Spoofing on Create**: User `u1` attempting to write `ownerId: "u2"` inside `users/u1/enrollmentReports/2025-2026`.
5. **Shadow / Ghost Field Injection**: Adding `"isAdmin": true` or `"extraField": "x"` to `UserPrivateProfile` or `EnrollmentAgeRow`.
6. **Oversized ID Poisoning**: Creating a document with `reportId` of 200+ characters or invalid characters (`../admin`).
7. **Orphaned Subcollection Row**: Creating `users/u1/enrollmentReports/nonexistent/ageRows/age_6` without creating the parent report in the same batch.
8. **Immutable Field Tampering**: Updating `createdAt` or `ownerId` on an existing `EnrollmentAgeRow`.
9. **Client Timestamp Forgery**: Setting `createdAt` or `updatedAt` to a past/future client timestamp instead of `request.time`.
10. **Negative / Overflow Value Poisoning**: Setting `g1_new_total: -5` or `g1_new_total: 9999999` or `"abc"` on `EnrollmentAgeRow`.
11. **Disallowed Category ID Injection**: Creating `users/u1/specialNeedsReports/2025-2026/categoryRows/fake_category` outside the closed 20-category allowlist.
12. **PII Collection List Scrape**: Attempting `list` on `users/u1/private`.
