# Database Schema Design Checklist

**Use this checklist for EVERY new table or column addition**

---

## 📋 Pre-Design Questions

Before writing any SQL, answer:

- [ ] **Purpose**: Why does this table/column exist?
- [ ] **Lifespan**: How long will this data live?
- [ ] **Volume**: How many rows expected? (100? 1M? 1B?)
- [ ] **Access Pattern**: Who reads/writes this? How often?

---

## 🏗️ Table Creation

### Naming
- [ ] Table name is plural (e.g., `users`, not `user`)
- [ ] Table name is lowercase with underscores
- [ ] Name clearly describes the entity

### Primary Key
- [ ] Table has a primary key defined
- [ ] PK type is appropriate:
  - `BIGSERIAL` for auto-increment IDs
  - `UUID` for distributed/external IDs
  - Natural key only if truly immutable

### Columns - Data Types
- [ ] **Monetary values**: Use `NUMERIC`, **NEVER TEXT**
  - ✅ `amount NUMERIC`
  - ❌ `amount TEXT`
- [ ] **Booleans**: Use `BOOLEAN`, **NEVER TEXT**
  - ✅ `is_active BOOLEAN`
  - ❌ `is_active TEXT`
- [ ] **Enums**: Create `ENUM` type, **NEVER TEXT**
  - ✅ `CREATE TYPE status_enum AS ENUM (...); status status_enum`
  - ❌ `status TEXT`
- [ ] **Timestamps**: Use `TIMESTAMPTZ` (with timezone)
  - ✅ `created_at TIMESTAMPTZ`
  - ❌ `created_at TIMESTAMP` (no timezone!)
- [ ] **JSON**: Use `JSONB` (not `JSON`)
- [ ] **Addresses**: `TEXT` with CHECK constraint (regex validation)

### Columns - Constraints
- [ ] Every column has appropriate `NOT NULL` or allows NULL intentionally
- [ ] Default values defined where appropriate
- [ ] CHECK constraints for value validation
  - Example: `CHECK (amount >= 0)`
  - Example: `CHECK (email ~* '^.+@.+\..+$')`
- [ ] UNIQUE constraints where duplicates not allowed

### Foreign Keys
- [ ] All reference columns have `FOREIGN KEY` constraints
- [ ] Cascade behavior defined:
  - `ON DELETE CASCADE` - child deleted when parent deleted
  - `ON DELETE SET NULL` - child orphaned
  - `ON DELETE RESTRICT` - prevent parent deletion (default)
- [ ] Foreign keys reference correct column type

---

## 🔒 Security

### Row Level Security (RLS)
- [ ] RLS enabled: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
- [ ] Policies defined for each operation (SELECT, INSERT, UPDATE, DELETE)
- [ ] Policy uses correct auth function:
  - `auth.uid()` for current user ID
  - `auth.role()` for role-based access
- [ ] Policy tested with different user roles

### Sensitive Data
- [ ] Identified columns containing PII/sensitive data
- [ ] Sensitive columns have `COMMENT` marking them
- [ ] Considered encryption needs (application-layer)
- [ ] RLS prevents unauthorized access

### Validation
- [ ] Ethereum addresses validated: `CHECK (address ~* '^0x[a-fA-F0-9]{40}$')`
- [ ] URLs validated: `CHECK (url ~* '^https?://.*')`
- [ ] Email validated (if needed)
- [ ] Prevent SQL injection via parameterized queries (application layer)

---

## 🚀 Performance

### Indexes
- [ ] Primary key auto-indexed (verify)
- [ ] Foreign keys indexed: `CREATE INDEX idx_x_y ON x(y_id);`
- [ ] Columns in WHERE clauses indexed
- [ ] Columns in ORDER BY indexed (DESC if sorting descending)
- [ ] Composite indexes for multi-column queries
- [ ] Partial indexes for filtered queries:
  - Example: `CREATE INDEX ... WHERE status = 'active';`
- [ ] **Don't over-index**: Each index slows INSERT/UPDATE

### Partitioning (for large tables)
- [ ] Consider partitioning if > 10M rows expected
- [ ] Partition by time (most common): `PARTITION BY RANGE (created_at)`
- [ ] Partition strategy defined (daily? monthly?)

---

## 📊 Data Integrity

### Consistency
- [ ] No duplicate data (normalize where appropriate)
- [ ] Referential integrity enforced via FK constraints
- [ ] Atomic operations for critical updates (use RPC if needed)

### Audit Trail
- [ ] `created_at TIMESTAMPTZ DEFAULT NOW()` on all tables
- [ ] `updated_at TIMESTAMPTZ` where updates expected
- [ ] `updated_by UUID` to track who modified (optional)
- [ ] Consider audit log table for sensitive operations

---

## 📝 Documentation

### Comments
- [ ] Table purpose documented:
  ```sql
  COMMENT ON TABLE users IS 'Registered user accounts with auth integration';
  ```
- [ ] Each column documented:
  ```sql
  COMMENT ON COLUMN users.email IS 'Primary email for login. Must be unique.';
  ```
- [ ] Sensitive columns marked:
  ```sql
  COMMENT ON COLUMN users.api_key IS 'SENSITIVE: API authentication key';
  ```

### Migration File
- [ ] Migration has clear header comment (purpose, author, date)
- [ ] Migration is idempotent (safe to run twice)
- [ ] Migration includes validation block
- [ ] Rollback plan documented

### ERD
- [ ] Entity-Relationship Diagram updated
- [ ] New relationships documented

---

## 🧪 Testing

### Pre-Deployment
- [ ] Migration tested on local database
- [ ] Migration tested on staging database
- [ ] Data types verified: `\d+ table_name`
- [ ] Constraints verified: `\d+ table_name`
- [ ] Indexes verified: `\di`
- [ ] RLS policies verified: `\dp table_name`

### Post-Deployment
- [ ] Smoke test: Basic CRUD operations work
- [ ] Performance test: Queries within acceptable time
- [ ] Security test: RLS prevents unauthorized access
- [ ] Integration test: Application code works correctly

---

## ✅ Final Checks

Before merging:
- [ ] All items in this checklist completed
- [ ] Peer review completed
- [ ] CI/CD validation passed
- [ ] Schema validator passed
- [ ] Documentation updated

---

## ⚠️ Common Mistakes to Avoid

| ❌ Don't | ✅ Do |
|---------|------|
| `amount TEXT` | `amount NUMERIC` |
| `status TEXT` | `status status_enum` |
| `created TIMESTAMP` | `created_at TIMESTAMPTZ` |
| No NOT NULL | Explicit NULL or NOT NULL |
| No indexes on FKs | Index all foreign keys |
| No RLS | Enable RLS + policies |
| No comments | Document purpose |
| No validation | CHECK constraints |

---

## 📚 Resources

- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/ddl-basics.html)

---

**Version**: 1.0  
**Last Updated**: 2026-01-10  
**Maintained By**: Database Team
