"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { supabase } from "@/app/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  ADMIN_INSTRUCTORS_PAGE_SIZE,
  fetchAdminInstructors,
  type AdminInstructorListRow,
} from "@/lib/admin-instructors";
import { AdminEditInstructorDialog } from "@/components/site/elements/admin-edit-instructor-dialog";
import type { CategoryOption } from "@/lib/categories-catalog";

type AdminInstructorsListProps = {
  categories: CategoryOption[];
  refreshKey?: number;
};

export function AdminInstructorsList({ categories, refreshKey = 0 }: AdminInstructorsListProps) {
  const [instructors, setInstructors] = useState<AdminInstructorListRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async (pageToLoad: number) => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Sign in again to view instructors.");
        setInstructors([]);
        return;
      }
      const result = await fetchAdminInstructors(token, {
        page: pageToLoad,
        pageSize: ADMIN_INSTRUCTORS_PAGE_SIZE,
      });
      setInstructors(result.data);
      setTotal(result.total);
      setTotalPages(result.total_pages);
      setPage(result.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load instructors.");
      setInstructors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [refreshKey]);

  useEffect(() => {
    void load(page);
  }, [load, page, refreshKey]);

  const rangeStart = total === 0 ? 0 : (page - 1) * ADMIN_INSTRUCTORS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * ADMIN_INSTRUCTORS_PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "No instructors"
            : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load(page)}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="text-sm" style={{ color: "var(--t-orange)" }} role="alert">
          {error}
          {error.includes("404") || error.toLowerCase().includes("not found") ? (
            <span className="block mt-1 text-muted-foreground">
              Deploy the Edge Function:{" "}
              <code className="text-xs">supabase functions deploy admin-instructors</code>
            </span>
          ) : null}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading instructors…</p>
      ) : instructors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No instructors yet. Use the <strong>Add instructor</strong> tab to create one.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--line)" }}>
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/40" style={{ borderColor: "var(--line)" }}>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Categories</th>
                <th className="px-4 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody>
              {instructors.map((row) => {
                const location = [row.city, row.country].filter(Boolean).join(", ") || "—";
                const cats =
                  row.categories.length > 0
                    ? row.categories.map((c) => c.label).join(", ")
                    : "—";
                return (
                  <tr
                    key={row.id}
                    className="border-b last:border-b-0 hover:bg-muted/20"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.full_name}</div>
                      {row.slug ? (
                        <Link
                          href={`/instructors/${row.slug}`}
                          className="text-xs text-muted-foreground hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          /instructors/{row.slug}
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{location}</td>
                    <td className="px-4 py-3 text-muted-foreground">{cats}</td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => setEditingId(row.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={loading || page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <AdminEditInstructorDialog
        instructorId={editingId}
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        categories={categories}
        onSaved={() => {
          setEditingId(null);
          void load(page);
        }}
      />
    </div>
  );
}
