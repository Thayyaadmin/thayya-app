"use client"

import { useActionState, useEffect, useMemo, useState } from "react"
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
import { PrimaryLocationField } from "@/components/auth/PrimaryLocationField"
import type { PrimaryLocationPayload } from "@/lib/primary-location"

const initialState: WorkshopActionState = { ok: false }

const hasGoogleMapsKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim())

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Addr = {
  venue_name: string
  address_line: string
  city: string
  state: string
  country: string
}

const emptyAddr: Addr = { venue_name: "", address_line: "", city: "", state: "", country: "" }

type WorkshopVenuePoint = PrimaryLocationPayload["primary_location"]

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
  const [venuePoint, setVenuePoint] = useState<WorkshopVenuePoint | null>(null)
  const [addr, setAddr] = useState<Addr>(emptyAddr)
  const [slots, setSlots] = useState(20)

  const defaultDate = useMemo(
    () => (mode === "edit" && initial?.dateIso ? toDatetimeLocalValue(initial.dateIso) : ""),
    [mode, initial?.dateIso],
  )

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && initial) {
      setSlots(initial.slots)
      setAddr({
        venue_name: initial.venue_name ?? "",
        address_line: initial.address_line ?? "",
        city: initial.city ?? "",
        state: initial.state ?? "",
        country: initial.country ?? "",
      })
      if (initial.locationGeoJson) {
        try {
          const parsed = JSON.parse(initial.locationGeoJson) as WorkshopVenuePoint
          if (
            parsed?.type === "Point" &&
            Array.isArray(parsed.coordinates) &&
            parsed.coordinates.length >= 2
          ) {
            setVenuePoint(parsed)
          } else {
            setVenuePoint(null)
          }
        } catch {
          setVenuePoint(null)
        }
      } else {
        setVenuePoint(null)
      }
    } else {
      setSlots(20)
      setAddr(emptyAddr)
      setVenuePoint(null)
    }
  }, [open, mode, initial])

  useEffect(() => {
    if (state.ok) {
      onSuccess?.()
      onOpenChange(false)
    }
  }, [state.ok, onOpenChange, onSuccess])

  const onVenueChange = (payload: PrimaryLocationPayload | null) => {
    if (!payload) {
      setVenuePoint(null)
      return
    }
    setVenuePoint(payload.primary_location)
    setAddr({
      venue_name: payload.venue_name ?? "",
      address_line: payload.address_line ?? "",
      city: payload.city ?? "",
      state: payload.state ?? "",
      country: payload.country ?? "",
    })
  }

  const locationHiddenValue = venuePoint ? JSON.stringify(venuePoint) : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add workshop" : "Edit workshop"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a workshop. Venue and capacity are saved with your listing and used for nearby search."
              : "Update this workshop. Changes go through the save-workshop service."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4 py-2">
          <input type="hidden" name="intent" value={mode === "create" ? "create" : "update"} />
          {mode === "edit" && initial ? <input type="hidden" name="id" value={initial.id} /> : null}
          <input type="hidden" name="location_json" value={locationHiddenValue} readOnly />

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
            <Label htmlFor="wf-instructor-display">Instructor</Label>
            <p
              id="wf-instructor-display"
              className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
            >
              {mode === "edit"
                ? initial?.instructor && initial.instructor !== "—"
                  ? initial.instructor
                  : "—"
                : defaultInstructorName || "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {mode === "edit"
                ? "Linked to the instructor who created this workshop."
                : "From your signed-in account."}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="wf-date">Date & time</Label>
            <Input id="wf-date" name="date" type="datetime-local" defaultValue={defaultDate} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="wf-slots">Capacity (slots)</Label>
            <Input
              id="wf-slots"
              name="slots"
              type="number"
              min={1}
              step={1}
              value={slots}
              onChange={(e) => {
                const n = Number(e.target.value)
                setSlots(Number.isInteger(n) && n >= 1 ? n : 20)
              }}
            />
            <p className="text-xs text-muted-foreground">Maximum participants (default 20).</p>
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

          <div className="grid gap-2 border-t border-border pt-4">
            {hasGoogleMapsKey ? (
              <PrimaryLocationField
                inputId="wf-venue-search"
                label="Venue"
                description=""
                onChange={onVenueChange}
                disabled={isPending}
              />
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-500">
                Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable venue search. You can still enter
                address fields manually (map pin optional).
              </p>
            )}
            {/* {venuePoint ? (
              <p className="text-xs text-muted-foreground">
                Pin set ({venuePoint.coordinates[1].toFixed(4)},{" "}
                {venuePoint.coordinates[0].toFixed(4)}).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No map pin — workshop can still be saved.</p>
            )} */}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="wf-venue_name">Venue name</Label>
            <Input
              id="wf-venue_name"
              name="venue_name"
              value={addr.venue_name}
              onChange={(e) => setAddr((a) => ({ ...a, venue_name: e.target.value }))}
              placeholder="Studio or place name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="wf-address_line">Address line</Label>
            <Input
              id="wf-address_line"
              name="address_line"
              value={addr.address_line}
              onChange={(e) => setAddr((a) => ({ ...a, address_line: e.target.value }))}
              placeholder="Street, building, neighbourhood"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="wf-city">City</Label>
              <Input
                id="wf-city"
                name="city"
                value={addr.city}
                onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))}
                placeholder="City"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wf-state">State</Label>
              <Input
                id="wf-state"
                name="state"
                value={addr.state}
                onChange={(e) => setAddr((a) => ({ ...a, state: e.target.value }))}
                placeholder="State"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wf-country">Country</Label>
            <Input
              id="wf-country"
              name="country"
              value={addr.country}
              onChange={(e) => setAddr((a) => ({ ...a, country: e.target.value }))}
              placeholder="Country"
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
