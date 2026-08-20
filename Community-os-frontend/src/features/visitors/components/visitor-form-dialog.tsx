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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ResidentSelect } from '@/features/facilities/components/resident-select'
import { useCreateVisitor } from '@/features/visitors/hooks/use-visitors'
import { visitorFormSchema, type VisitorFormValues, VISITOR_CATEGORIES } from '@/features/visitors/validation/visitor'

const CATEGORY_LABELS: Record<string, string> = {
  ONE_TIME: 'One-time',
  RECURRING: 'Recurring',
  SERVICE_PROVIDER: 'Service Provider',
  CONTRACTOR: 'Contractor',
  DELIVERY: 'Delivery',
  OTHER: 'Other',
}

interface VisitorFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VisitorFormDialog({ open, onOpenChange }: VisitorFormDialogProps) {
  const createVisitor = useCreateVisitor(() => onOpenChange(false))

  const form = useForm<VisitorFormValues>({
    resolver: zodResolver(visitorFormSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      purpose: '',
      hostResidentId: '',
      vehiclePlate: '',
      remarks: '',
      category: 'ONE_TIME',
    },
  })

  const handleSubmit = (values: VisitorFormValues) => {
    createVisitor.mutate({
      name: values.name,
      phoneNumber: values.phoneNumber || undefined,
      purpose: values.purpose || undefined,
      hostResidentId: values.hostResidentId || undefined,
      remarks: values.remarks || undefined,
      category: values.category,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add visitor</DialogTitle>
          <DialogDescription>
            Log an expected visitor or check someone in at the gate.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visitor name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Carlos Mendoza" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number</FormLabel>
                  <FormControl>
                    <Input placeholder="09xx xxx xxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VISITOR_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hostResidentId"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Visiting</FormLabel>
                  <FormControl>
                    <ResidentSelect value={field.value ?? ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Delivery" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createVisitor.isPending}>
                {createVisitor.isPending ? 'Saving…' : 'Add visitor'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
