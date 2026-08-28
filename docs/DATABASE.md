# Database Design

## Phase 1 tables

**users** — id (uuid), name, email (unique), passwordHash, timestamps.
**user_profiles** — 1:1 with users, cascade-deletes with the user. `stylePreferences` and `favouriteColors` are Postgres text arrays — fine at this scale; if these grow into structured, queryable taxonomy (e.g. filtering users by preference for recommendation matching), migrate to a join table against a `StyleTag` lookup table rather than array-containment queries, which don't index well at scale.
**refresh_tokens** — enables session revocation. Indexed on `userId`. **Nothing currently prunes expired/revoked rows** — add a scheduled cleanup job before this table grows unbounded in production.

## Design choices worth knowing about

- **UUID primary keys**, not auto-increment ints. Slightly larger index size, but avoids leaking record counts/growth rate through sequential IDs, and avoids collision issues if you ever shard or merge data (e.g. after an acquisition, or multi-region writes).
- **Cascade deletes** on `UserProfile` and `RefreshToken` when a `User` is deleted — deliberate: a deleted user's derived data shouldn't become orphaned rows. Revisit this if you introduce soft-deletes (`deletedAt`) for GDPR/audit purposes instead of hard deletes — cascade behavior changes meaning once you do.
- **No soft-delete yet.** Adding `deletedAt: DateTime?` to `User` is a near-term migration once you need "deactivate account" vs "erase account" as distinct flows (likely required by privacy regulations depending on your markets).

## Migration workflow

```bash
# after editing schema.prisma
npm run prisma:migrate --workspace=backend   # dev: creates + applies a migration
npm run prisma:deploy --workspace=backend    # prod: applies pending migrations, no prompts
```

Never edit a migration file that has already been applied in a shared environment — create a new migration instead.

## Scaling beyond Phase 1

- Connection pooling: Prisma's default pool is fine for a single backend instance. Once you run multiple instances (horizontal scaling), put PgBouncer (or Prisma Accelerate) in front of Postgres — each Node process otherwise opens its own pool and you'll exhaust `max_connections` fast.
- Read replicas: not needed yet. When outfit/recommendation read traffic dwarfs writes, that's the trigger to introduce one, routed at the Prisma client level.
- `UserActivity` (future model) is a write-heavy event log — plan to route it to a purpose-built store (ClickHouse, BigQuery, or even just a separate Postgres instance) rather than co-locating it with transactional user data once volume grows past low thousands of events/day.
