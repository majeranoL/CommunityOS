import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { useCreateRole, useUpdateRole } from '@/features/roles/hooks/use-roles'
import { roleFormSchema, type RoleFormValues } from '@/features/roles/validation/role'
import type { RoleListItem } from '@/features/roles/types/role'

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: RoleListItem | null
}

export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: role?.name ?? '',
        description: role?.description ?? '',
      })
    }
  }, [open, role, form])

  const handleSubmit = (values: RoleFormValues) => {
    const input = {
      name: values.name,
      description: values.description || undefined,
    }

    if (role) {
      updateRole.mutate(
        { id: role.id, input },
        {
          onSuccess: () => {
            form.reset()
            onOpenChange(false)
          },
        },
      )
    } else {
      createRole.mutate(input, {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
        },
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? 'Edit role' : 'Create role'}</DialogTitle>
          <DialogDescription>
            {role ? 'Update the role name or description.' : 'Define an office-holder role, then assign permissions.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Treasurer" {...field} />
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
                    <Textarea placeholder="What this role is responsible for" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                {createRole.isPending || updateRole.isPending ? 'Saving…' : role ? 'Save changes' : 'Create role'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
