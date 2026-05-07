# Security Specification

## Data Invariants
- A `Customer` must have a unique ID and a phone number.
- An `Order` must belong to a valid `Customer`.
- `OrderItems` must refer to a valid `Order`.
- `Ledger` entries must be immutable once created (except balance updates in specific transactions).
- `Settings` can only be modified by an `ADMIN`.

## The Dirty Dozen Payloads
1. Attempt to create a customer as an unauthenticated user.
2. Attempt to delete a customer with a non-zero balance.
3. Attempt to update another customer's profile as a staff user.
4. Attempt to create an order for a non-existent customer.
5. Attempt to set an order status to 'DELIVERED' before payment.
6. Attempt to modify `Settings` as a non-admin.
7. Attempt to inject a 1MB string into a `Service` name.
8. Attempt to spoof `ownerId` on an `Order`.
9. Attempt to create a `Ledger` entry with a negative balance.
10. Attempt to delete `Logs` (Audit logs should be append-only).
11. Attempt to update a `Tax` rule as a non-admin.
12. Attempt to read PII of all customers without specific roles.

## The Test Runner
(Will be implemented in `firestore.rules.test.ts`)
