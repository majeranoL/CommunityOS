import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileUpload } from '@/components/shared/file-upload'
import { useAuthStore } from '@/store/auth-store'
import { useCreateComplaint } from '@/features/complaints/hooks/use-complaints'
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, complaintSchema, type ComplaintFormValues } from '@/features/complaints/validation/complaint'

interface ComplaintFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ComplaintFormDialog({ open, onOpenChange }: ComplaintFormDialogProps) {
  const user = useAuthStore((state) => state.user)
  const createComplaint = useCreateComplaint()
  const residentId = user?.resident?.id

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'OTHER',
      priority: 'MEDIUM',
      remarks: '',
      attachmentFileIds: [],
    },
  })

  const handleSubmit = (values: ComplaintFormValues) => {
    if (!residentId) return
    const attachmentFileIds = values.attachmentFileIds
      ?.map((urlOrId) => urlOrId.split('/').pop() || urlOrId)
      .filter(Boolean)

    createComplaint.mutate(
      {
        residentId,
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        remarks: values.remarks || undefined,
        attachmentFileIds: attachmentFileIds && attachmentFileIds.length > 0 ? attachmentFileIds : undefined,
      },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
        },
      },
    )
  }

  if (!residentId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cannot submit a complaint</DialogTitle>
            <DialogDescription>
              Your account is not linked to a resident record yet. Please ask an administrator to
              link your household before submitting complaints.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New complaint</DialogTitle>
          <DialogDescription>
            Submitting as {user?.resident?.residentNumber}. Our team will review it shortly.
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
                    <Input placeholder="e.g. Broken streetlight near Block 2" {...field} />
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
                    <Textarea placeholder="Describe the issue in detail…" rows={4} {...field} />
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional remarks</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes for the team…" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attachmentFileIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attachments / Photos</FormLabel>
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onChange={field.onChange}
                      maxFiles={5}
                      accept="image/*,application/pdf"
                      label="Upload photos or supporting documents"
                      description="Up to 5 images or PDFs (max 10MB each)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createComplaint.isPending}>
                {createComplaint.isPending ? 'Submitting…' : 'Submit complaint'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
