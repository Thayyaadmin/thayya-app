"use client";

import { useState } from "react";

import { supabase } from "@/app/supabaseClient";
import { StarRating } from "@/components/site/atoms/StarRating";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { postSubmitWorkshopReviewEdge } from "@/lib/submit-workshop-review-api";

type WorkshopReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshopId: string;
  workshopTitle: string;
  initialRating?: number | null;
  onSubmitted: (rating: number) => void;
};

export function WorkshopReviewDialog({
  open,
  onOpenChange,
  workshopId,
  workshopTitle,
  initialRating = null,
  onSubmitted,
}: WorkshopReviewDialogProps) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setRating(initialRating ?? 0);
      setError(null);
    }
    onOpenChange(next);
  };

  async function handleSubmit() {
    if (rating < 1 || rating > 5) {
      setError("Please select a rating from 1 to 5 stars.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Sign in to rate this workshop.");
      setSubmitting(false);
      return;
    }

    const result = await postSubmitWorkshopReviewEdge(
      session.access_token,
      workshopId,
      rating,
    );

    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onSubmitted(result.rating);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Rate this class</DialogTitle>
          <DialogDescription>
            How was <span className="font-medium text-foreground">{workshopTitle}</span>?
            Your rating helps other members find great instructors.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-4">
          <StarRating value={rating} size="md" onChange={setRating} />
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            {rating > 0 ? `${rating} out of 5` : "Tap a star to rate"}
          </p>
        </div>

        {error ? (
          <p className="text-sm" style={{ color: "var(--t-red)" }} role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="gradient-bg-warm border-0 text-white"
            onClick={() => void handleSubmit()}
            disabled={submitting || rating < 1}
          >
            {submitting ? "Saving…" : initialRating ? "Update rating" : "Submit rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
