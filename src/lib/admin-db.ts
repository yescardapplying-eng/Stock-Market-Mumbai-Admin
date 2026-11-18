import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface LeadRecord {
  id: number;
  form_type: 'popup' | 'contact';
  lead_reference: string;
  full_name: string;
  mobile_number: string;
  state: string | null;
  segment: string | null;
  capital_range: string | null;
  message: string | null;
  source_page: string;
  ip_address: string | null;
  user_agent: string | null;
  status: 'new' | 'contacted' | 'enrolled' | 'not_interested' | 'invalid';
  notes: string | null;
  created_at: string;
  created_at_formatted?: string;
  time_ago?: string;
}

let pool: mysql.Pool | null = null;
let tableInitialized = false;

export function isMysqlConfigured(): boolean {
  return Boolean(process.env.DB_HOST && process.env.DB_HOST.trim() !== '');
}

export function getDbPool(): mysql.Pool {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'stock_market_mumbai',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    timezone: '+05:30',
  });
  return pool;
}

export async function ensureLeadsTable(): Promise<void> {
  if (tableInitialized || !isMysqlConfigured()) return;
  const db = getDbPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`leads\` (
      \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`form_type\` ENUM('popup', 'contact') NOT NULL DEFAULT 'popup',
      \`lead_reference\` VARCHAR(40) UNIQUE,
      \`full_name\` VARCHAR(100) NOT NULL,
      \`mobile_number\` VARCHAR(20) NOT NULL,
      \`state\` VARCHAR(100) NULL,
      \`segment\` VARCHAR(100) NULL,
      \`capital_range\` VARCHAR(100) NULL,
      \`message\` TEXT NULL,
      \`source_page\` VARCHAR(255) DEFAULT '/',
      \`ip_address\` VARCHAR(45) NULL,
      \`user_agent\` TEXT NULL,
      \`status\` ENUM('new', 'contacted', 'enrolled', 'not_interested', 'invalid') NOT NULL DEFAULT 'new',
      \`notes\` TEXT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_lead_form_type\` (\`form_type\`),
      INDEX \`idx_lead_status\` (\`status\`),
      INDEX \`idx_lead_created\` (\`created_at\`),
      INDEX \`idx_lead_mobile\` (\`mobile_number\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  tableInitialized = true;
}

function getFallbackFilePath(): string {
  const customDir = process.env.DATA_DIR?.trim();
  const baseDir = customDir
    ? customDir
    : process.env.VERCEL
      ? os.tmpdir()
      : path.join(process.cwd(), '.data');
  return path.join(baseDir, 'smm_admin_leads.json');
}

async function readFallbackLeads(): Promise<LeadRecord[]> {
  const filePath = getFallbackFilePath();
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as LeadRecord[];
  } catch {
    return [];
  }
}

async function writeFallbackLeads(rows: LeadRecord[]): Promise<void> {
  const filePath = getFallbackFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(rows, null, 2), 'utf-8');
}

function toIstDateStr(dateInput: string | Date): string {
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
}

export function formatIstTimeline(dateInput: string | Date): { formatted: string; timeAgo: string } {
  const d = new Date(dateInput);
  const formatted = d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  let timeAgo = formatted;
  if (diffSec < 60) timeAgo = 'Just now';
  else if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    timeAgo = `${mins} min${mins > 1 ? 's' : ''} ago`;
  } else if (diffSec < 86400) {
    const hrs = Math.floor(diffSec / 3600);
    timeAgo = `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  } else {
    timeAgo = d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return { formatted, timeAgo };
}

