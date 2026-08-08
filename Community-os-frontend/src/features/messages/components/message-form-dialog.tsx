import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RecipientSelect } from '@/features/messages/components/recipient-select'
import { useCreateMessage } from '@/features/messages/hooks/use-messages'
import { messageFormSchema, type MessageFormValues } from '@/features/messages/validation/message'

interface MessageFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MessageFormDialog({ open, onOpenChange }: MessageFormDialogProps) {
  const createMessage = useCreateMessage(() => onOpenChange(false))

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      recipientId: '',
      subject: '',
      body: '',
    },
  })

  const handleSubmit = (values: MessageFormValues) => {
    createMessage.mutate({
      recipientId: values.recipientId || undefined,
      subject: values.subject,
      body: values.body,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compose message</DialogTitle>
          <DialogDescription>
            Send a direct message or broadcast to everyone.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipientId"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Recipient</FormLabel>
                  <FormControl>
                    <RecipientSelect value={field.value ?? ''} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>Leave blank to broadcast to all members.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. General assembly reminder" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Write your message…" rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMessage.isPending}>
                {createMessage.isPending ? 'Sending…' : 'Send'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
