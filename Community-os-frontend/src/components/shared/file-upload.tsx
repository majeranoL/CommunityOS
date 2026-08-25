import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import { Upload, X, FileText, Image as ImageIcon, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { documentsService } from '@/features/documents/services/documents'
import { SecureImage } from '@/components/shared/secure-image'
import type { UploadFileResult } from '@/features/documents/types/document'
import { cn } from '@/lib/utils'

export interface UploadedFileItem {
  id?: string
  url: string
  name?: string
  mimetype?: string
  size?: number
}

export interface FileUploadProps {
  /** Single URL/ID or array of URLs/IDs */
  value?: string | string[] | null
  /** Callback with updated URL or array of URLs */
  onChange?: (value: any) => void
  /** Optional callback providing full upload results */
  onUploadComplete?: (uploads: UploadFileResult[]) => void
  /** Allowed MIME types or file extensions (e.g. "image/*", "image/*,application/pdf") */
  accept?: string
  /** Maximum number of files allowed (default 1) */
  maxFiles?: number
  /** Maximum size in MB (default 10) */
  maxSizeMB?: number
  /** Label for the upload area */
  label?: string
  /** Helper description text */
  description?: string
  /** Disabled state */
  disabled?: boolean
  /** Custom container class */
  className?: string
}

function isImageUrl(url: string, mimetype?: string) {
  if (mimetype?.startsWith('image/')) return true
  const clean = url.split('?')[0].toLowerCase()
  return (
    clean.endsWith('.png') ||
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.gif')
  )
}

function getFileName(urlOrId: string) {
  const parts = urlOrId.split('/')
  return parts[parts.length - 1] || urlOrId
}

export function FileUpload({
  value,
  onChange,
  onUploadComplete,
  accept = 'image/*,application/pdf',
  maxFiles = 1,
  maxSizeMB = 10,
  label,
  description,
  disabled = false,
  className,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Normalize current items to an array of URLs / IDs
  const rawList = Array.isArray(value) ? value : value ? [value] : []
  const items = rawList.filter(Boolean)

  const canUploadMore = items.length < maxFiles

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    const remainingSlots = maxFiles - items.length
    if (remainingSlots <= 0) {
      toast.error(`Maximum of ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed.`)
      return
    }

    const filesToUpload = fileArray.slice(0, remainingSlots)

    // Validate sizes
    for (const file of filesToUpload) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds the ${maxSizeMB}MB limit.`)
        return
      }
    }

    setUploading(true)
    const uploadedResults: UploadFileResult[] = []

    try {
      for (const file of filesToUpload) {
        const result = await documentsService.upload(file)
        uploadedResults.push(result)
      }

      const newUrls = uploadedResults.map((r) => r.url || r.id)
      const nextList = [...items, ...newUrls]

      if (maxFiles === 1) {
        onChange?.(nextList[0] ?? null)
      } else {
        onChange?.(nextList)
      }

      onUploadComplete?.(uploadedResults)
      toast.success(
        `Uploaded ${uploadedResults.length} file${uploadedResults.length > 1 ? 's' : ''} successfully.`
      )
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(event.target.files)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled || uploading || !canUploadMore) return
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleRemove = (indexToRemove: number) => {
    const updated = items.filter((_, idx) => idx !== indexToRemove)
    if (maxFiles === 1) {
      onChange?.(null)
    } else {
      onChange?.(updated)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Upload Drop Zone / Button */}
      {canUploadMore && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled && !uploading) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors cursor-pointer',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
            (disabled || uploading) && 'cursor-not-allowed opacity-60'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={maxFiles > 1}
            disabled={disabled || uploading}
            onChange={handleInputChange}
            className="hidden"
          />

          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Uploading file...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div className="text-xs font-medium text-foreground">
                {label || (maxFiles > 1 ? 'Click or drag files to upload' : 'Click or drag a file to upload')}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {description || `${accept.replace(/[*]/g, '')} up to ${maxSizeMB}MB`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Uploaded Items Preview List */}
      {items.length > 0 && (
        <div className={cn('grid gap-2.5', maxFiles > 1 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1')}>
          {items.map((fileUrl, index) => {
            const isImage = isImageUrl(fileUrl)
            const fileName = getFileName(fileUrl)

            return (
              <div
                key={`${fileUrl}-${index}`}
                className={cn(
                  'group relative overflow-hidden rounded-md border border-border bg-card p-2 text-sm transition-all',
                  isImage ? 'flex flex-col items-center' : 'flex items-center gap-2.5'
                )}
              >
                {isImage ? (
                  <div className="relative w-full aspect-video max-h-36 overflow-hidden rounded bg-muted flex items-center justify-center">
                    <SecureImage
                      src={fileUrl}
                      alt={fileName}
                      className="h-full w-full object-cover rounded"
                    />
                    <ImageIcon className="h-6 w-6 text-muted-foreground absolute" />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                )}

                <div className={cn('min-w-0 flex-1', isImage && 'mt-1.5 w-full text-center')}>
                  <p className="truncate text-xs font-medium text-foreground" title={fileName}>
                    {fileName}
                  </p>
                </div>

                <div className={cn('flex items-center gap-1 shrink-0', isImage && 'mt-1 w-full justify-center')}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      documentsService.openFile({ fileUrl })
                    }}
                    title="View file"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>

                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(index)
                      }}
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

