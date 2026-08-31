import { useState } from 'react'
import { Check, Home, Moon, Sun, Monitor } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore, useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { useSecureImageUrl } from '@/components/shared/secure-image'
import { useTheme } from '@/components/theme-provider'
import { useMyHousehold } from '@/features/households/hooks/use-households'
import { useIsFeatureEnabled } from '@/features/features/hooks/use-enabled-features'
import { GoodStandingPassCard } from '@/features/good-standing/components/good-standing-pass-card'
import { HouseholdDetailsDialog } from '@/features/households/components/household-details-dialog'
import { CommunitySettings } from '@/features/settings/components/community-settings'
import { ChangePasswordForm } from '@/features/settings/components/change-password-form'
import { BrandingSettings } from '@/features/branding/components/branding-settings'
import { useBranding } from '@/features/branding/hooks/use-branding'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Theme } from '@/components/theme-provider'

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const { theme, setTheme } = useTheme()
  const canBrand = useHasPermission(PERMISSIONS.communityBranding)
  const { data: branding, isLoading: brandingLoading } = useBranding()
  const { data: myHousehold } = useMyHousehold()
  const avatarUrl = useSecureImageUrl(user?.avatarUrl)
  const [householdOpen, setHouseholdOpen] = useState(false)
  const goodBadStandingEnabled = useIsFeatureEnabled('good-bad-standing')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, account, and community preferences."
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          {canBrand ? (
            <TabsTrigger value="branding">Branding</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your account details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-base">
                      {initials(user?.firstName, user?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {user?.firstName}{' '}
                      {user?.middleName ? `${user.middleName} ` : ''}
                      {user?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user?.referenceNumber}
                    </p>
                  </div>
                </div>

                <Separator />

                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium">{user?.email}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="font-medium">{user?.phoneNumber || '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Community</dt>
                    <dd className="font-medium">
                      {user?.community.displayName}
                    </dd>
                  </div>
                </dl>

                <Separator />

                <div className="flex flex-wrap items-center gap-2">
                  {user?.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  {user?.resident
                    ? `Resident ${user.resident.residentNumber}`
                    : 'No linked resident record'}
                  {user?.resident?.household
                    ? ` · ${[
                        user.resident.household.block &&
                          `Block ${user.resident.household.block}`,
                        user.resident.household.lot &&
                          `Lot ${user.resident.household.lot}`,
                        user.resident.household.unit &&
                          `Unit ${user.resident.household.unit}`,
                        user.resident.household.address,
                      ]
                        .filter(Boolean)
                        .join(', ')}`
                    : ''}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-6 lg:col-span-3">
              <ChangePasswordForm />

              <Card>
                <CardHeader>
                  <CardTitle>My Household</CardTitle>
                  <CardDescription>
                    Your household and unit details.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {myHousehold ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Home className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {[
                              myHousehold.block && `Block ${myHousehold.block}`,
                              myHousehold.lot && `Lot ${myHousehold.lot}`,
                              myHousehold.unit && `Unit ${myHousehold.unit}`,
                              myHousehold.address,
                            ]
                              .filter(Boolean)
                              .join(', ') || 'Unnamed unit'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {myHousehold.residentCount} resident
                            {myHousehold.residentCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <StatusBadge status={myHousehold.status} />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHouseholdOpen(true)}
                      >
                        View details
                      </Button>
                      {goodBadStandingEnabled ? (
                        <GoodStandingPassCard householdId={myHousehold.id} />
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You are not linked to a household yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <HouseholdDetailsDialog
                householdId={myHousehold?.id ?? null}
                open={householdOpen}
                onOpenChange={setHouseholdOpen}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Choose how CommunityOS looks to you.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {THEME_OPTIONS.map((option) => {
                      const Icon = option.icon
                      const active = theme === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setTheme(option.value)}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors',
                            active
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'hover:bg-accent',
                          )}
                        >
                          <div className="relative">
                            <Icon className="h-5 w-5" />
                            {active ? (
                              <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-3 w-3" />
                              </span>
                            ) : null}
                          </div>
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About CommunityOS</CardTitle>
                  <CardDescription>Platform information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-medium">v0.1.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Member since</span>
                    <span className="font-medium">—</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="community" className="mt-6">
          <CommunitySettings />
        </TabsContent>

        {canBrand ? (
          <TabsContent value="branding" className="mt-6">
            {brandingLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : branding ? (
              <BrandingSettings
                key={`${branding.primaryColor}-${branding.accentColor}-${branding.sidebarColor}-${branding.logoUrl}-${branding.faviconUrl}`}
                data={branding}
              />
            ) : null}
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
