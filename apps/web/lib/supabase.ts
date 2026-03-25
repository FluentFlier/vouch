import { createClient } from '@insforge/sdk';

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? '';
const serviceKey = process.env.INSFORGE_SERVICE_KEY ?? '';

export const supabase = createClient({ baseUrl, anonKey });
export const supabaseAdmin = createClient({ baseUrl, anonKey: serviceKey });
