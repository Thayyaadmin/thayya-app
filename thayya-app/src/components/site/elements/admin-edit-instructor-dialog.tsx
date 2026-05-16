"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/supabaseClient";
import { AdminInstructorProfileFields } from "@/components/site/elements/admin-instructor-profile-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminUpdateInstructor,
  fetchAdminInstructor,
} from "@/lib/admin-instructors";
import { primaryLocationFromInstructor } from "@/lib/admin-instructor-location";
import type { CategoryOption } from "@/lib/categories-catalog";
import type { PrimaryLocationPayload } from "@/lib/primary-location";

type AdminEditInstructorDialogProps = {
  instructorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  onSaved: () => void;
};

export function AdminEditInstructorDialog({
  instructorId,
  open,
  onOpenChange,
  categories,
  onSaved,
}: AdminEditInstructorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState<PrimaryLocationPayload | null>(null);
  const [initialLocation, setInitialLocation] = useState<PrimaryLocationPayload | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const toggleCategory = useCallback((id: string) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }, []);

  useEffect(() => {
    if (!open || !instructorId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          if (!cancelled) setError("Your session expired. Sign in again.");
          return;
        }

        const detail = await fetchAdminInstructor(token, instructorId);
        if (cancelled) return;

        const loc = primaryLocationFromInstructor(detail);
        setEmail(detail.email);
        setFullName(detail.full_name);
        setBio(detail.bio ?? "");
        setCategoryIds(detail.category_ids ?? []);
        setLocation(loc);
        setInitialLocation(loc);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load instructor.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, instructorId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instructorId) return;

    setError(null);
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }
    if (!location) {
      setError("Select a primary studio location from the address search.");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Your session expired. Sign in again.");
        return;
      }

      await adminUpdateInstructor(token, {
        intent: "update",
        user_id: instructorId,
        full_name: trimmedName,
        bio: bio.trim() || null,
        primary_location: location.primary_location,
        address_line: location.address_line,
        city: location.city,
        state: location.state,
        country: location.country,
        category_ids: categoryIds,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit instructor</DialogTitle>
          <DialogDescription>
            {email ? (
              <>
                Account: <span className="text-foreground">{email}</span>
              </>
            ) : (
              "Update profile, location, and expertise categories."
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6">Loading profile…</p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            {error ? (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            ) : null}

            <AdminInstructorProfileFields
              fullName={fullName}
              onFullNameChange={setFullName}
              bio={bio}
              onBioChange={setBio}
              location={location}
              onLocationChange={setLocation}
              initialLocation={initialLocation}
              categoryIds={categoryIds}
              onToggleCategory={toggleCategory}
              categories={categories}
              disabled={submitting}
              locationInputId="admin-edit-instructor-location"
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
