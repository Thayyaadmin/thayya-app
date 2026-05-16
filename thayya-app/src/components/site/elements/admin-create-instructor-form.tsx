"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/app/supabaseClient";
import { AdminInstructorProfileFields } from "@/components/site/elements/admin-instructor-profile-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminCreateInstructor } from "@/lib/admin-create-instructor";
import type { CategoryOption } from "@/lib/categories-catalog";
import type { PrimaryLocationPayload } from "@/lib/primary-location";

export type { CategoryOption };

type AdminCreateInstructorFormProps = {
  categories: CategoryOption[];
  onCreated?: () => void;
};

export function AdminCreateInstructorForm({ categories, onCreated }: AdminCreateInstructorFormProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState<PrimaryLocationPayload | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [sendInvite, setSendInvite] = useState(true);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleCategory = useCallback((id: string) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }, []);

  const resetForm = useCallback(() => {
    setEmail("");
    setFullName("");
    setBio("");
    setLocation(null);
    setCategoryIds([]);
    setSendInvite(true);
    setPassword("");
    setError(null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();

    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }
    if (!location) {
      setError("Select a primary studio location from the address search.");
      return;
    }
    if (!sendInvite && password.length < 8) {
      setError("Password must be at least 8 characters when not sending an invite.");
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

      const result = await adminCreateInstructor(token, {
        intent: "create",
        email: trimmedEmail,
        full_name: trimmedName,
        bio: bio.trim() || null,
        primary_location: location.primary_location,
        address_line: location.address_line,
        city: location.city,
        state: location.state,
        country: location.country,
        category_ids: categoryIds,
        send_invite: sendInvite,
        ...(sendInvite ? {} : { password }),
      });

      const slug = typeof result.slug === "string" ? result.slug : null;
      const invited = result.invited === true;
      setSuccess(
        invited
          ? `Invite sent to ${trimmedEmail}.${slug ? ` Profile slug: ${slug}.` : ""}`
          : `Instructor account created for ${trimmedEmail}.${slug ? ` Slug: ${slug}.` : ""}`,
      );
      resetForm();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create instructor.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasGoogleMapsKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {error ? (
        <p
          className="rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: "var(--t-orange)", color: "var(--t-orange)", background: "rgba(232,93,58,0.08)" }}
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: "var(--t-teal)", color: "var(--t-teal)", background: "rgba(31,169,160,0.08)" }}
          role="status"
        >
          {success}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="admin-instructor-email">Email</Label>
        <Input
          id="admin-instructor-email"
          type="email"
          autoComplete="off"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="instructor@example.com"
          disabled={submitting}
        />
      </div>

      <AdminInstructorProfileFields
        fullName={fullName}
        onFullNameChange={setFullName}
        bio={bio}
        onBioChange={setBio}
        location={location}
        onLocationChange={setLocation}
        categoryIds={categoryIds}
        onToggleCategory={toggleCategory}
        categories={categories}
        disabled={submitting}
        locationInputId="admin-create-instructor-location"
      />

      <div className="space-y-4 rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "white" }}>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={sendInvite}
            onChange={(e) => setSendInvite(e.target.checked)}
            disabled={submitting}
          />
          <span className="text-sm">
            <span className="font-medium text-foreground">Send email invite</span>
            <span className="mt-0.5 block text-muted-foreground">
              Recommended. They set their own password via the invite link.
            </span>
          </span>
        </label>
        {!sendInvite ? (
          <div className="space-y-2">
            <Label htmlFor="admin-instructor-password">Temporary password</Label>
            <Input
              id="admin-instructor-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={submitting}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={submitting || !hasGoogleMapsKey}>
          {submitting ? "Creating…" : "Create instructor"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => {
            resetForm();
            setSuccess(null);
          }}
        >
          Clear form
        </Button>
      </div>
    </form>
  );
}

