// Supabase proxy — routes all calls through /api/db (API server) so the
// service_role key is never exposed in the browser.  Keeps the same chaining
// API as @supabase/supabase-js by building an operations array and sending it
// to the server where it is executed against the real supabase client.

type Op = { op: string; args: any[] };

type QbResult = { data: any; error: any; count?: number };

class Qb implements PromiseLike<QbResult> {
  private _table: string;
  private _ops: Op[] = [];

  constructor(table: string) { this._table = table; }

  private _add(op: string, ...args: any[]) { this._ops.push({ op, args }); return this; }

  select(q?: string, opts?: any) { return this._add("select", q ?? "*", opts); }
  insert(d: any) { return this._add("insert", d); }
  update(d: any) { return this._add("update", d); }
  delete() { return this._add("delete"); }
  upsert(d: any) { return this._add("upsert", d); }

  eq(a: any, b: any) { return this._add("eq", a, b); }
  neq(a: any, b: any) { return this._add("neq", a, b); }
  gt(a: any, b: any) { return this._add("gt", a, b); }
  gte(a: any, b: any) { return this._add("gte", a, b); }
  lt(a: any, b: any) { return this._add("lt", a, b); }
  lte(a: any, b: any) { return this._add("lte", a, b); }
  like(a: any, b: any) { return this._add("like", a, b); }
  ilike(a: any, b: any) { return this._add("ilike", a, b); }
  is(a: any, b: any) { return this._add("is", a, b); }
  not(a: any, b: any, c: any) { return this._add("not", a, b, c); }
  or(q: string) { return this._add("or", q); }
  in(a: any, b: any[]) { return this._add("in", a, b); }
  contains(a: any, b: any) { return this._add("contains", a, b); }
  containedBy(a: any, b: any) { return this._add("containedBy", a, b); }
  order(c: string, o?: any) { return this._add("order", c, o ?? {}); }
  limit(n: number) { return this._add("limit", n); }
  range(f: number, t: number) { return this._add("range", f, t); }
  single() { return this._add("single"); }
  maybeSingle() { return this._add("maybeSingle"); }
  textSearch() { return this; }
  csv() { return this; }

  private async _exec(): Promise<QbResult> {
    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: this._table, ops: this._ops }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = JSON.parse(text); if (j.error) msg = j.error; } catch { /* ignore parse failure */ }
        return { data: null, error: new Error(msg) };
      }
      if (!text) return { data: null, error: new Error(`Empty response (${res.status})`) };
      const json = JSON.parse(text);
      if (json.error) return { data: null, error: new Error(json.error), count: json.count };
      return { data: json.data, error: null, count: json.count };
    } catch (e: any) {
      return { data: null, error: e, count: undefined };
    }
  }

  then<T1 = QbResult, T2 = never>(
    onfulfilled?: ((v: QbResult) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((r: any) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return this._exec().then(onfulfilled as any, onrejected as any);
  }
}

// Lightweight fake channel for compatibility
class FakeChannel {
  on(_ev: string, _cfg: any, _cb: any) { return this; }
  subscribe() { return { unsubscribe() {} }; }
}

async function _rpc(fn: string, args: any): Promise<QbResult> {
  try {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "__rpc__", ops: [{ op: "rpc", args: [fn, args] }] }),
    });
    const json = await res.json();
    if (json.error) return { data: null, error: new Error(json.error) };
    return { data: json.data, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

export const supabase = {
  from(t: string) { return new Qb(t); },
  rpc(fn: string, args: any = {}) { return _rpc(fn, args); },
  channel(_n: string) { return new FakeChannel() as any; },
  removeChannel(ch: any) { if (ch?.unsubscribe) ch.unsubscribe(); },
  removeAllChannels() {},
  getChannels() { return []; },
};
