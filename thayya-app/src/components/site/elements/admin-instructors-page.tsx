"use client";

import { useState } from "react";
import { SiteEyebrow } from "@/components/site/atoms/SiteEyebrow";
import { AdminCreateInstructorForm } from "@/components/site/elements/admin-create-instructor-form";
import { AdminInstructorsList } from "@/components/site/elements/admin-instructors-list";
import type { CategoryOption } from "@/lib/categories-catalog";

type AdminInstructorsTab = "list" | "create";

type AdminInstructorsPageProps = {
  categories: CategoryOption[];
};

export function AdminInstructorsPage({ categories }: AdminInstructorsPageProps) {
  const [tab, setTab] = useState<AdminInstructorsTab>("list");
  const [listRefreshKey, setListRefreshKey] = useState(0);

  return (
    <div className="page mx-auto max-w-[960px] px-4 py-8 md:px-8 md:py-12">
      <div className="mb-8">
        <SiteEyebrow className="mb-2">Admin · Instructors</SiteEyebrow>
        <h1 className="font-display text-3xl leading-[1.05] font-bold md:text-4xl">
          Manage <span className="gradient-text">instructors</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Browse and edit instructors, or invite someone new to the platform.
        </p>
      </div>

      <div className="mb-6 flex justify-center md:justify-start">
        <div
          className="inline-flex rounded-full p-1"
          style={{ background: "var(--line)", opacity: 1 }}
          role="tablist"
          aria-label="Instructor admin sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "list"}
            onClick={() => setTab("list")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              tab === "list"
                ? "bg-[var(--ink)] text-white shadow-sm"
                : "text-[var(--ink-soft)] hover:text-black"
            }`}
          >
            All instructors
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "create"}
            onClick={() => setTab("create")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              tab === "create"
                ? "bg-[var(--ink)] text-white shadow-sm"
                : "text-[var(--ink-soft)] hover:text-black"
            }`}
          >
            Add instructor
          </button>
        </div>
      </div>

      <section
        className="rounded-2xl border p-6 md:p-8"
        style={{ background: "white", borderColor: "var(--line)" }}
      >
        {tab === "list" ? (
          <AdminInstructorsList categories={categories} refreshKey={listRefreshKey} />
        ) : (
          <AdminCreateInstructorForm
            categories={categories}
            onCreated={() => {
              setListRefreshKey((k) => k + 1);
              setTab("list");
            }}
          />
        )}
      </section>
    </div>
  );
}
