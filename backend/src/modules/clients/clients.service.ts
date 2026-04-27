import { query, withTransaction } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientRecord = {
  id: string;
  name: string;
  phoneNumber: string;
  hairType: string;
  notes: string;
  lastVisitAt: string | null;
  totalVisits: number;
  tag: string;
  preferredStaffId: string | null;
  nextFollowUpDate: string | null;
  locationId: string;
  locationName: string;
  problems: string[];
  createdAt: string;
};

type ClientRow = {
  id: string;
  name: string;
  phone_number: string;
  hair_type: string;
  notes: string;
  last_visit_at: string | null;
  total_visits: string | number;
  tag: string;
  preferred_staff_id: string | null;
  next_follow_up_date: string | null;
  location_id: string;
  location_name: string;
  created_at: string;
};

export type ClientInput = {
  name: string;
  phoneNumber: string;
  hairType?: string;
  notes?: string;
  tag?: string;
  preferredStaffId?: string | null;
  nextFollowUpDate?: string | null;
  problems?: string[];
  locationId?: string;
};

export type ClientFilters = {
  search?: string;
  tag?: string;
  hairType?: string;
  lastVisit?: "today" | "7days" | "30days" | "inactive";
  problems?: string[];
  minVisits?: number;
  maxVisits?: number;
};

