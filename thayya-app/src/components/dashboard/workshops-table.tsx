"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/app/supabaseClient"
import { deleteWorkshop } from "@/app/dashboard/workshops/actions"
import { toGeoJsonPoint } from "@/lib/geo-point"
import { fetchInstructorWorkshopsUpcoming } from "@/lib/instructor-workshops-upcoming-browser"
import { getInstructorInitials } from "@/lib/instructor-profile"

export type WorkshopStatus = "active" | "upcoming" | "completed"

/** Serializable workshop row for the dashboard (no functions / Supabase client in props). */
export type WorkshopRow = {
  id: string
  name: string
  instructor: string
  dateDisplay: string
  /** Raw date from DB for edit forms / status. */
  dateIso: string | null
  status: WorkshopStatus
  price: number | null
  slots: number
  tags: string[]
  spots_taken: number
  spots_remaining: number
  is_full: boolean
  venue_name: string | null
  address_line: string | null
  city: string | null
  state: string | null
  country: string | null
  /** JSON string of `{ type: "Point", coordinates: [lng, lat] }` for the save-workshop form. */
  locationGeoJson: string | null
  /** From joined `profiles.avatar_url` when the API returns it. */
  instructor_avatar_url: string | null
}

function formatWorkshopDateDisplay(dateValue: string | null): string {
  if (!dateValue) return "—"
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return String(dateValue)
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function deriveStatus(dateValue: string | null): WorkshopStatus {
  if (!dateValue) return "upcoming"
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return "upcoming"

  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const endToday = new Date()
  endToday.setHours(23, 59, 59, 999)

  if (d < startToday) return "completed"
  if (d >= startToday && d <= endToday) return "active"
  return "upcoming"
}

function mapDbRowToWorkshop(row: Record<string, unknown>): WorkshopRow | null {
  if (row.id === undefined || row.id === null) return null

  const title = row.title != null ? String(row.title) : "Untitled workshop"

  // Prefer the linked profile's full_name (source of truth). Fall back to the
  // legacy `instructor` / `instructor_name` text columns for rows that pre-date
  // the FK or were never matched during backfill.
  const profile = row.instructor_profile as {
    full_name?: string | null
    avatar_url?: string | null
  } | null | undefined
  const instructorRaw =
    (profile && typeof profile.full_name === "string" && profile.full_name) ||
    row.instructor ||
    row.instructor_name
  const instructor =
    instructorRaw != null && instructorRaw !== "" ? String(instructorRaw) : "—"

  const rawDate = row.date
  const dateIso: string | null =
    rawDate === null || rawDate === undefined || rawDate === ""
      ? null
      : typeof rawDate === "string"
        ? rawDate
        : new Date(String(rawDate)).toISOString()

  const rawPrice = row.price
  let price: number | null = null
  if (rawPrice !== null && rawPrice !== undefined && rawPrice !== "") {
    const n = typeof rawPrice === "number" ? rawPrice : Number(rawPrice)
    price = Number.isFinite(n) ? n : null
  }

  const rawSlots = row.slots
  let slots = 20
  if (rawSlots !== null && rawSlots !== undefined && rawSlots !== "") {
    const n = typeof rawSlots === "number" ? rawSlots : Number(rawSlots)
    if (Number.isInteger(n) && n >= 1) slots = n
  }

  const tags = Array.isArray(row.tags)
    ? row.tags.map((t) => String(t).trim()).filter(Boolean)
    : []

  const rawTaken = row.spots_taken
  let spots_taken = 0
  if (rawTaken !== null && rawTaken !== undefined && rawTaken !== "") {
    const n = typeof rawTaken === "number" ? rawTaken : Number(rawTaken)
    if (Number.isInteger(n) && n >= 0) spots_taken = n
  }
  const spots_remaining = Math.max(0, slots - spots_taken)
  const is_full =
    row.is_full === true || (slots > 0 && spots_taken >= slots)

  const venue_name =
    row.venue_name != null && String(row.venue_name).trim() ? String(row.venue_name).trim() : null
  const address_line =
    row.address_line != null && String(row.address_line).trim() ? String(row.address_line).trim() : null
  const city = row.city != null && String(row.city).trim() ? String(row.city).trim() : null
  const state = row.state != null && String(row.state).trim() ? String(row.state).trim() : null
  const country = row.country != null && String(row.country).trim() ? String(row.country).trim() : null

  const geo = toGeoJsonPoint(row.location)
  const locationGeoJson = geo ? JSON.stringify(geo) : null

  const rawAvatar = profile?.avatar_url
  const instructor_avatar_url =
    typeof rawAvatar === "string" && rawAvatar.trim().startsWith("http")
      ? rawAvatar.trim()
      : null

  return {
    id: String(row.id),
    name: title,
    instructor,
    dateDisplay: formatWorkshopDateDisplay(dateIso),
    dateIso,
    status: deriveStatus(dateIso),
    price,
    slots,
    tags,
    spots_taken,
    spots_remaining,
    is_full,
    venue_name,
    address_line,
    city,
    state,
    country,
    locationGeoJson,
    instructor_avatar_url,
  }
}

function formatInr(price: number | null): string {
  if (price === null || Number.isNaN(price)) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price)
}

