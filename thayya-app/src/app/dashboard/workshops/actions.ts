'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type WorkshopActionState = { ok: boolean; error?: string };

function parsePrice(raw: FormDataEntryValue | null): number | null {
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function saveWorkshop(
  _prev: WorkshopActionState,
  formData: FormData
): Promise<WorkshopActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'You must be signed in.' };
  }

  const intent = String(formData.get('intent') || 'create');
  const title = String(formData.get('title') || '').trim();
  if (!title) {
    return { ok: false, error: 'Title is required.' };
  }

  const dateRaw = formData.get('date');
  const date = dateRaw === null || dateRaw === '' ? null : String(dateRaw);
  const price = parsePrice(formData.get('price'));

  if (intent === 'update') {
    const id = String(formData.get('id') || '').trim();
    if (!id) {
      return { ok: false, error: 'Missing workshop id.' };
    }

    // instructor_id is fixed at creation time (enforced by trigger + RLS) — we never
    // include it in update payloads.
    const { error } = await supabase
      .from('workshops')
      .update({ title, date, price })
      .eq('id', id);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return { ok: true };
  }

  // Create: enforce that the caller is an instructor (or admin) and stamp them
  // as the workshop's instructor. RLS double-checks this server-side.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }
  if (!profile) {
    return {
      ok: false,
      error: 'Your profile is not set up yet. Please complete your profile and try again.',
    };
  }
  if (profile.user_type !== 'instructor' && profile.user_type !== 'admin') {
    return {
      ok: false,
      error: 'Only instructors can create workshops.',
    };
  }

  const { error } = await supabase.from('workshops').insert({
    title,
    date,
    price,
    instructor_id: user.id,
    // Keep the legacy text column in sync for any code/queries that still
    // read it directly. Read paths should prefer the joined profile name.
    instructor: profile.full_name,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { ok: true };
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

  // RLS limits the row set to ones the caller owns, so this is both
  // safe and self-scoping.
  const { error } = await supabase.from('workshops').delete().eq('id', workshopId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