const VALID_TAGS = new Set(["NEW", "REGULAR", "VIP"]);
const VALID_HAIR = new Set(["Normal", "Dry", "Oily"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRow(row: ClientRow, problems: string[] = []): ClientRecord {
  return {
    id: row.id,
    name: row.name,
    phoneNumber: row.phone_number,
    hairType: row.hair_type,
    notes: row.notes,
    lastVisitAt: row.last_visit_at,
    totalVisits: Number(row.total_visits),
    tag: row.tag,
    preferredStaffId: row.preferred_staff_id,
    nextFollowUpDate: row.next_follow_up_date,
    locationId: row.location_id,
    locationName: row.location_name,
    problems,
    createdAt: row.created_at,
  };
}

function validateInput(input: ClientInput) {
  const name = String(input.name ?? "").trim();
  const phone = String(input.phoneNumber ?? "").trim();

  if (!name) throw createError("Client name is required.", 400);
  if (!phone) throw createError("Phone number is required.", 400);
  if (!/^\d{10,15}$/.test(phone)) throw createError("Phone number must be 10–15 digits.", 400);

  const tag = String(input.tag ?? "NEW").toUpperCase();
  if (!VALID_TAGS.has(tag)) throw createError("Tag must be NEW, REGULAR, or VIP.", 400);

  const hairType = String(input.hairType ?? "Normal");
  if (!VALID_HAIR.has(hairType)) throw createError("Hair type must be Normal, Dry, or Oily.", 400);

  return {
    name,
    phoneNumber: phone,
    hairType,
    notes: String(input.notes ?? "").trim(),
    tag,
    preferredStaffId: input.preferredStaffId || null,
    nextFollowUpDate: input.nextFollowUpDate || null,
    problems: Array.isArray(input.problems)
      ? input.problems.map((p) => String(p).trim()).filter(Boolean)
      : [],
    locationId: input.locationId,
  };
}

async function resolveLocationId(user: AuthUserPayload, requestedId?: string) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  if (user.type === "manager") {
    if (!user.branch_id) throw createError("Manager location not configured.", 400);
    if (requestedId && requestedId !== user.branch_id) {
      throw createError("Cross-location access not allowed.", 403);
    }
    return user.branch_id;
  }

  if (user.type !== "owner") throw createError("Access denied.", 403);
  if (!requestedId) throw createError("locationId is required.", 400);

  const check = await query<{ id: string }>(
    `SELECT id FROM branches WHERE id = $1 AND "tenantId" = $2 LIMIT 1`,
    [requestedId, user.tenant_id]
  );
  if (!check.rows[0]) throw createError("Location not found.", 403);
  return requestedId;
}

// ─── Fetch problems for a set of client IDs ───────────────────────────────────

async function fetchProblems(clientIds: string[]): Promise<Record<string, string[]>> {
  if (clientIds.length === 0) return {};
  const result = await query<{ client_id: string; problem_name: string }>(
    `SELECT client_id, problem_name FROM client_problems WHERE client_id = ANY($1::uuid[])`,
    [clientIds]
  );
  return result.rows.reduce<Record<string, string[]>>((acc, r) => {
    if (!acc[r.client_id]) acc[r.client_id] = [];
    acc[r.client_id].push(r.problem_name);
    return acc;
  }, {});
}

// ─── Service Functions ────────────────────────────────────────────────────────

export async function listClients(user: AuthUserPayload, locationId?: string, filters: ClientFilters = {}) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const values: unknown[] = [user.tenant_id];
  const conditions = ["c.tenant_id = $1"];

  // Location restriction
  if (user.type === "manager") {
    if (!user.branch_id) throw createError("Manager location not configured.", 400);
    conditions.push(`c.location_id = $${values.length + 1}`);
    values.push(user.branch_id);
  } else if (user.type === "owner" && locationId && locationId !== "all") {
    const resolved = await resolveLocationId(user, locationId);
    conditions.push(`c.location_id = $${values.length + 1}`);
    values.push(resolved);
  } else if (user.type !== "owner") {
    throw createError("Access denied.", 403);
  }

  // Search
  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(`(c.name ILIKE $${values.length + 1} OR c.phone_number ILIKE $${values.length + 2})`);
    values.push(term, term);
  }

  // Tag filter
  if (filters.tag && VALID_TAGS.has(filters.tag)) {
    conditions.push(`c.tag = $${values.length + 1}`);
    values.push(filters.tag);
  }

  // Hair type filter
  if (filters.hairType && VALID_HAIR.has(filters.hairType)) {
    conditions.push(`c.hair_type = $${values.length + 1}`);
    values.push(filters.hairType);
  }

  // Last visit filter
  if (filters.lastVisit) {
    if (filters.lastVisit === "today") {
      conditions.push(`c.last_visit_at::date = CURRENT_DATE`);
    } else if (filters.lastVisit === "7days") {
      conditions.push(`c.last_visit_at >= NOW() - INTERVAL '7 days'`);
    } else if (filters.lastVisit === "30days") {
      conditions.push(`c.last_visit_at >= NOW() - INTERVAL '30 days'`);
    } else if (filters.lastVisit === "inactive") {
      conditions.push(`(c.last_visit_at IS NULL OR c.last_visit_at < NOW() - INTERVAL '60 days')`);
    }
  }

  // Visit count range
  if (filters.minVisits !== undefined) {
    conditions.push(`c.total_visits >= $${values.length + 1}`);
    values.push(filters.minVisits);
  }
  if (filters.maxVisits !== undefined) {
    conditions.push(`c.total_visits <= $${values.length + 1}`);
    values.push(filters.maxVisits);
  }

  const result = await query<ClientRow>(
    `SELECT c.id, c.name, c.phone_number, c.hair_type, c.notes,
            c.last_visit_at, c.total_visits, c.tag,
            c.preferred_staff_id, c.next_follow_up_date,
            c.location_id, c.created_at,
            b.name AS location_name
     FROM clients c
     INNER JOIN branches b ON b.id = c.location_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY c.created_at DESC`,
    values
  );

  const rows = result.rows;
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const problemsMap = await fetchProblems(ids);

  // Problems filter (post-fetch, since it needs JOIN)
  let filtered = rows;
  if (filters.problems && filters.problems.length > 0) {
    filtered = rows.filter((r) =>
      filters.problems!.some((p) => (problemsMap[r.id] || []).includes(p))
    );
  }

  return filtered.map((r) => mapRow(r, problemsMap[r.id] || []));
}

