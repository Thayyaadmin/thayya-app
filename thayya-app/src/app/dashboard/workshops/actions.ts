'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  postSaveWorkshopEdge,
  type SaveWorkshopGeoJsonPoint,
  type SaveWorkshopRequestBody,
} from '@/lib/save-workshop-api';

export type WorkshopActionState = { ok: boolean; error?: string };

function parsePrice(raw: FormDataEntryValue | null): number | null {
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseSlots(raw: FormDataEntryValue | null): number {
  if (raw === null || raw === '') return 20;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 1) return 20;
  return n;
}

function optionalText(raw: FormDataEntryValue | null): string | null {
  if (raw === null || raw === '') return null;
  const t = String(raw).trim();
  return t.length ? t : null;
}

function parseLocationJson(raw: FormDataEntryValue | null): SaveWorkshopGeoJsonPoint | null {
  const s = raw === null || raw === '' ? '' : String(raw).trim();
  if (!s) return null;
  try {
    const o = JSON.parse(s) as unknown;
    if (typeof o !== 'object' || o === null) return null;
    const rec = o as Record<string, unknown>;
    if (rec.type !== 'Point' || !Array.isArray(rec.coordinates)) return null;
    const c = rec.coordinates as unknown[];
    if (c.length < 2) return null;
    const lng = Number(c[0]);
    const lat = Number(c[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { type: 'Point', coordinates: [lng, lat] };
  } catch {
    return null;
  }
}

/** When the Edge Function is missing (404), save through the user JWT + RLS (same as pre–Edge-Function behaviour, extended fields). */
async function saveWorkshopThroughRls(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  body: SaveWorkshopRequestBody,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be signed in.');
  }

  const row = {
    title: body.title,
    date: body.date ?? null,
    price: body.price ?? null,
    slots: body.slots ?? 20,
    location: body.location ?? null,
    address_line: body.address_line ?? null,
    city: body.city ?? null,
    state: body.state ?? null,
    country: body.country ?? null,
  };

  if (body.intent === 'update') {
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) {
      throw new Error('Missing workshop id.');
    }
    const { error } = await supabase.from('workshops').update(row).eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profile) {
    throw new Error('Your profile is not set up yet. Please complete your profile and try again.');
  }
  if (profile.user_type !== 'instructor' && profile.user_type !== 'admin') {
    throw new Error('Only instructors can create workshops.');
  }

  const { error } = await supabase.from('workshops').insert({
    ...row,
    instructor_id: user.id,
    instructor: profile.full_name ?? 'Instructor',
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function saveWorkshop(
  _prev: WorkshopActionState,
  formData: FormData,
): Promise<WorkshopActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { ok: false, error: 'You must be signed in.' };
  }

  const intent = String(formData.get('intent') || 'create') === 'update' ? 'update' : 'create';
  const title = String(formData.get('title') || '').trim();
  if (!title) {
    return { ok: false, error: 'Title is required.' };
  }

  const dateRaw = formData.get('date');
  const date = dateRaw === null || dateRaw === '' ? null : String(dateRaw);
  const price = parsePrice(formData.get('price'));
  const slots = parseSlots(formData.get('slots'));
  const location = parseLocationJson(formData.get('location_json'));
  const venue_name = optionalText(formData.get('venue_name'));
  const address_line = optionalText(formData.get('address_line'));
  const city = optionalText(formData.get('city'));
  const state = optionalText(formData.get('state'));
  const country = optionalText(formData.get('country'));

  const baseBody: SaveWorkshopRequestBody = {
    intent,
    title,
    date,
    price,
    slots,
    location,
    venue_name,
    address_line,
    city,
    state,
    country,
  };

  const body: SaveWorkshopRequestBody =
    intent === 'update'
      ? {
          ...baseBody,
          intent: 'update',
          id: String(formData.get('id') || '').trim(),
        }
      : { ...baseBody, intent: 'create' };

  if (intent === 'update' && !body.id?.trim()) {
    return { ok: false, error: 'Missing workshop id.' };
  }

  const edge = await postSaveWorkshopEdge(session.access_token, body);
  if (edge.ok) {
    revalidatePath('/dashboard');
    return { ok: true };
  }

  /** 404 from gateway = function not deployed; 404 from our function with this exact message = real missing row. */
  const missingEdgeFn =
    edge.status === 404 && edge.message !== 'Workshop not found';

  if (missingEdgeFn) {
    try {
      await saveWorkshopThroughRls(supabase, body);
    } catch (e) {
      const hint =
        'Saving without the Edge Function failed. Deploy it with: supabase functions deploy save-workshop';
      const detail = e instanceof Error ? e.message : 'Unknown error';
      return { ok: false, error: `${detail} — ${hint}` };
    }
    revalidatePath('/dashboard');
    return { ok: true };
  }

  return { ok: false, error: edge.message };
}

export async function deleteWorkshop(workshopId: string): Promise<WorkshopActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'You must be signed in.' };
  }

  if (!workshopId) {
    return { ok: false, error: 'Missing workshop id.' };
  }

  const { error } = await supabase.from('workshops').delete().eq('id', workshopId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
