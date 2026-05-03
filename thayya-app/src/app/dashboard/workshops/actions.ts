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

  const instructorRaw = String(formData.get('instructor') || '').trim();
  const instructor = instructorRaw || null;
  const dateRaw = formData.get('date');
  const date =
    dateRaw === null || dateRaw === '' ? null : String(dateRaw);
  const price = parsePrice(formData.get('price'));

  if (intent === 'update') {
    const id = String(formData.get('id') || '').trim();
    if (!id) {
      return { ok: false, error: 'Missing workshop id.' };
    }

    const { error } = await supabase
      .from('workshops')
      .update({ title, instructor, date, price })
      .eq('id', id);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return { ok: true };
  }

  const { error } = await supabase
    .from('workshops')
    .insert({ title, instructor, date, price });

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

  const { error } = await supabase.from('workshops').delete().eq('id', workshopId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
