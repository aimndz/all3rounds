import { D1CompatClient } from "@/db/compat";

export async function createClient(): Promise<D1CompatClient> {
  return new D1CompatClient();
}

export function createPublicClient(): D1CompatClient {
  return new D1CompatClient();
}

export function createAdminClient(): D1CompatClient {
  return new D1CompatClient();
}