export async function getClient(user: AuthUserPayload, clientId: string) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const result = await query<ClientRow>(
    `SELECT c.id, c.name, c.phone_number, c.hair_type, c.notes,
            c.last_visit_at, c.total_visits, c.tag,
            c.preferred_staff_id, c.next_follow_up_date,
            c.location_id, c.created_at,
            b.name AS location_name
     FROM clients c
     INNER JOIN branches b ON b.id = c.location_id
     WHERE c.id = $1
       AND c.tenant_id = $2
       AND ($3::uuid IS NULL OR c.location_id = $3)`,
    [clientId, user.tenant_id, user.type === "manager" ? user.branch_id : null]
  );

  if (!result.rows[0]) throw createError("Client not found.", 404);

  const problems = await fetchProblems([clientId]);
  return mapRow(result.rows[0], problems[clientId] || []);
}

export async function createClient(user: AuthUserPayload, input: ClientInput) {
  const data = validateInput(input);
  const locationId = await resolveLocationId(user, data.locationId);

  // Duplicate check
  const existing = await query<{ id: string }>(
    `SELECT id FROM clients WHERE phone_number = $1 AND location_id = $2 AND tenant_id = $3 LIMIT 1`,
    [data.phoneNumber, locationId, user.tenant_id]
  );
  if (existing.rows[0]) {
    throw createError("A client with this phone number already exists at this location.", 409);
  }

  return withTransaction(async (client) => {
    const result = await client.query<ClientRow>(
      `INSERT INTO clients
         (tenant_id, location_id, name, phone_number, hair_type, notes, tag, preferred_staff_id, next_follow_up_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, name, phone_number, hair_type, notes, last_visit_at,
                 total_visits, tag, preferred_staff_id, next_follow_up_date,
                 location_id, created_at,
                 (SELECT name FROM branches WHERE id = location_id) AS location_name`,
      [
        user.tenant_id, locationId, data.name, data.phoneNumber,
        data.hairType, data.notes, data.tag,
        data.preferredStaffId, data.nextFollowUpDate,
      ]
    );

    const newClient = result.rows[0];

    for (const problem of data.problems) {
      await client.query(
        `INSERT INTO client_problems (client_id, problem_name) VALUES ($1, $2)`,
        [newClient.id, problem]
      );
    }

    return mapRow(newClient, data.problems);
  });
}

export async function updateClient(user: AuthUserPayload, clientId: string, input: ClientInput) {
  const data = validateInput(input);

  return withTransaction(async (client) => {
    const result = await client.query<ClientRow>(
      `UPDATE clients
       SET name=$1, phone_number=$2, hair_type=$3, notes=$4, tag=$5,
           preferred_staff_id=$6, next_follow_up_date=$7, updated_at=NOW()
       WHERE id=$8
         AND tenant_id=$9
         AND ($10::uuid IS NULL OR location_id=$10)
       RETURNING id, name, phone_number, hair_type, notes, last_visit_at,
                 total_visits, tag, preferred_staff_id, next_follow_up_date,
                 location_id, created_at,
                 (SELECT name FROM branches WHERE id = location_id) AS location_name`,
      [
        data.name, data.phoneNumber, data.hairType, data.notes, data.tag,
        data.preferredStaffId, data.nextFollowUpDate,
        clientId, user.tenant_id,
        user.type === "manager" ? user.branch_id : null,
      ]
    );

    if (!result.rows[0]) throw createError("Client not found.", 404);
    const updated = result.rows[0];

    // Replace problems: delete old, insert new
    await client.query(`DELETE FROM client_problems WHERE client_id = $1`, [clientId]);
    for (const problem of data.problems) {
      await client.query(
        `INSERT INTO client_problems (client_id, problem_name) VALUES ($1, $2)`,
        [clientId, problem]
      );
    }

    return mapRow(updated, data.problems);
  });
}

export async function deleteClient(user: AuthUserPayload, clientId: string) {
  const result = await query<{ id: string }>(
    `DELETE FROM clients
     WHERE id = $1
       AND tenant_id = $2
       AND ($3::uuid IS NULL OR location_id = $3)
     RETURNING id`,
    [clientId, user.tenant_id, user.type === "manager" ? user.branch_id : null]
  );
  if (!result.rows[0]) throw createError("Client not found.", 404);
}
