/**
 * Supabase مزيّف في الذاكرة لاختبارات الدفع — يكفي سلاسل الاستعلام التي
 * يستعملها الكود فعليًا: select/insert/update مع eq/neq/in/order/limit
 * و maybeSingle، و rpc مسجَّلة. يطبّق القيود الفريدة المذكورة له، فيرد
 * 23505 كما ترد القاعدة الحقيقية.
 */

import { randomUUID } from "node:crypto";

export type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

export interface UniqueRule {
  table: string;
  /** هل يتعارض الصفان؟ (يُستدعى لكل زوج مختلف) */
  conflict: (a: Row, b: Row) => boolean;
}

export interface FakeOptions {
  defaults?: Record<string, () => Row>;
  unique?: UniqueRule[];
  rpc?: Record<string, (args: Row) => unknown>;
}

export interface FakeSupabase {
  tables: Record<string, Row[]>;
  /** كل استعلام بالترتيب: اسم الجدول والعملية. */
  log: Array<{ table: string; op: string }>;
  rpcCalls: Array<{ name: string; args: Row }>;
  from(table: string): QueryBuilder;
  rpc(name: string, args: Row): Promise<{ data: unknown; error: unknown }>;
}

class QueryBuilder implements PromiseLike<{ data: unknown; error: unknown }> {
  private op: "select" | "insert" | "update" = "select";
  private filters: Filter[] = [];
  private payload: Row | Row[] | null = null;
  private returning = false;
  private single = false;
  private max: number | null = null;
  private sort: { column: string; ascending: boolean } | null = null;

  constructor(
    private readonly fake: FakeSupabase,
    private readonly table: string,
    private readonly options: FakeOptions,
  ) {}

  select(_columns?: string) {
    if (this.op === "select") return this;
    this.returning = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = rows;
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.payload = patch;
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.sort = { column, ascending: options?.ascending ?? true };
    return this;
  }
  limit(count: number) {
    this.max = count;
    return this;
  }
  maybeSingle() {
    this.single = true;
    return this;
  }

  then<A = { data: unknown; error: unknown }, B = never>(
    resolve?: ((value: { data: unknown; error: unknown }) => A | PromiseLike<A>) | null,
    reject?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.execute()).then(resolve, reject);
  }

  private rows(): Row[] {
    this.fake.tables[this.table] ??= [];
    return this.fake.tables[this.table];
  }

  private violates(candidate: Row, ignore?: Row): boolean {
    return (this.options.unique ?? [])
      .filter((rule) => rule.table === this.table)
      .some((rule) => this.rows().some((other) => other !== ignore && other !== candidate && rule.conflict(candidate, other)));
  }

  private execute(): { data: unknown; error: unknown } {
    this.fake.log.push({ table: this.table, op: this.op });
    const duplicate = { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };

    if (this.op === "insert") {
      const inserted: Row[] = [];
      for (const raw of Array.isArray(this.payload) ? this.payload : [this.payload as Row]) {
        const row = { ...(this.options.defaults?.[this.table]?.() ?? {}), ...raw };
        if (this.violates(row)) return duplicate;
        this.rows().push(row);
        inserted.push(row);
      }
      const data = this.returning ? inserted.map((row) => ({ ...row })) : null;
      return { data: this.single ? (data as Row[] | null)?.[0] ?? null : data, error: null };
    }

    let matched = this.rows().filter((row) => this.filters.every((filter) => filter(row)));

    if (this.op === "update") {
      const patch = this.payload as Row;
      for (const row of matched) {
        const next = { ...row, ...patch };
        if (this.violates(next, row)) return duplicate;
      }
      for (const row of matched) Object.assign(row, patch);
      const data = this.returning ? matched.map((row) => ({ ...row })) : null;
      return { data, error: null };
    }

    if (this.sort) {
      const { column, ascending } = this.sort;
      matched = [...matched].sort((a, b) => {
        const left = String(a[column] ?? "");
        const right = String(b[column] ?? "");
        return ascending ? left.localeCompare(right) : right.localeCompare(left);
      });
    }
    if (this.max !== null) matched = matched.slice(0, this.max);
    const copies = matched.map((row) => ({ ...row }));
    return { data: this.single ? copies[0] ?? null : copies, error: null };
  }
}

export function createFakeSupabase(options: FakeOptions = {}): FakeSupabase {
  const fake: FakeSupabase = {
    tables: {},
    log: [],
    rpcCalls: [],
    from(table: string) {
      return new QueryBuilder(fake, table, options);
    },
    async rpc(name: string, args: Row) {
      fake.rpcCalls.push({ name, args });
      const handler = options.rpc?.[name];
      if (!handler) return { data: null, error: { message: "unknown rpc" } };
      /* المعالج يرمي = الدالة ترفع استثناء: كالقاعدة، خطأ برسالته ورمزه. */
      try {
        return { data: handler(args), error: null };
      } catch (error) {
        const failure = error as { message?: string; code?: string };
        return { data: null, error: { message: failure.message ?? "rpc failed", code: failure.code ?? "P0001" } };
      }
    },
  };
  return fake;
}

let clock = Date.parse("2026-10-04T08:00:00Z");

/** القيم الافتراضية لعمود طلب الضيف كما في الترحيل. */
export function guestOrderDefaults(): Row {
  clock += 1000;
  return {
    id: randomUUID(),
    idempotency_key: randomUUID(),
    status: "created",
    provider_payment_id: null,
    provider_checkout_url: null,
    checkout_expires_at: null,
    paid_at: null,
    failed_at: null,
    refunded_at: null,
    refunded_amount: 0,
    failure_code: "",
    duplicate_of: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    course_title_snapshot: "",
    currency: "SAR",
    tax_amount: 0,
    created_at: new Date(clock).toISOString(),
    updated_at: new Date(clock).toISOString(),
  };
}

const OPEN = ["created", "pending", "authorized"];

/** القيود الفريدة من ترحيلَي الدفع والضيوف. */
export const PAYMENT_UNIQUE_RULES: UniqueRule[] = [
  {
    table: "guest_course_orders",
    conflict: (a, b) =>
      a.provider_payment_id !== null &&
      a.provider === b.provider &&
      a.provider_payment_id === b.provider_payment_id,
  },
  {
    table: "guest_course_orders",
    conflict: (a, b) =>
      OPEN.includes(String(a.status)) &&
      OPEN.includes(String(b.status)) &&
      a.course_id === b.course_id &&
      a.email === b.email,
  },
  { table: "guest_course_orders", conflict: (a, b) => a.idempotency_key === b.idempotency_key },
  {
    table: "payment_webhook_events",
    conflict: (a, b) => a.provider === b.provider && a.event_id === b.event_id,
  },
];
