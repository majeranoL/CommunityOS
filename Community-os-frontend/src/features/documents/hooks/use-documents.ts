import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { documentsService } from '@/features/documents/services/documents'
import type {
  CreateDocumentInput,
  DocumentListItem,
  UpdateDocumentInput,
} from '@/features/documents/types/document'
import type { ListQuery } from '@/types/api'

export const documentKeys = {
  all: ['documents'] as const,
  list: (params: ListQuery) => ['documents', 'list', params] as const,
  detail: (id: string) => ['documents', 'detail', id] as const,
}

export function useDocuments(params: ListQuery) {
  return useQuery({
    queryKey: documentKeys.list(params),
    queryFn: () => documentsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useDocument(id: string | null) {
  return useQuery({
    queryKey: documentKeys.detail(id ?? ''),
    queryFn: () => documentsService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateDocument(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDocumentInput) => documentsService.create(input),
    onSuccess: () => {
      toast.success('Document added.')
      queryClient.invalidateQueries({ queryKey: documentKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to add document.')),
  })
}

export function useUpdateDocument(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDocumentInput }) =>
      documentsService.update(id, input),
    onSuccess: () => {
      toast.success('Document updated.')
      queryClient.invalidateQueries({ queryKey: documentKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update document.')),
  })
}

export function useUploadFile() {
  return useMutation({
    mutationFn: (file: File) => documentsService.upload(file),
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to upload file.')),
  })
}

function useStatusAction(
  action: (id: string) => Promise<DocumentListItem>,
  message: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => action(id),
    onSuccess: () => {
      toast.success(message)
      queryClient.invalidateQueries({ queryKey: documentKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Action failed.')),
  })
}

export function usePublishDocument() {
  return useStatusAction((id) => documentsService.publish(id), 'Document published.')
}

export function useArchiveDocument() {
  return useStatusAction((id) => documentsService.archive(id), 'Document archived.')
}

export function useDeleteDocument(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => documentsService.remove(id),
    onSuccess: () => {
      toast.success('Document removed.')
      queryClient.invalidateQueries({ queryKey: documentKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to remove document.')),
  })
}
