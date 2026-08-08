import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateAnnouncement, useUpdateAnnouncement } from '@/features/announcements/hooks/use-announcements'
import { announcementSchema, type AnnouncementFormValues } from '@/features/announcements/validation/announcement'
import type { Announcement } from '@/features/announcements/types/announcement'

interface AnnouncementFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  announcement?: Announcement | null
}

export function AnnouncementFormDialog({ open, onOpenChange, announcement }: AnnouncementFormDialogProps) {
  const isEdit = Boolean(announcement)
  const createAnnouncement = useCreateAnnouncement()
  const updateAnnouncement = useUpdateAnnouncement()

  const form = useForm<AnnouncementFormValues & { publish: boolean }>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', content: '', coverImageUrl: '', publish: false },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title: announcement?.title ?? '',
        content: announcement?.content ?? '',
        coverImageUrl: announcement?.coverImageUrl ?? '',
        publish: false,
      })
    }
  }, [open, announcement, form])

  const handleSubmit = (values: AnnouncementFormValues & { publish: boolean }) => {
    const input = {
      title: values.title,
      content: values.content,
      coverImageUrl: values.coverImageUrl || undefined,
      ...(isEdit
        ? announcement?.status === 'DRAFT' || announcement?.status === 'REVIEW'
          ? { status: values.publish ? ('PUBLISHED' as const) : undefined }
          : {}
        : { status: values.publish ? ('PUBLISHED' as const) : ('DRAFT' as const) }),
    }

    if (isEdit && announcement) {
      updateAnnouncement.mutate(
        { id: announcement.id, input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createAnnouncement.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit announcement' : 'New announcement'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the details of this announcement.' : 'Write a message for your community.'}
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
                    <Input placeholder="e.g. Village-wide cleanup this Saturday" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Write your announcement…" rows={6} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="coverImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://… (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEdit || announcement?.status === 'DRAFT' || announcement?.status === 'REVIEW' ? (
              <FormField
                control={form.control}
                name="publish"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Publish immediately</FormLabel>
                      <FormDescription>
                        Skip the draft and make this visible to all residents now.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAnnouncement.isPending || updateAnnouncement.isPending}>
                {isEdit ? 'Save changes' : 'Create announcement'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