function dayStart(d: Date): Date {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  return t
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return dayStart(a).getTime() === dayStart(b).getTime()
}

function formatWorkshopTime(dateIso: string | null): string {
  if (!dateIso) return ""
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatPrimaryVenueLine(w: WorkshopRow): string {
  if (w.venue_name) return w.venue_name
  const parts = [w.city, w.state].filter(Boolean)
  if (parts.length) return parts.join(", ")
  if (w.address_line) {
    const s = w.address_line.trim()
    return s.length > 96 ? `${s.slice(0, 93)}…` : s
  }
  return ""
}

function buildWorkshopGlanceSubtitle(w: WorkshopRow): string {
  const time = formatWorkshopTime(w.dateIso)
  const venue = formatPrimaryVenueLine(w)
  const price = formatInr(w.price)
  const head: string[] = []
  if (time) head.push(time)
  if (venue) head.push(`at ${venue}`)
  const headStr = head.join(" ")
  const tail = price
  return headStr ? (tail ? `${headStr} · ${tail}` : headStr) : tail || "—"
}

function formatSpotsFilledLabel(w: WorkshopRow): string {
  return `${w.spots_taken} of ${w.slots} spot${w.slots === 1 ? "" : "s"} filled`
}

function spotsFilledPercent(w: WorkshopRow): number {
  if (w.slots <= 0) return 0
  return Math.min(100, Math.round((w.spots_taken / w.slots) * 100))
}

/** Short label for the top-right pill (mirrors instructor “In 4 hours” glance). */
function formatRelativeGlanceBadge(
  dateIso: string | null,
  status: WorkshopStatus,
  dateDisplay: string,
): string {
  if (status === "completed") return "Past"
  if (!dateIso) return "TBD"

  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return "TBD"

  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / 60000)

  if (isSameCalendarDay(d, now)) {
    if (diffMins >= 0 && diffMins < 90) return diffMins <= 1 ? "Soon" : `In ${diffMins} min`
    if (diffMins >= 0 && diffMins < 24 * 60) return `In ${Math.round(diffMins / 60)}h`
    return "Today"
  }

  const tomorrow = dayStart(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameCalendarDay(d, tomorrow)) return "Tomorrow"

  const daysUntil = Math.round((dayStart(d).getTime() - dayStart(now).getTime()) / 86400000)
  if (daysUntil > 1 && daysUntil <= 7) return `In ${daysUntil} days`

  return dateDisplay
}

function statusEyebrowLabel(status: WorkshopStatus): string {
  switch (status) {
    case "active":
      return "Today"
    case "completed":
      return "Past run"
    default:
      return "Upcoming"
  }
}

function glancePillStyle(status: WorkshopStatus): { background: string; color: string } {
  switch (status) {
    case "active":
      return { background: "rgba(31,169,160,0.12)", color: "var(--t-teal)" }
    case "completed":
      return { background: "rgba(10,10,10,0.06)", color: "var(--ink-muted)" }
    default:
      return { background: "rgba(232,51,77,0.12)", color: "var(--t-red)" }
  }
}

type WorkshopsTableProps = {
  /** Bump to refetch rows from Supabase after server mutations. */
  refreshToken?: number
  onEdit?: (row: WorkshopRow) => void
}

