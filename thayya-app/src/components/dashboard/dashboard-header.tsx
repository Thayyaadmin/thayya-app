"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, ImageUp, LogOut, Settings, User } from "lucide-react"
import { supabase } from "@/app/supabaseClient"
import { getInstructorInitials } from "@/lib/instructor-profile"
import { postUploadProfileAvatar } from "@/lib/upload-profile-avatar"

type DashboardHeaderProps = {
  displayName: string
  email: string
  avatarUrl?: string | null
  onAvatarUrlChange?: (url: string | null) => void
}

export function DashboardHeader({
  displayName,
  email,
  avatarUrl,
  onAvatarUrlChange,
}: DashboardHeaderProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const initials = getInstructorInitials(displayName || email || "?")

  const triggerFilePicker = useCallback(() => {
    setUploadError(null)
    window.setTimeout(() => fileInputRef.current?.click(), 0)
  }, [])

  const handleAvatarFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return

      setUploading(true)
      setUploadError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setUploadError("Sign in again to upload a picture.")
        setUploading(false)
        return
      }

      const result = await postUploadProfileAvatar(session.access_token, file)
      setUploading(false)
      if (!result.ok) {
        setUploadError(result.message)
        return
      }

      const next = result.profile.avatar_url
      if (typeof next === "string" && next.startsWith("http")) {
        onAvatarUrlChange?.(next)
      }
    },
    [onAvatarUrlChange],
  )

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error(error.message)
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-xl font-bold text-primary-foreground">T</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Thayya</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Instructor Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
              3
            </span>
            <span className="sr-only">Notifications</span>
          </Button>

          {uploadError ? (
            <p
              className="max-w-[min(12rem,calc(100vw-12rem))] truncate text-xs text-destructive"
              title={uploadError}
            >
              {uploadError}
            </p>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              void handleAvatarFileChange(e)
            }}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full ring-2 ring-border hover:ring-primary/50 transition-all duration-300"
              >
                <Avatar className="h-10 w-10">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={displayName || "Account"} />
                  ) : null}
                  <AvatarFallback className="bg-secondary text-foreground">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {displayName || "Signed in"}
                  </p>
                  {email ? (
                    <p className="text-xs leading-none text-muted-foreground">{email}</p>
                  ) : null}
                </div>
              </DropdownMenuLabel>
              {uploadError ? (
                <p className="px-2 pb-2 text-xs text-destructive">{uploadError}</p>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={uploading}
                onSelect={(e) => {
                  e.preventDefault()
                  triggerFilePicker()
                }}
              >
                <ImageUp className="mr-2 h-4 w-4" />
                <span>{uploading ? "Uploading…" : "Upload picture"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault()
                  void handleSignOut()
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
