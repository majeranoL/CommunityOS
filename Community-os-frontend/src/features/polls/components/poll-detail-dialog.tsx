import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useAddOption, usePoll, useVote } from '@/features/polls/hooks/use-polls'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'

interface PollDetailDialogProps {
  pollId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PollDetailDialog({ pollId, open, onOpenChange }: PollDetailDialogProps) {
  const { data: poll, isLoading } = usePoll(pollId)
  const [selected, setSelected] = useState<string[]>([])
  const [newOption, setNewOption] = useState('')

  const vote = useVote()
  const addOption = useAddOption()

  const isOpen = poll?.status === 'OPEN'
  const hasVoted = Boolean(poll && poll.votes.length > 0)
  const canVote = isOpen && !hasVoted
  const totalVotes = poll?._count.votes ?? 0
  const pollTotal = poll?.options.reduce((sum, option) => sum + (option._count?.votes ?? 0), 0) ?? 0

  const toggleSelection = (optionId: string) => {
    if (!poll) return
    setSelected((current) => {
      if (poll.allowMultiple) {
        return current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
      }
      return [optionId]
    })
  }

  const handleVote = () => {
    if (!poll || selected.length === 0) return
    vote.mutate(
      { id: poll.id, optionIds: selected },
      { onSuccess: () => setSelected([]) },
    )
  }

  const handleAddOption = () => {
    if (!poll || !newOption.trim()) return
    addOption.mutate(
      { id: poll.id, text: newOption.trim() },
      { onSuccess: () => setNewOption('') },
    )
  }

  const myVotedOptionIds = new Set(poll?.votes.map((voteRow) => voteRow.optionId) ?? [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{poll?.title}</DialogTitle>
          <DialogDescription>
            {poll?.status === 'OPEN' && poll.endAt
              ? `Voting ends ${formatDate(poll.endAt)}`
              : poll?.status === 'OPEN'
                ? 'Voting is open'
                : poll?.status === 'CLOSED'
                  ? 'Voting has closed'
                  : 'This poll is a draft'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !poll ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={poll.status === 'OPEN' ? 'success' : poll.status === 'CLOSED' ? 'muted' : 'secondary'}>
                {poll.status}
              </Badge>
              {poll.isAnonymous ? <Badge variant="outline">Anonymous</Badge> : null}
              {poll.allowMultiple ? <Badge variant="outline">Multiple choices</Badge> : null}
              <span className="text-xs text-muted-foreground">{totalVotes} votes</span>
            </div>

            {poll.description ? (
              <p className="text-sm text-muted-foreground">{poll.description}</p>
            ) : null}

            <Separator />

            <div className="space-y-2">
              {poll.options.map((option) => {
                const optionVotes = option._count?.votes ?? 0
                const percentage = pollTotal > 0 ? Math.round((optionVotes / pollTotal) * 100) : 0
                const isSelected = selected.includes(option.id)
                const isMine = myVotedOptionIds.has(option.id)

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={!canVote}
                    onClick={() => toggleSelection(option.id)}
                    className={cn(
                      'relative w-full overflow-hidden rounded-md border px-3 py-2.5 text-left text-sm transition-colors',
                      canVote
                        ? isSelected
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                        : 'cursor-default',
                    )}
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
                      style={{ width: canVote ? '0%' : `${percentage}%` }}
                    />
                    <div className="relative flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                          isSelected ? 'border-primary bg-primary' : 'border-input',
                        )}
                      >
                        {isSelected ? <Check className="h-3 w-3 text-primary-foreground" /> : null}
                      </span>
                      <span className="flex-1 font-medium">{option.text}</span>
                      {canVote ? null : (
                        <span className="text-xs text-muted-foreground">
                          {optionVotes} ({percentage}%)
                        </span>
                      )}
                      {isMine ? <Badge variant="success" className="text-[10px]">You</Badge> : null}
                    </div>
                  </button>
                )
              })}
            </div>

            {canVote ? (
              <Button className="w-full" disabled={selected.length === 0 || vote.isPending} onClick={handleVote}>
                {vote.isPending
                  ? 'Submitting…'
                  : poll?.allowMultiple
                    ? `Vote (${selected.length} selected)`
                    : selected.length > 0
                      ? 'Vote'
                      : 'Select an option to vote'}
              </Button>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {hasVoted ? 'You have already voted in this poll.' : 'Voting is not available right now.'}
              </p>
            )}

            {isOpen && poll.allowAddOptions ? (
              <div className="flex items-center gap-2 rounded-md border p-2">
                <Input
                  placeholder="Suggest an option…"
                  value={newOption}
                  onChange={(event) => setNewOption(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleAddOption()
                    }
                  }}
                />
                <Button variant="outline" size="icon" disabled={!newOption.trim() || addOption.isPending} onClick={handleAddOption}>
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">Add option</span>
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
