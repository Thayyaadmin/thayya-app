"use client"

import { useActionState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveWorkshop, type WorkshopActionState } from "@/app/dashboard/workshops/actions"
import type { WorkshopRow } from "@/components/dashboard/workshops-table"

const initialState: WorkshopActionState = { ok: false }

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type WorkshopFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initial?: WorkshopRow | null
  /** Signed-in instructor name (create mode: stored automatically, not free-typed). */
  defaultInstructorName?: string
  onSuccess?: () => void
}

export function WorkshopFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  defaultInstructorName = "",
  onSuccess,
}: WorkshopFormDialogProps) {
  const [state, formAction, isPending] = useActionState(saveWorkshop, initialState)

  const defaultDate = useMemo(
    () => (mode === "edit" && initial?.dateIso ? toDatetimeLocalValue(initial.dateIso) : ""),
    [mode, initial]
  )

  useEffect(() => {
    if (state.ok) {
      onSuccess?.()
      onOpenChange(false)
    }
  }, [state.ok, onOpenChange, onSuccess])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add workshop" : "Edit workshop"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new workshop. It will appear in the table for learners."
              : "Update this workshop’s details."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4 py-2">
          <input type="hidden" name="intent" value={mode === "create" ? "create" : "update"} />
          {mode === "edit" && initial ? (
            <input type="hidden" name="id" value={initial.id} />
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="wf-title">Title</Label>
            <Input
              id="wf-title"
              name="title"
              required
              defaultValue={mode === "edit" ? initial?.name : undefined}
              placeholder="Workshop title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={mode === "create" ? "wf-instructor-display" : "wf-instructor"}>
              Instructor
            </Label>
            {mode === "create" ? (
              <>
                <input type="hidden" name="instructor" value={defaultInstructorName} />
                <p
                  id="wf-instructor-display"
                  className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
                >
                  {defaultInstructorName || "—"}
                </p>
                <p className="text-xs text-muted-foreground">From your signed-in account.</p>
              </>
            ) : (
              <Input
                id="wf-instructor"
                name="instructor"
                defaultValue={
                  initial?.instructor && initial.instructor !== "—" ? initial.instructor : undefined
                }
                placeholder="Instructor name"
              />
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="wf-date">Date & time</Label>
            <Input
              id="wf-date"
              name="date"
              type="datetime-local"
              defaultValue={defaultDate}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="wf-price">Price (₹)</Label>
            <Input
              id="wf-price"
              name="price"
              type="number"
              min={0}
              step={1}
              defaultValue={
                mode === "edit" && initial?.price !== null && initial?.price !== undefined
                  ? String(initial.price)
                  : undefined
              }
              placeholder="Optional"
            />
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : mode === "create" ? "Create" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
