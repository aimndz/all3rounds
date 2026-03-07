import { z } from "zod";

// ============================================================================
// Reusable Primitives
// ============================================================================

export const uuidSchema = z.string().uuid("Invalid ID");

export const uuidArraySchema = z
  .array(z.string().uuid("Invalid ID"))
  .min(1, "At least one ID is required");

export const contentSchema = z
  .string()
  .min(1, "Content cannot be empty")
  .max(5000, "Content too long");

export const battleStatusSchema = z.enum(
  ["raw", "arranged", "reviewing", "reviewed", "excluded"],
  { message: "Invalid status" },
);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
