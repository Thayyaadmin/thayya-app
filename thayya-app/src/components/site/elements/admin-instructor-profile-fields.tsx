"use client";

import { PrimaryLocationField } from "@/components/auth/PrimaryLocationField";
import { Label } from "@/components/ui/label";
import type { CategoryOption } from "@/lib/categories-catalog";
import type { PrimaryLocationPayload } from "@/lib/primary-location";

const hasGoogleMapsKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());

export type AdminInstructorProfileFieldsProps = {
  fullName: string;
  onFullNameChange: (v: string) => void;
  bio: string;
  onBioChange: (v: string) => void;
  location: PrimaryLocationPayload | null;
  onLocationChange: (v: PrimaryLocationPayload | null) => void;
  initialLocation?: PrimaryLocationPayload | null;
  categoryIds: string[];
  onToggleCategory: (id: string) => void;
  categories: CategoryOption[];
  disabled?: boolean;
  locationInputId?: string;
};

export function AdminInstructorProfileFields({
  fullName,
  onFullNameChange,
  bio,
  onBioChange,
  location,
  onLocationChange,
  initialLocation = null,
  categoryIds,
  onToggleCategory,
  categories,
  disabled,
  locationInputId = "admin-instructor-location",
}: AdminInstructorProfileFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="admin-instructor-name-field">Full name</Label>
        <input
          id="admin-instructor-name-field"
          type="text"
          required
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          placeholder="Anaya Krishnan"
          disabled={disabled}
          className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-60"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-instructor-bio-field">Bio (optional)</Label>
        <textarea
          id="admin-instructor-bio-field"
          rows={3}
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
          placeholder="Short intro for their public profile"
          disabled={disabled}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {hasGoogleMapsKey ? (
        <PrimaryLocationField
          key={initialLocation?.formattedLabel ?? "new"}
          inputId={locationInputId}
          label="Primary studio location"
          description="Where they mainly teach. Used for discover map and instructor profile."
          onChange={onLocationChange}
          initialLocation={initialLocation ?? location}
          disabled={disabled}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Set <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable location search.
        </p>
      )}

      {categories.length > 0 ? (
        <fieldset className="space-y-3" disabled={disabled}>
          <legend className="text-sm font-medium text-foreground">Expertise categories</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const checked = categoryIds.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors"
                  style={{
                    borderColor: checked ? "var(--t-gold)" : "var(--line)",
                    background: checked ? "rgba(212, 160, 39, 0.12)" : "white",
                  }}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => onToggleCategory(cat.id)}
                  />
                  {cat.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}
    </>
  );
}
