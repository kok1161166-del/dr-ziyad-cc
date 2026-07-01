import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

// The supabase-js query builder has two categories:
//   Base ops  – create the query (select / insert / update / delete / upsert)
//   Chain ops – add filters, ordering, etc.  (eq, order, single, …)
// The first base op creates the query builder; subsequent base-ops that are
// *filter-like* (select after insert) call .select() on the existing builder.

const BASE_OPS = new Set(["select", "insert", "update", "delete", "upsert"]);

router.post("/db", async (req, res): Promise<any> => {
  try {
    const { table, ops } = req.body;
    if (!table || !ops || !Array.isArray(ops)) {
      return res.status(400).json({ error: "table and ops[] required" });
    }

    // RPC shortcut
    const rpcOp = ops.find(o => o.op === "rpc");
    if (rpcOp) {
      const result = await supabase.rpc(rpcOp.args[0], rpcOp.args[1] || {});
      if (result.error) return res.status(500).json({ error: result.error.message });
      return res.json({ data: result.data });
    }

    let query: any = null;
    let mode: string | null = null; // "select" | "insert" | "update" | "delete" | "upsert"

    for (const op of ops) {
      if (!query) {
        // First base op – create the query
        switch (op.op) {
          case "select":
            mode = "select";
            query = supabase.from(table).select(op.args[0] || "*", op.args[1] || {});
            break;
          case "insert":
            mode = "insert";
            query = supabase.from(table).insert(op.args[0]);
            break;
          case "update":
            mode = "update";
            query = supabase.from(table).update(op.args[0]);
            break;
          case "delete":
            mode = "delete";
            query = supabase.from(table).delete();
            break;
          case "upsert":
            mode = "upsert";
            query = supabase.from(table).upsert(op.args[0]);
            break;
          default:
            return res.status(400).json({ error: `Expected base op first, got ${op.op}` });
        }
        continue;
      }

      // ----- chain ops (query already exists) -----
      if (BASE_OPS.has(op.op)) {
        // .select() after a mutation → enables returning rows
        if ((op.op === "select") && mode && mode !== "select") {
          query = query.select();
          continue;
        }
        // Duplicate base op (e.g. a second select) – ignore or error?
        // In practice this shouldn't happen; skip silently.
        continue;
      }

      switch (op.op) {
        case "eq": query = query.eq(op.args[0], op.args[1]); break;
        case "neq": query = query.neq(op.args[0], op.args[1]); break;
        case "gt": query = query.gt(op.args[0], op.args[1]); break;
        case "gte": query = query.gte(op.args[0], op.args[1]); break;
        case "lt": query = query.lt(op.args[0], op.args[1]); break;
        case "lte": query = query.lte(op.args[0], op.args[1]); break;
        case "like": query = query.like(op.args[0], op.args[1]); break;
        case "ilike": query = query.ilike(op.args[0], op.args[1]); break;
        case "is": query = query.is(op.args[0], op.args[1]); break;
        case "not": query = query.not(op.args[0], op.args[1], op.args[2]); break;
        case "or": query = query.or(op.args[0]); break;
        case "in": query = query.in(op.args[0], op.args[1]); break;
        case "contains": query = query.contains(op.args[0], op.args[1]); break;
        case "containedBy": query = query.containedBy(op.args[0], op.args[1]); break;
        case "order": query = query.order(op.args[0], op.args[1] || {}); break;
        case "limit": query = query.limit(op.args[0]); break;
        case "range": query = query.range(op.args[0], op.args[1]); break;
        case "single": query = query.single(); break;
        case "maybeSingle": query = query.maybeSingle(); break;
        case "textSearch": break;
        default:
          return res.status(400).json({ error: `Unknown op: ${op.op}` });
      }
    }

    if (!query) {
      return res.status(400).json({ error: "No valid ops sent" });
    }

    const result = await query;

    if (result.error) {
      return res.status(500).json({ error: result.error.message, details: result.error });
    }

    res.json({ data: result.data, count: result.count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
