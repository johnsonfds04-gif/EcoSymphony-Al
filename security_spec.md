# EcoSymphony AI – Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Global Safety Net**: All unmatched paths are strictly denied (`allow read, write: if false;`).
2. **Verified Identity Mandate**: Standard writes require an authenticated user with `request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every single-document target path variable (`{userId}`, `{incidentId}`, `{notificationId}`, `{adminId}`) is validated via `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Citizen Profile Isolation & Anti-Spoofing**:
   - A `CitizenProfile` at `/citizenProfiles/{userId}` can only be created or updated if `userId == request.auth.uid` and `incoming().uid == request.auth.uid`.
   - Contains zero PII (no email, phone, or physical home address).
   - `createdAt` is immutable on update; `updatedAt == request.time`.
5. **Waste Incident Ownership, Relational Existence & Terminal State Locking**:
   - Creating `/incidents/{incidentId}` requires `incoming().citizenId == request.auth.uid`, `incoming().id == incidentId`, and `exists(/databases/$(database)/documents/citizenProfiles/$(request.auth.uid))` (Global Consistency Invariant).
   - Once an incident reaches terminal status `Closed`, non-admin users cannot mutate it (`existing().status != 'Closed' || isAdmin()`).
   - Immutable fields (`id`, `citizenId`, `createdAt`) cannot be altered on update.
6. **Master Gate Relational Sync on Notifications**:
   - Subcollection `/citizenProfiles/{userId}/notifications/{notificationId}` enforces the Master Gate by checking `exists(/databases/$(database)/documents/citizenProfiles/$(userId))` and verifying `userId == request.auth.uid || isAdmin()`.

---

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing on Incident Creation**: Authenticated user `user_A` attempts to create `/incidents/ES-0099` with `citizenId: "user_B"`. -> `PERMISSION_DENIED`
2. **Shadow / Ghost Field Injection**: User sends a valid `CitizenProfile` creation payload plus an undeclared field `isAdmin: true`. -> `PERMISSION_DENIED` (blocked by `.keys().hasOnly(...)`)
3. **Unverified Email Spoof Attack**: User with `email: "johnsonfds04@gmail.com"` but `email_verified: false` attempts to perform an admin or citizen write. -> `PERMISSION_DENIED`
4. **ID Poisoning / 2KB Path Variable**: Attacker attempts to create `/incidents/<2000-char-junk-id>`. -> `PERMISSION_DENIED` (blocked by `isValidId(incidentId)`)
5. **Value Poisoning on Update**: User updates `status` on `/incidents/ES-0001` with a boolean `true` or an invalid enum string `"HACKED"`. -> `PERMISSION_DENIED` (blocked by `isValidWasteIncident(incoming())`)
6. **Terminal State Bypass**: Non-admin user attempts to update an incident whose `existing().status == 'Closed'`. -> `PERMISSION_DENIED`
7. **Immortal Field Mutation**: User attempts to change `createdAt` or `citizenId` during an incident update. -> `PERMISSION_DENIED`
8. **Forged Client Timestamp**: User attempts to create an incident with a past or future `createdAt` instead of `request.time`. -> `PERMISSION_DENIED`
9. **Orphaned Incident Write**: User attempts to create `/incidents/ES-0010` before their `/citizenProfiles/{uid}` document exists. -> `PERMISSION_DENIED`
10. **Array Overflow / Type Poisoning**: User submits `materials` array with 50 items or non-string elements `[12345]`. -> `PERMISSION_DENIED`
11. **Cross-Tenant Notification Scraping**: User `user_A` attempts `list` on `/citizenProfiles/user_B/notifications`. -> `PERMISSION_DENIED` (blocked by `resource.data.citizenId == request.auth.uid`)
12. **Self-Assigned Admin Escalation**: Regular user attempts to write to `/admins/{uid}`. -> `PERMISSION_DENIED`
