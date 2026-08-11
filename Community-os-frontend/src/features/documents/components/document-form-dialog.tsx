import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileUp, Loader2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateDocument,
  useUpdateDocument,
  useUploadFile,
} from '@/features/documents/hooks/use-documents'
import {
  documentFormSchema,
  type DocumentFormValues,
} from '@/features/documents/validation/document'
import type {
  DocumentCategory,
  DocumentListItem,
} from '@/features/documents/types/document'
import { formatFileSize, getFileExtension } from '@/lib/format'

interface DocumentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document?: DocumentListItem | null
}

const CATEGORIES: DocumentCategory[] = [
  'POLICY',
  'MINUTES',
  'FINANCIAL',
  'NOTICE',
  'FORM',
  'OTHER',
]

function DocumentForm({
  document,
  onOpenChange,
}: {
  document?: DocumentListItem | null
  onOpenChange: (open: boolean) => void
}) {
  const isEditing = Boolean(document)
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState(() => document?.fileUrl ?? '')

  const createDocument = useCreateDocument(() => onOpenChange(false))
  const updateDocument = useUpdateDocument(() => onOpenChange(false))
  const uploadFile = useUploadFile()

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      title: document?.title ?? '',
      description: document?.description ?? '',
      category: document?.category ?? '',
    },
  })

  const handleFileChange = (selected: File | null) => {
    setFile(selected)
    if (selected) setFileUrl('')
  }

  const handleSubmit = async (values: DocumentFormValues) => {
    if (isEditing && document) {
      updateDocument.mutate({
        id: document.id,
        input: {
          title: values.title,
          description: values.description || undefined,
          category: (values.category || undefined) as
            DocumentCategory | undefined,
          fileUrl: document.fileUrl,
          fileName: document.fileName,
          fileSize: document.fileSize ?? undefined,
          mimeType: document.mimeType ?? undefined,
        },
      })
      return
    }

    let resolvedUrl = fileUrl
    if (file) {
      const uploaded = await uploadFile.mutateAsync(file)
      resolvedUrl = uploaded.url
    }
    if (!resolvedUrl) {
      toast.error('Please attach a file.')
      return
    }

    createDocument.mutate({
      title: values.title,
      description: values.description || undefined,
      category: (values.category || undefined) as DocumentCategory | undefined,
      fileUrl: resolvedUrl,
      fileName: file?.name ?? getFileExtension(resolvedUrl),
      fileSize: file?.size,
      mimeType: file?.type,
    })
  }

  const pending =
    createDocument.isPending || updateDocument.isPending || uploadFile.isPending

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? 'Edit document' : 'Add document'}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Update document metadata.'
            : 'Attach a file and publish it to the community.'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Community Rules and Regulations"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Other" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0) +
                              category.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {!isEditing ? (
            <div>
              <FormLabel>File</FormLabel>
              {file ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0 leading-tight">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFileChange(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground hover:bg-accent/50">
                  <FileUp className="h-5 w-5" />
                  <span>Click to attach a file</span>
                  <span className="text-xs">Up to 10 MB</span>
                  <Input
                    type="file"
                    className="hidden"
                    onChange={(event) =>
                      handleFileChange(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : isEditing ? (
                'Save changes'
              ) : (
                'Add document'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  )
}

export function DocumentFormDialog({
  open,
  onOpenChange,
  document,
}: DocumentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {open ? (
          <DocumentForm
            key={document?.id ?? 'new'}
            document={document}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
