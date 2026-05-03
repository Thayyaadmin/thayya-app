"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/app/supabaseClient"
import { deleteWorkshop } from "@/app/dashboard/workshops/actions"

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
  const instructorRaw = row.instructor ?? row.instructor_name
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

  return {
    id: String(row.id),
    name: title,
    instructor,
    dateDisplay: formatWorkshopDateDisplay(dateIso),
    dateIso,
    status: deriveStatus(dateIso),
    price,
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

    const { data, error } = await supabase.from("workshops").select("*")

    if (error) {
      console.error("Workshops fetch error:", error)
      setWorkshops([])
      setLoadError(error.message || "Could not load workshops.")
      setLoading(false)
      return
    }

    const rows = (Array.isArray(data) ? data : [])
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
    return workshops.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.instructor.toLowerCase().includes(q)
    )
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

  const getStatusBadge = (status: WorkshopStatus) => {
    const variants = {
      active: "bg-emerald-100 text-emerald-700 border-emerald-200",
      upcoming: "bg-primary/15 text-primary border-primary/25",
      completed: "bg-muted text-muted-foreground border-border",
    }
    return (
      <Badge variant="outline" className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-semibold">Current Workshops</CardTitle>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workshops..."
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Workshop</TableHead>
                <TableHead className="text-muted-foreground hidden sm:table-cell">
                  Date
                </TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">
                  Instructor
                </TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">
                  Price
                </TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Loading workshops…
                  </TableCell>
                </TableRow>
              ) : filteredWorkshops.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No workshops found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkshops.map((workshop) => (
                  <TableRow
                    key={workshop.id}
                    className="border-border/30 hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell className="font-medium">{workshop.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {workshop.dateDisplay}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {workshop.instructor}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {formatInr(workshop.price)}
                    </TableCell>
                    <TableCell>{getStatusBadge(workshop.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
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
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          disabled={deleteId === workshop.id || isPending}
                          onClick={() => handleDelete(workshop.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete {workshop.name}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
