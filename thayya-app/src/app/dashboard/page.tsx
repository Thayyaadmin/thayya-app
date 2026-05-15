"use client";

import { useCallback, useEffect, useState } from "react";
import { SiteEyebrow } from "@/components/site/atoms/SiteEyebrow";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { WorkshopsTable, type WorkshopRow } from "@/components/dashboard/workshops-table";
import { WorkshopFormDialog } from "@/components/dashboard/workshop-form-dialog";
import { Users, DollarSign, CalendarDays } from "lucide-react";
import { supabase } from "@/app/supabaseClient";
import {
  getInstructorAvatarUrl,
  getInstructorDisplayName,
} from "@/lib/instructor-profile";

function timeOfDayGreeting(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDashboardEyebrowDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export default function InstructorDashboard() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<WorkshopRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const now = new Date();
  const greeting = timeOfDayGreeting(now);
  const eyebrow = formatDashboardEyebrowDate(now);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) return;
      const user = data.user;
      setDisplayName(getInstructorDisplayName(user));
      setEmail(user.email ?? "");
      const fromMeta = getInstructorAvatarUrl(user);
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      const fromProfile = profile?.avatar_url;
      const fromDb =
        typeof fromProfile === "string" && fromProfile.trim().startsWith("http")
          ? fromProfile.trim()
          : null;
      setAvatarUrl(fromDb ?? fromMeta);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bumpRefresh = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        displayName={displayName}
        email={email}
        avatarUrl={avatarUrl}
        onAvatarUrlChange={setAvatarUrl}
      />

      <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-8">
          <div suppressHydrationWarning>
            <SiteEyebrow className="mb-2">{eyebrow}</SiteEyebrow>
            <h2 className="font-display text-4xl leading-[1.05] font-bold md:text-6xl">
              {greeting},{" "}
              {displayName ? (
                <span className="gradient-text">{displayName}</span>
              ) : (
                <span className="gradient-text">there</span>
              )}
              .<br />
              <span className="font-brush text-3xl md:text-5xl" style={{ color: "var(--t-magenta)" }}>
                let&apos;s move
              </span>
              .
            </h2>
          </div>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s what&apos;s happening with your workshops today.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            title="Total Students"
            value="137"
            change="+12% from last month"
            changeType="positive"
            icon={Users}
          />
          <KpiCard
            title="Monthly Revenue"
            value="$31,200"
            change="+8.2% from last month"
            changeType="positive"
            icon={DollarSign}
          />
          <KpiCard
            title="Active Workshops"
            value="6"
            change="2 starting this week"
            changeType="neutral"
            icon={CalendarDays}
          />
        </div>

        <div className="mb-8">
          <QuickActions onAddWorkshop={() => setAddOpen(true)} />
        </div>

        <WorkshopsTable
          refreshToken={refreshToken}
          onEdit={(row) => setEditRow(row)}
        />
      </main>

      {addOpen ? (
        <WorkshopFormDialog
          key="create-workshop"
          mode="create"
          open={addOpen}
          onOpenChange={setAddOpen}
          defaultInstructorName={displayName || email}
          onSuccess={bumpRefresh}
        />
      ) : null}

      {editRow ? (
        <WorkshopFormDialog
          key={`edit-workshop-${editRow.id}`}
          mode="edit"
          initial={editRow}
          open={!!editRow}
          onOpenChange={(open) => {
            if (!open) setEditRow(null);
          }}
          onSuccess={bumpRefresh}
        />
      ) : null}
    </div>
  );
}
