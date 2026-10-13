import { vi } from "vitest";

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });

const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  execute: vi.fn().mockResolvedValue({ data: [], error: null }),
});

const mockRpc = vi.fn().mockReturnValue({
  range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
});

const mockD1Client = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
  rpc: mockRpc,
};

export const createClient = vi.fn().mockResolvedValue(mockD1Client);
export const createAdminClient = vi.fn().mockReturnValue(mockD1Client);

export const __mocks = {
  D1Client: mockD1Client,
  getUser: mockGetUser,
  from: mockFrom,
  rpc: mockRpc,
};
