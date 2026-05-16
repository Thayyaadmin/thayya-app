"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { supabase } from "@/app/supabaseClient";
import { postMarkWorkshopAttendance } from "@/lib/mark-workshop-attendance-api";

type MemberCheckInButtonProps = {
  workshopId: string;
  attended: boolean;
  canMarkAttendance: boolean;
  onAttendedChange: (attended: boolean) => void;
  className?: string;
};

export function MemberCheckInButton({
  workshopId,
  attended,
  canMarkAttendance,
  onAttendedChange,
  className = "",
}: MemberCheckInButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canMarkAttendance) {
    return null;
  }

  async function handleCheckIn() {
    setSubmitting(true);
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Sign in to check in.");
      setSubmitting(false);
      return;
    }

    const result = await postMarkWorkshopAttendance(
      session.access_token,
      workshopId,
      !attended,
    );
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onAttendedChange(result.attended);
  }

  if (attended) {
    return (
      <div className={`flex flex-col items-start gap-1 sm:items-center ${className}`}>
        <span
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold"
          style={{ background: "rgba(31,169,160,0.12)", color: "var(--t-teal)" }}
        >
          <Check className="h-3.5 w-3.5" />
          Checked in
        </span>
        <button
          type="button"
          className="text-xs font-medium underline-offset-2 hover:underline"
          style={{ color: "var(--ink-soft)" }}
          disabled={submitting}
          onClick={() => void handleCheckIn()}
        >
          Undo check-in
        </button>
        {error ? (
          <p className="text-xs" style={{ color: "var(--t-red)" }} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-start gap-1 sm:items-center ${className}`}>
      <button
        type="button"
        className="rounded-full border px-4 py-2 text-sm font-bold"
        style={{ borderColor: "var(--line)", background: "white" }}
        disabled={submitting}
        onClick={() => void handleCheckIn()}
      >
        {submitting ? "Checking in…" : "Check in"}
      </button>
      {error ? (
        <p className="text-xs" style={{ color: "var(--t-red)" }} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
