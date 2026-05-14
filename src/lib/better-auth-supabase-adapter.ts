import {
  createAdapterFactory,
  type CleanedWhere,
  type CustomAdapter,
} from "better-auth/adapters";
import { createAdminClient } from "@/lib/supabase/server";

type SupabaseQuery = {
  eq: (field: string, value: unknown) => SupabaseQuery;
  neq: (field: string, value: unknown) => SupabaseQuery;
  lt: (field: string, value: unknown) => SupabaseQuery;
  lte: (field: string, value: unknown) => SupabaseQuery;
  gt: (field: string, value: unknown) => SupabaseQuery;
  gte: (field: string, value: unknown) => SupabaseQuery;
  in: (field: string, value: string[] | number[]) => SupabaseQuery;
  not: (field: string, operator: string, value: string) => SupabaseQuery;
  like: (field: string, pattern: string) => SupabaseQuery;
  ilike: (field: string, pattern: string) => SupabaseQuery;
  or: (filters: string) => SupabaseQuery;
};

function tableForModel(model: string) {
  return model;
}

function cleanData(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
}

function formatValue(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value as string | number | boolean | null;
}

function applyWhere<T>(
  query: T,
  where: CleanedWhere[] | undefined,
): T {
  if (!where?.length) {
    return query;
  }

  const andWhere = where.filter((item) => item.connector !== "OR");
  const orWhere = where.filter((item) => item.connector === "OR");
  let nextQuery = query as unknown as SupabaseQuery;

  for (const item of andWhere) {
    const value = formatValue(item.value);
    switch (item.operator) {
      case "eq":
        nextQuery = nextQuery.eq(item.field, value);
        break;
      case "ne":
        nextQuery = nextQuery.neq(item.field, value);
        break;
      case "lt":
        nextQuery = nextQuery.lt(item.field, value);
        break;
      case "lte":
        nextQuery = nextQuery.lte(item.field, value);
        break;
      case "gt":
        nextQuery = nextQuery.gt(item.field, value);
        break;
      case "gte":
        nextQuery = nextQuery.gte(item.field, value);
        break;
      case "in":
        nextQuery = nextQuery.in(item.field, item.value as string[] | number[]);
        break;
      case "not_in":
        nextQuery = nextQuery.not(
          item.field,
          "in",
          `(${(item.value as string[] | number[]).join(",")})`,
        );
        break;
      case "contains":
        nextQuery =
          item.mode === "insensitive"
            ? nextQuery.ilike(item.field, `%${item.value}%`)
            : nextQuery.like(item.field, `%${item.value}%`);
        break;
      case "starts_with":
        nextQuery =
          item.mode === "insensitive"
            ? nextQuery.ilike(item.field, `${item.value}%`)
            : nextQuery.like(item.field, `${item.value}%`);
        break;
      case "ends_with":
        nextQuery =
          item.mode === "insensitive"
            ? nextQuery.ilike(item.field, `%${item.value}`)
            : nextQuery.like(item.field, `%${item.value}`);
        break;
    }
  }

  if (orWhere.length) {
    const filters = orWhere.map((item) => {
      if (item.operator !== "eq") {
        throw new Error(`Unsupported OR operator: ${item.operator}`);
      }
      return `${item.field}.eq.${String(formatValue(item.value))}`;
    });
    nextQuery = nextQuery.or(filters.join(","));
  }

  return nextQuery as unknown as T;
}

function throwIfError(error: unknown) {
  if (error) {
    throw error;
  }
}

export const supabaseBetterAuthAdapter = createAdapterFactory({
  config: {
    adapterId: "supabase-rest",
    adapterName: "Supabase REST",
    supportsBooleans: true,
    supportsDates: false,
    supportsJSON: false,
    supportsNumericIds: false,
    supportsUUIDs: true,
    transaction: false,
  },
  adapter: (): CustomAdapter => ({
    async create<T extends Record<string, unknown>>({
      model,
      data,
      select,
    }: {
      model: string;
      data: T;
      select?: string[];
    }): Promise<T> {
      const supabase = createAdminClient();
      const columns = select?.length ? select.join(",") : "*";
      const { data: row, error } = await supabase
        .from(tableForModel(model))
        .insert(cleanData(data))
        .select(columns)
        .single();

      throwIfError(error);
      return row as unknown as T;
    },

    async findOne<T>({
      model,
      where,
      select,
    }: {
      model: string;
      where: CleanedWhere[];
      select?: string[];
    }): Promise<T | null> {
      const supabase = createAdminClient();
      const columns = select?.length ? select.join(",") : "*";
      let query = supabase.from(tableForModel(model)).select(columns);
      query = applyWhere(query, where);

      const { data, error } = await query.maybeSingle();
      throwIfError(error);
      return data as T | null;
    },

    async findMany<T>({
      model,
      where,
      limit,
      select,
      sortBy,
      offset,
    }: {
      model: string;
      where?: CleanedWhere[];
      limit: number;
      select?: string[];
      sortBy?: { field: string; direction: "asc" | "desc" };
      offset?: number;
    }): Promise<T[]> {
      const supabase = createAdminClient();
      const columns = select?.length ? select.join(",") : "*";
      let query = supabase.from(tableForModel(model)).select(columns);
      query = applyWhere(query, where);

      if (sortBy) {
        query = query.order(sortBy.field, {
          ascending: sortBy.direction === "asc",
        });
      }

      const from = offset ?? 0;
      const to = from + limit - 1;
      const { data, error } = await query.range(from, to);

      throwIfError(error);
      return (data ?? []) as T[];
    },

    async count({ model, where }) {
      const supabase = createAdminClient();
      let query = supabase
        .from(tableForModel(model))
        .select("*", { count: "exact", head: true });
      query = applyWhere(query, where);

      const { count, error } = await query;
      throwIfError(error);
      return count ?? 0;
    },

    async update({ model, where, update }) {
      const supabase = createAdminClient();
      let query = supabase
        .from(tableForModel(model))
        .update(cleanData(update as Record<string, unknown>))
        .select("*");
      query = applyWhere(query, where);

      const { data, error } = await query.maybeSingle();
      throwIfError(error);
      return data;
    },

    async updateMany({ model, where, update }) {
      const supabase = createAdminClient();
      let query = supabase
        .from(tableForModel(model))
        .update(cleanData(update))
        .select("id");
      query = applyWhere(query, where);

      const { data, error } = await query;
      throwIfError(error);
      return data?.length ?? 0;
    },

    async delete({ model, where }) {
      const supabase = createAdminClient();
      let query = supabase.from(tableForModel(model)).delete();
      query = applyWhere(query, where);

      const { error } = await query;
      throwIfError(error);
    },

    async deleteMany({ model, where }) {
      const supabase = createAdminClient();
      let query = supabase.from(tableForModel(model)).delete().select("id");
      query = applyWhere(query, where);

      const { data, error } = await query;
      throwIfError(error);
      return data?.length ?? 0;
    },

    async consumeOne({ model, where }) {
      const supabase = createAdminClient();
      let findQuery = supabase.from(tableForModel(model)).select("*");
      findQuery = applyWhere(findQuery, where);
      const { data: row, error: findError } = await findQuery.limit(1).maybeSingle();
      throwIfError(findError);

      if (!row) {
        return null;
      }

      const id = (row as { id?: string }).id;
      if (!id) {
        return null;
      }

      const { error: deleteError } = await supabase
        .from(tableForModel(model))
        .delete()
        .eq("id", id);
      throwIfError(deleteError);

      return row;
    },
  }),
});
