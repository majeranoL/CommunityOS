export type PollStatus = 'DRAFT' | 'OPEN' | 'CLOSED'

export interface PollOption {
  id: string
  pollId: string
  text: string
  createdAt: string
  updatedAt: string
  _count?: { votes: number }
}

export interface PollListItem {
  id: string
  communityId: string
  createdById: string
  title: string
  description: string | null
  status: PollStatus
  isAnonymous: boolean
  allowMultiple: boolean
  allowAddOptions: boolean
  startAt: string | null
  endAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  createdBy: { id: string; firstName: string; lastName: string }
  options: PollOption[]
  _count: { votes: number }
}

export interface PollDetail extends PollListItem {
  votes: { optionId: string }[]
}

export interface CreatePollInput {
  title: string
  description?: string
  status?: PollStatus
  isAnonymous?: boolean
  allowMultiple?: boolean
  allowAddOptions?: boolean
  startAt?: string
  endAt?: string
  options: string[]
}

export interface UpdatePollInput {
  title?: string
  description?: string
  status?: PollStatus
  isAnonymous?: boolean
  allowMultiple?: boolean
  allowAddOptions?: boolean
  startAt?: string
  endAt?: string
  options?: string[]
}