export async function ingestLead(input: {
  form_type: 'popup' | 'contact';
  lead_reference: string;
  full_name: string;
  mobile_number: string;
  state?: string | null;
  segment?: string | null;
  capital_range?: string | null;
  message?: string | null;
  source_page?: string;
  ip_address?: string;
  user_agent?: string;
}): Promise<number> {
  if (isMysqlConfigured()) {
    await ensureLeadsTable();
    const db = getDbPool();
    const [res] = await db.execute(
      `INSERT INTO \`leads\`
        (\`form_type\`, \`lead_reference\`, \`full_name\`, \`mobile_number\`, \`state\`, \`segment\`, \`capital_range\`, \`message\`, \`source_page\`, \`ip_address\`, \`user_agent\`, \`status\`, \`created_at\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NOW())
       ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [
        input.form_type,
        input.lead_reference,
        input.full_name,
        input.mobile_number,
        input.state ?? null,
        input.segment ?? null,
        input.capital_range ?? null,
        input.message ?? null,
        input.source_page || '/',
        input.ip_address || '127.0.0.1',
        (input.user_agent || 'Unknown').substring(0, 255),
      ]
    );
    return (res as { insertId?: number }).insertId || 1;
  }

  const rows = await readFallbackLeads();
  const existing = rows.find((r) => r.lead_reference === input.lead_reference);
  if (existing) return existing.id;

  const nextId = rows.length > 0 ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
  rows.unshift({
    id: nextId,
    form_type: input.form_type,
    lead_reference: input.lead_reference,
    full_name: input.full_name,
    mobile_number: input.mobile_number,
    state: input.state ?? null,
    segment: input.segment ?? null,
    capital_range: input.capital_range ?? null,
    message: input.message ?? null,
    source_page: input.source_page || '/',
    ip_address: input.ip_address || '127.0.0.1',
    user_agent: input.user_agent || 'Unknown',
    status: 'new',
    notes: '',
    created_at: new Date().toISOString(),
  });
  await writeFallbackLeads(rows);
  return nextId;
}

export interface LeadQueryFilters {
  page: number;
  limit: number;
  formType: string;
  status: string;
  date: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

export async function queryLeads(filters: LeadQueryFilters) {
  const { page, limit, formType, status, date, dateFrom, dateTo, search } = filters;
  const offset = (page - 1) * limit;

  if (isMysqlConfigured()) {
    await ensureLeadsTable();
    const db = getDbPool();

    const [statsRows] = await db.query(`
      SELECT
        COUNT(*) as total_inquiries,
        SUM(CASE WHEN form_type = 'popup' THEN 1 ELSE 0 END) as popup_leads,
        SUM(CASE WHEN form_type = 'contact' THEN 1 ELSE 0 END) as contact_leads,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_leads
      FROM \`leads\`
    `);
    const sRaw = (statsRows as Array<Record<string, number>>)[0] || {};
    const stats = {
      total: Number(sRaw.total_inquiries || 0),
      popup: Number(sRaw.popup_leads || 0),
      contact: Number(sRaw.contact_leads || 0),
      today: Number(sRaw.today_leads || 0),
    };

    const where: string[] = ['1=1'];
    const params: Array<string | number> = [];

    if (formType === 'popup' || formType === 'contact') {
      where.push('form_type = ?');
      params.push(formType);
    }
    if (status !== 'all' && ['new', 'contacted', 'enrolled', 'not_interested', 'invalid'].includes(status)) {
      where.push('status = ?');
      params.push(status);
    }
    if (date) {
      where.push('DATE(created_at) = ?');
      params.push(date);
    } else {
      if (dateFrom) {
        where.push('DATE(created_at) >= ?');
        params.push(dateFrom);
      }
      if (dateTo) {
        where.push('DATE(created_at) <= ?');
        params.push(dateTo);
      }
    }
    if (search) {
      where.push(
        '(full_name LIKE ? OR mobile_number LIKE ? OR lead_reference LIKE ? OR state LIKE ? OR segment LIKE ? OR message LIKE ?)'
      );
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like);
    }

    const whereSql = where.join(' AND ');
    const [countRows] = await db.query(`SELECT COUNT(*) as cnt FROM \`leads\` WHERE ${whereSql}`, params);
    const totalItems = Number((countRows as Array<{ cnt: number }>)[0]?.cnt || 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const [rows] = await db.query(
      `SELECT id, form_type, lead_reference, full_name, mobile_number, state, segment, capital_range, message, source_page, ip_address, user_agent, status, notes, created_at
       FROM \`leads\` WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const items = (rows as LeadRecord[]).map((row) => {
      const t = formatIstTimeline(row.created_at);
      return {
        ...row,
        created_at_formatted: t.formatted,
        time_ago: t.timeAgo,
      };
    });

    return {
      storageMode: 'mysql' as const,
      stats,
      pagination: {
        current_page: page,
        limit,
        total_items: totalItems,
        total_pages: totalPages,
        has_prev: page > 1,
        has_next: page < totalPages,
      },
      data: items,
    };
  }

  // Fallback JSON store (for zero-config Vercel preview / local dev)
  const allRows = await readFallbackLeads();
  const todayIst = toIstDateStr(new Date());

  const stats = {
    total: allRows.length,
    popup: allRows.filter((r) => r.form_type === 'popup').length,
    contact: allRows.filter((r) => r.form_type === 'contact').length,
    today: allRows.filter((r) => toIstDateStr(r.created_at) === todayIst).length,
  };

  let filtered = allRows;
  if (formType === 'popup' || formType === 'contact') {
    filtered = filtered.filter((r) => r.form_type === formType);
  }
  if (status !== 'all') {
    filtered = filtered.filter((r) => r.status === status);
  }
  if (date) {
    filtered = filtered.filter((r) => toIstDateStr(r.created_at) === date);
  } else {
    if (dateFrom) filtered = filtered.filter((r) => toIstDateStr(r.created_at) >= dateFrom);
    if (dateTo) filtered = filtered.filter((r) => toIstDateStr(r.created_at) <= dateTo);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((r) =>
      [r.full_name, r.mobile_number, r.lead_reference, r.state, r.segment, r.message]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const sliced = filtered.slice(offset, offset + limit).map((row) => {
    const t = formatIstTimeline(row.created_at);
    return {
      ...row,
      created_at_formatted: t.formatted,
      time_ago: t.timeAgo,
    };
  });

  return {
    storageMode: 'preview' as const,
    stats,
    pagination: {
      current_page: page,
      limit,
      total_items: totalItems,
      total_pages: totalPages,
      has_prev: page > 1,
      has_next: page < totalPages,
    },
    data: sliced,
  };
}

export async function getLeadById(id: number): Promise<LeadRecord | null> {
  if (isMysqlConfigured()) {
    await ensureLeadsTable();
    const db = getDbPool();
    const [rows] = await db.query('SELECT * FROM `leads` WHERE id = ? LIMIT 1', [id]);
    const row = (rows as LeadRecord[])[0];
    if (!row) return null;
    const t = formatIstTimeline(row.created_at);
    return { ...row, created_at_formatted: t.formatted, time_ago: t.timeAgo };
  }

  const allRows = await readFallbackLeads();
  const row = allRows.find((r) => r.id === id);
  if (!row) return null;
  const t = formatIstTimeline(row.created_at);
  return { ...row, created_at_formatted: t.formatted, time_ago: t.timeAgo };
}

export async function updateLeadById(
  id: number,
  updates: { status?: LeadRecord['status']; notes?: string }
): Promise<boolean> {
  if (isMysqlConfigured()) {
    await ensureLeadsTable();
    const db = getDbPool();
    const fields: string[] = [];
    const params: Array<string | number> = [];
    if (updates.status) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      params.push(updates.notes);
    }
    if (fields.length === 0) return true;
    params.push(id);
    const [res] = await db.execute(`UPDATE \`leads\` SET ${fields.join(', ')} WHERE id = ?`, params);
    return (res as { affectedRows?: number }).affectedRows === 1;
  }

  const allRows = await readFallbackLeads();
  const idx = allRows.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  if (updates.status) allRows[idx].status = updates.status;
  if (updates.notes !== undefined) allRows[idx].notes = updates.notes;
  await writeFallbackLeads(allRows);
  return true;
}

export async function deleteLeadById(id: number): Promise<boolean> {
  if (isMysqlConfigured()) {
    await ensureLeadsTable();
    const db = getDbPool();
    const [res] = await db.execute('DELETE FROM `leads` WHERE id = ?', [id]);
    return (res as { affectedRows?: number }).affectedRows === 1;
  }

  const allRows = await readFallbackLeads();
  const filtered = allRows.filter((r) => r.id !== id);
  if (filtered.length === allRows.length) return false;
  await writeFallbackLeads(filtered);
  return true;
}

