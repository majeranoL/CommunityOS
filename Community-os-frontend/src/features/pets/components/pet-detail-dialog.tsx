import { ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/status-badge'
import { documentsService } from '@/features/documents/services/documents'
import { SecureImage } from '@/components/shared/secure-image'
import { usePet } from '@/features/pets/hooks/use-pets'
import { formatDate, toTitleCase } from '@/lib/format'

interface PetDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  petId: string | null
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || '—'}</p>
    </div>
  )
}

function CertificateLink({ label, url }: { label: string; url?: string | null }) {
  if (!url) return null
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="justify-between"
      onClick={() => documentsService.openFile({ fileUrl: url })}
    >
      {label}
      <ExternalLink className="ml-2 h-3.5 w-3.5" />
    </Button>
  )
}

export function PetDetailDialog({ open, onOpenChange, petId }: PetDetailDialogProps) {
  const { data: pet, isLoading } = usePet(open ? petId : null)

  const householdLabel = pet?.household
    ? [pet.household.block, pet.household.lot, pet.household.unit, pet.household.address]
        .filter(Boolean)
        .join(' · ')
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pet details</DialogTitle>
          <DialogDescription>
            {pet ? `${pet.petNumber} · registered ${formatDate(pet.createdAt)}` : 'Loading…'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !pet ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {pet.photoUrl ? (
                <button
                  type="button"
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted hover:opacity-90 transition-opacity shadow-sm"
                  onClick={() => documentsService.openFile({ fileUrl: pet.photoUrl })}
                  aria-label="Open pet photo"
                  title="Click to view full photo"
                >
                  <SecureImage
                    src={pet.photoUrl}
                    alt={pet.name}
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : null}
              <div>
                <p className="text-lg font-semibold">{pet.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={pet.status} />
                  <Badge variant="secondary">{toTitleCase(pet.species)}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Breed" value={pet.breed} />
              <DetailRow label="Sex" value={pet.sex} />
              <DetailRow label="Color" value={pet.color} />
              <DetailRow label="Birth date" value={pet.birthDate ? formatDate(pet.birthDate) : null} />
              <DetailRow label="Registration no." value={pet.registrationNumber} />
              <DetailRow label="Microchip no." value={pet.microchipNumber} />
              <DetailRow label="Household" value={householdLabel} />
              <DetailRow
                label="Caretaker"
                value={
                  pet.resident ? `${pet.resident.firstName} ${pet.resident.lastName}` : null
                }
              />
            </div>

            {pet.remarks ? (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Remarks
                  </p>
                  <p className="mt-1 text-sm">{pet.remarks}</p>
                </div>
              </>
            ) : null}

            {(pet.vaccinationCertificateUrl ||
              pet.rabiesCertificateUrl ||
              pet.veterinaryCertificateUrl) ? (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Certificates
                  </p>
                  <div className="flex flex-col gap-2">
                    <CertificateLink label="Vaccination certificate" url={pet.vaccinationCertificateUrl} />
                    <CertificateLink label="Rabies certificate" url={pet.rabiesCertificateUrl} />
                    <CertificateLink label="Veterinary certificate" url={pet.veterinaryCertificateUrl} />
                  </div>
                </div>
              </>
            ) : null}

            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Verification
              </p>
              <DetailRow label="Verified at" value={pet.verifiedAt ? formatDate(pet.verifiedAt) : null} />
              <DetailRow label="Verification remarks" value={pet.verificationRemarks} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
