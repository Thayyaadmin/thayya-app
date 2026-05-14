"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/app/supabaseClient"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { postUploadProfileAvatarWithProgress } from "@/lib/upload-profile-avatar"

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = "image/jpeg,image/png,image/webp"
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export type AvatarUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  displayName: string
  avatarUrl?: string | null
  initials: string
  onAvatarUrlChange?: (url: string | null) => void
}

function normalizeMime(file: File): string {
  return (file.type || "").toLowerCase().split(";")[0]?.trim() ?? ""
}

export function AvatarUploadDialog({
  open,
  onOpenChange,
  displayName,
  avatarUrl,
  initials,
  onAvatarUrlChange,
}: AvatarUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAbortRef = useRef<AbortController | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{
    loaded: number
    total: number
    lengthComputable: boolean
  } | null>(null)

  const revokePreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const resetForm = useCallback(() => {
    uploadAbortRef.current?.abort()
    uploadAbortRef.current = null
    setSelectedFile(null)
    revokePreview()
    setError(null)
    setUploading(false)
    setProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [revokePreview])

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open, resetForm])

  const validateFile = useCallback((file: File): string | null => {
    const mime = normalizeMime(file)
    if (!ALLOWED_TYPES.has(mime)) {
      return "Use a JPEG, PNG, or WebP image."
    }
    if (file.size > MAX_BYTES) {
      return `Image must be at most ${MAX_BYTES / (1024 * 1024)} MiB.`
    }
    return null
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return

      const msg = validateFile(file)
      if (msg) {
        setError(msg)
        return
      }

      setError(null)
      revokePreview()
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    },
    [validateFile, revokePreview],
  )

  const clearSelection = useCallback(() => {
    setError(null)
    setSelectedFile(null)
    revokePreview()
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [revokePreview])

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return

    const validationMsg = validateFile(selectedFile)
    if (validationMsg) {
      setError(validationMsg)
      return
    }

    setError(null)
    setUploading(true)
    setProgress({ loaded: 0, total: selectedFile.size, lengthComputable: true })

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setError("Sign in again to upload a picture.")
      setUploading(false)
      setProgress(null)
      return
    }

    const ac = new AbortController()
    uploadAbortRef.current = ac

    const result = await postUploadProfileAvatarWithProgress(session.access_token, selectedFile, {
      signal: ac.signal,
      onProgress: (ev) => setProgress(ev),
    })

    uploadAbortRef.current = null
    setUploading(false)
    setProgress(null)

    if (!result.ok) {
      if (result.message === "Cancelled") return
      setError(result.message)
      return
    }

    const next = result.profile.avatar_url
    if (typeof next === "string" && next.startsWith("http")) {
      onAvatarUrlChange?.(next)
    }
    onOpenChange(false)
  }, [selectedFile, validateFile, onAvatarUrlChange, onOpenChange])

  const handleCancel = useCallback(() => {
    if (uploading) {
      uploadAbortRef.current?.abort()
      return
    }
    onOpenChange(false)
  }, [uploading, onOpenChange])

  const blockDismissWhileUploading = useCallback(
    (e: Event) => {
      if (uploading) e.preventDefault()
    },
    [uploading],
  )

  const previewSrc = previewUrl ?? (avatarUrl && avatarUrl.startsWith("http") ? avatarUrl : null)
  const previewAlt = previewUrl
    ? `Selected photo for ${displayName || "profile"}`
    : previewSrc
      ? `Profile photo${displayName ? `, ${displayName}` : ""}`
      : ""

  const progressPercent =
    progress?.lengthComputable && progress.total > 0
      ? Math.min(100, Math.round((100 * progress.loaded) / progress.total))
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!uploading}
        onPointerDownOutside={blockDismissWhileUploading}
        onInteractOutside={blockDismissWhileUploading}
        onEscapeKeyDown={blockDismissWhileUploading}
        className="gap-6"
      >
        <DialogHeader>
          <DialogTitle>Profile picture</DialogTitle>
          <DialogDescription>
            Choose a photo to show on your profile. JPEG, PNG, or WebP, up to {MAX_BYTES / (1024 * 1024)}&nbsp;MiB.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted ring-2 ring-border">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob or external CDN URL
              <img src={previewSrc} alt={previewAlt} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-semibold text-muted-foreground">{initials}</span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            disabled={uploading}
            onChange={handleFileChange}
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose photo
            </Button>
            {selectedFile ? (
              <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={clearSelection}>
                Remove selection
              </Button>
            ) : null}
          </div>

          {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

          {uploading ? (
            <div className="w-full space-y-2">
              <div
                className="bg-secondary relative h-2 w-full overflow-hidden rounded-full"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent ?? undefined}
                aria-label="Upload progress"
              >
                {progressPercent !== null ? (
                  <div
                    className="bg-primary h-full transition-[width] duration-150 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                ) : (
                  <div className="bg-primary absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full" />
                )}
              </div>
              <p className="text-muted-foreground text-center text-xs">
                {progressPercent !== null ? `${progressPercent}% sent` : "Uploading…"}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            {uploading ? "Cancel upload" : "Close"}
          </Button>
          <Button type="button" onClick={() => void handleUpload()} disabled={!selectedFile || uploading}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
