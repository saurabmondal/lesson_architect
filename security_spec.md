# Security Spec

## Data Invariants
1. A lesson plan must have a `userId` that matches the authenticated user creating it.
2. The user creating the lesson plan must be authenticated with a verified email.
3. The user can only fetch their own lesson plans.
4. The `createdAt` must be a valid server timestamp.

## The "Dirty Dozen" Payloads
1. Unauthenticated write.
2. Spoofed userId (writing as someone else).
3. Payload with extra ghost fields.
4. Reading someone else's document.
5. Updating another user's document.
6. Creating a document with an invalid timestamp.
7. Update modifying the immutable `userId`.
8. Update modifying the immutable `createdAt`.
9. Payload missing required fields.
10. Unauthenticated read.
11. Reading the collection without filtering by `userId`.
12. Creating a document with wrong type for an array.
