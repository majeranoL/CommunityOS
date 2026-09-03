import { PageHeader } from '@/components/shared/page-header'
import { PaymentMethodsManager } from '@/features/finance/components/payment-methods-manager'
import { platformPaymentMethodsService } from '@/features/admin/services/platform-payment-methods'

export default function AdminPaymentMethodsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Payment methods"
        description="Configure how communities pay for their CommunityOS subscription (GCash / Maya / bank)."
      />
      <PaymentMethodsManager
        service={platformPaymentMethodsService}
        queryKey={['platform-payment-methods', 'admin']}
      />
    </div>
  )
}