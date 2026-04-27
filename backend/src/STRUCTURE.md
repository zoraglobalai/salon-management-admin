# Backend Structure

## Folder ownership

- `app.ts`, `server.ts`
  Runtime bootstrap only.

- `database/`
  Shared database setup.
  Put TypeORM datasource config, raw Postgres pool access, and SQL schema helpers here.

- `entities/platform/`
  Platform TypeORM entities.
  Add new entity files inside this folder so entity ownership stays centralized and avoids flat-file conflicts.

- `middleware/`
  Express middleware only.

- `modules/`
  Feature code grouped by business area.
  Each module owns its controller, service, and route files.

- `routes/`
  Route composition only.

- `shared/types/`
  Cross-module TypeScript contracts.

- `shared/utils/`
  Cross-module helper functions that are not tied to one feature.

- `tooling/scripts/`
  One-off operational scripts such as schema/bootstrap helpers.

## Team convention

- Put feature behavior in `modules/`, not in `shared/`.
- Put reusable helpers in `shared/` only after they are needed across multiple modules.
- Keep entity imports pointed at `entities/platform/*`.
- Keep database access pointed at `database/*`.