export function WorkshopsTable({ refreshToken = 0, onEdit }: WorkshopsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [workshops, setWorkshops] = useState<WorkshopRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const loadWorkshops = useCallback(async () => {
    setLoading(true)
    setLoadError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setWorkshops([])
      setLoadError("You must be signed in to view your workshops.")
      setLoading(false)
      return
    }

    const { workshops: data, error } = await fetchInstructorWorkshopsUpcoming(session.access_token)

    if (error) {
      console.error("Workshops fetch error:", error)
      setWorkshops([])
      setLoadError(error)
      setLoading(false)
      return
    }

    const rows = data
      .map((r) => mapDbRowToWorkshop(r as Record<string, unknown>))
      .filter((r): r is WorkshopRow => r !== null)

    setWorkshops(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadWorkshops()
  }, [loadWorkshops, refreshToken])

  const filteredWorkshops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return workshops
    return workshops.filter((w) => {
      const hay = [
        w.name,
        w.instructor,
        w.venue_name,
        w.address_line,
        w.city,
        w.state,
        w.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [workshops, searchQuery])

  const handleDelete = (id: string) => {
    const previous = workshops
    setDeleteId(id)
    setWorkshops((prev) => prev.filter((w) => w.id !== id))

    startTransition(async () => {
      const result = await deleteWorkshop(id)
      if (!result.ok) {
        setWorkshops(previous)
        setLoadError(result.error || "Could not delete workshop.")
      } else {
        setLoadError(null)
      }
      setDeleteId(null)
    })
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle id="upcoming-workshops-heading" className="text-lg font-semibold">
            Your upcoming workshops
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Only workshops you lead, dated today or later (or with no date yet). Past runs are not listed here.
          </p>
        </div>
        <div className="relative w-full sm:w-72 sm:shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, venue, city…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 focus:border-primary/50"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loadError ? (
          <p className="mb-4 text-sm text-destructive">{loadError}</p>
        ) : null}
        <div className="min-w-0">
          <div
            className="text-muted-foreground mb-3 hidden items-center justify-between border-b border-border/50 pb-2 text-sm font-medium sm:flex"
            aria-hidden
          >
            <span>Workshop</span>
            <span className="w-[100px] shrink-0 text-right">Actions</span>
          </div>

          {loading ? (
            <p className="text-muted-foreground py-12 text-center text-sm">Loading workshops…</p>
          ) : filteredWorkshops.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">No workshops found.</p>
          ) : (
            <ul
              className="flex flex-col gap-3"
              role="list"
              aria-labelledby="upcoming-workshops-heading"
            >
              {filteredWorkshops.map((workshop) => {
                const pill = glancePillStyle(workshop.status)
                const badgeText = formatRelativeGlanceBadge(
                  workshop.dateIso,
                  workshop.status,
                  workshop.dateDisplay,
                )
                return (
                  <li
                    key={workshop.id}
                    className="group rounded-2xl p-2 transition-colors hover:bg-muted/15 sm:p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="bg-card rounded-2xl border border-border/80 p-4 shadow-sm sm:p-5">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                              {statusEyebrowLabel(workshop.status)}
                            </div>
                            <span
                              className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                              style={pill}
                            >
                              {badgeText}
                            </span>
                          </div>
                          <div className="font-display mt-2 mb-1 text-lg font-bold sm:text-xl md:text-2xl">
                            {workshop.name}
                          </div>
                          <div className="text-muted-foreground mb-1 line-clamp-2 text-sm leading-snug sm:line-clamp-none">
                            {buildWorkshopGlanceSubtitle(workshop)}
                          </div>
                          {workshop.instructor !== "—" ? (
                            <div className="text-muted-foreground mb-4 flex items-center gap-3 text-xs font-medium sm:text-sm">
                              <Avatar className="h-10 w-10 shrink-0 border border-border/80 shadow-sm">
                                <AvatarImage
                                  src={workshop.instructor_avatar_url ?? undefined}
                                  alt={workshop.instructor}
                                />
                                <AvatarFallback className="text-[11px] font-semibold">
                                  {getInstructorInitials(workshop.instructor)}
                                </AvatarFallback>
                              </Avatar>
                              <span>Led by {workshop.instructor}</span>
                            </div>
                          ) : (
                            <div className="mb-4" />
                          )}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground font-medium">
                                {formatSpotsFilledLabel(workshop)}
                              </span>
                              {workshop.is_full ? (
                                <span
                                  className="shrink-0 font-bold"
                                  style={{ color: "var(--t-red)" }}
                                >
                                  Full
                                </span>
                              ) : null}
                            </div>
                            <div
                              className="bg-muted h-2 overflow-hidden rounded-full"
                              role="progressbar"
                              aria-valuenow={workshop.spots_taken}
                              aria-valuemin={0}
                              aria-valuemax={workshop.slots}
                              aria-label={formatSpotsFilledLabel(workshop)}
                            >
                              <div
                                className="gradient-bg-warm h-full rounded-full transition-[width] duration-300 ease-out"
                                style={{ width: `${spotsFilledPercent(workshop)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-row justify-end gap-1 sm:w-[100px] sm:flex-col sm:items-end sm:pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          disabled={!onEdit}
                          onClick={() => onEdit?.(workshop)}
                          title={onEdit ? "Edit workshop" : undefined}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit {workshop.name}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          disabled={deleteId === workshop.id || isPending}
                          onClick={() => handleDelete(workshop.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete {workshop.name}</span>
                        </Button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
