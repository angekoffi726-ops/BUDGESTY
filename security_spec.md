# BUDGESTY — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Ownership & PII Isolation**: Every document under `/users/{userId}` and its subcollections (`mois`, `depenses`, `historique`) belongs exclusively to `userId == request.auth.uid`. No user can read, list, or write another user's data.
2. **Path Variable Hardening**: All document IDs (`userId`, `moisId`, `depenseId`, `entryId`) must match strict regex patterns and length limits (`<= 128`). `moisId` must strictly match `^2027-(0[1-9]|1[0-2])$`.
3. **Immutability of Closed Months (`CLOTURE`)**: Once a month document reaches `statut == 'CLOTURE'`, no subsequent update or delete is permitted on that month document, and no expenses may be created, updated, or deleted under `/users/{userId}/mois/{moisId}/depenses`.
4. **Immutable Audit & Expense Logs**: History entries (`/historique`) and expense entries (`/depenses`) are append-only (`update` and `delete` denied).
5. **Strict Schema & Numeric Bounds**:
   - `salaire.salaireReference == 155000`
   - `salaire.montantActif` bounded in `[0, 155000]`
   - `salaire.argentEncoreDisponible` bounded in `[0, 155000]`
   - `loyer.montant == 35350`
   - `fixes` keys restricted to `['epargne', 'soutien_famille', 'don_papa', 'femme_enfant', 'eau_boire']`
   - `depensesCategories` keys restricted to `['maison', 'internet', 'eau_laver']`
   - `caisses` keys restricted to `['sante', 'vetements', 'secours', 'epargne', 'surplus']`
   - All string fields enforce `size()` bounds and no shadow/ghost fields are allowed (`keys().hasOnly(...)`).
6. **Temporal Integrity**: `createdAt == request.time` on creation; `createdAt == existing().createdAt` and `updatedAt == request.time` on update.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Cross-User Read/Write**: User B (`uid_B`) attempts to read or write `/users/uid_A/mois/2027-01`.
2. **Ghost/Shadow Field Injection**: User A creates `/users/uid_A/mois/2027-01` with an extra field `isAdmin: true`.
3. **Mutating a `CLOTURE` Month**: User A attempts to update `argentEncoreDisponible` or `statut` on `/users/uid_A/mois/2027-01` when `existing().statut == 'CLOTURE'`.
4. **Adding Expense to a `CLOTURE` or `VERROUILLE` Month**: User A attempts to create a document in `/users/uid_A/mois/2027-02/depenses/exp1` while `2027-02` has `statut == 'VERROUILLE'`.
5. **Client Timestamp Forgery**: User A creates a `historique` entry with `createdAt` set to a past client `Timestamp` instead of `request.time`.
6. **Modifying Immutable `createdAt` / `userId` / `moisId`**: User A updates `/users/uid_A/mois/2027-01` and alters `createdAt` or `moisId`.
7. **Out-of-Bounds Salary Active Amount**: User A updates `salaire.montantActif` to `200000` (exceeding `155000`).
8. **Negative Available Balance**: User A updates `salaire.argentEncoreDisponible` to `-5000`.
9. **Altering Reference Rent or Salary**: User A sets `loyer.montant` to `0` or `salaire.salaireReference` to `999999`.
10. **ID Poisoning**: User A writes to `/users/uid_A/mois/2027-13` or `/users/uid_A/historique/invalid id with spaces`.
11. **Oversized String DoS**: User A creates an `ExpenseEntry` with a `description` of 500 characters (`> 140` limit).
12. **History Tampering / Deletion**: User A attempts to `update` or `delete` an existing `/users/uid_A/historique/{entryId}` document.
