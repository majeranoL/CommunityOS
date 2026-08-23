export type AssessmentStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'WAIVED'
  | 'CANCELLED'

export type PaymentStatus =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REFUNDED'
  | 'CANCELLED'

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'GCASH'
  | 'CREDIT_CARD'
  | 'CHEQUE'
  | 'OTHER'

export type FinanceCategory =
  | 'DUES'
  | 'SPECIAL_ASSESSMENT'
  | 'BOND'
  | 'FACILITY_FEE'
  | 'VEHICLE_STICKER'
  | 'PARKING_FEE'
  | 'UTILITY'
  | 'MEMBERSHIP_FEE'
  | 'LATE_PENALTY'
  | 'VIOLATION_FINE'
  | 'OTHER'

export type ChargeRecurrence = 'RECURRING' | 'ONE_TIME'

export type BillingPeriodStatus = 'OPEN' | 'PAID' | 'OVERDUE' | 'WAIVED' | 'CANCELLED'

export interface HouseholdRef {
  id: string
  block: string | null
  lot: string | null
  unit: string | null
}

export interface ChargeTypeRef {
  id: string
  code?: string
  name: string
  category: FinanceCategory
}

export interface BillingPeriodRef {
  id: string
  periodKey: string
  label: string
  status: BillingPeriodStatus
  dueDate?: string | null
}

export interface AssessmentListItem {
  id: string
  assessmentNumber: string
  title: string
  description: string | null
  householdId: string
  amount: string | number
  dueDate: string
  period: string | null
  paidAmount: string | number
  remarks: string | null
  status: AssessmentStatus
  createdAt: string
  updatedAt: string
  household: HouseholdRef | null
  chargeType: ChargeTypeRef | null
  billingPeriod: BillingPeriodRef | null
}

export interface AssessmentPaymentRef {
  id: string
  paymentNumber: string
  amount: string | number
  paymentDate: string
  method: PaymentMethod
  status: PaymentStatus
  verifiedAt: string | null
}

export interface PaymentAllocation {
  id: string
  assessmentId: string
  allocatedAmount: string | number
  reversedAt: string | null
  assessment: {
    id: string
    assessmentNumber: string
    title: string
    period: string | null
  }
}

export interface Assessment extends AssessmentListItem {
  payments: AssessmentPaymentRef[]
  allocations: (PaymentAllocation & { payment?: AssessmentPaymentRef })[]
}

export interface CreateAssessmentInput {
  assessmentNumber: string
  title: string
  description?: string
  householdId: string
  amount: number
  dueDate: string
  period?: string
  remarks?: string
  chargeTypeId?: string
  billingPeriodId?: string
}

export interface UpdateAssessmentInput {
  assessmentNumber?: string
  title?: string
  description?: string
  householdId?: string
  amount?: number
  dueDate?: string
  period?: string
  remarks?: string
  chargeTypeId?: string
  billingPeriodId?: string
}

export interface ResidentRef {
  id: string
  firstName: string
  lastName: string
  householdId?: string
}

export interface UserRef {
  id: string
  firstName: string
  lastName: string
}

export interface PaymentListItem {
  id: string
  paymentNumber: string
  amount: string | number
  paymentDate: string
  method: PaymentMethod
  referenceNumber: string | null
  remarks: string | null
  status: PaymentStatus
  createdAt: string
  updatedAt: string
  chargeType: ChargeTypeRef | null
  allocations: PaymentAllocation[]
  resident: ResidentRef | null
}

export interface Payment extends PaymentListItem {
  rejectionReason: string | null
  proofFileId: string | null
  proofUrl: string | null
  verifiedAt: string | null
  rejectedAt: string | null
  refundedAt: string | null
  cancelledAt: string | null
  verifiedBy: UserRef | null
  rejectedBy: UserRef | null
  refundedBy: UserRef | null
  cancelledBy: UserRef | null
}

export interface PaymentReceiptCommunity {
  displayName: string
  address: string | null
  contactNumber: string | null
  email: string | null
  logoUrl: string | null
}

export interface PaymentReceipt {
  payment: Payment & {
    resident: (ResidentRef & {
      middleName: string | null
      suffix: string | null
      household: (HouseholdRef & { address: string | null }) | null
    }) | null
  }
  community: PaymentReceiptCommunity | null
}

export interface PaymentAllocationInput {
  assessmentId: string
  amount: number
}

export interface CreatePaymentInput {
  paymentNumber: string
  allocations?: PaymentAllocationInput[]
  assessmentId?: string
  billingPeriodIds?: string[]
  residentId: string
  amount: number
  paymentDate: string
  method?: PaymentMethod
  referenceNumber?: string
  remarks?: string
  proofFileId?: string
  proofUrl?: string
  chargeTypeId?: string
}

export interface UpdatePaymentInput {
  paymentNumber?: string
  allocations?: PaymentAllocationInput[]
  assessmentId?: string
  billingPeriodIds?: string[]
  residentId?: string
  amount?: number
  paymentDate?: string
  method?: PaymentMethod
  referenceNumber?: string
  remarks?: string
  proofFileId?: string
  proofUrl?: string
  chargeTypeId?: string
}

export interface ResidentOption {
  id: string
  householdId: string | null
  firstName: string
  middleName: string | null
  lastName: string
  suffix: string | null
}

// ==============================================
// Charge types
// ==============================================

export interface ChargeType {
  id: string
  code: string
  name: string
  category: FinanceCategory
  recurrence: ChargeRecurrence
  amount: string | number
  dueDay: number | null
  description: string | null
  allowAdvancePayment: boolean
  advanceAppliesToOneTime: boolean
  gracePeriodDays: number
  lateFeeType: 'NONE' | 'FIXED_AMOUNT' | 'PERCENT'
  lateFeeValue: string | number | null
  autoGenerate: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  _count?: {
    billingPeriods: number
    assessments: number
  }
}

export interface CreateChargeTypeInput {
  code: string
  name: string
  category?: FinanceCategory
  recurrence?: ChargeRecurrence
  amount?: number
  dueDay?: number
  description?: string
  allowAdvancePayment?: boolean
  advanceAppliesToOneTime?: boolean
  gracePeriodDays?: number
  lateFeeType?: 'NONE' | 'FIXED_AMOUNT' | 'PERCENT'
  lateFeeValue?: number | null
  autoGenerate?: boolean
  isActive?: boolean
  sortOrder?: number
}

export type UpdateChargeTypeInput = Partial<CreateChargeTypeInput>

// ==============================================
// Billing periods
// ==============================================

export interface BillingPeriod {
  id: string
  periodKey: string
  label: string
  startDate: string
  endDate: string | null
  dueDate: string
  amount: string | number
  status: BillingPeriodStatus
  createdAt: string
  updatedAt: string
  chargeType: ChargeTypeRef
  _count?: {
    assessments: number
  }
}

export interface CreateBillingPeriodInput {
  chargeTypeId: string
  periodKey: string
  label?: string
  startDate?: string
  endDate?: string
  dueDate?: string
  amount?: number
}

export interface GenerateBillingPeriodsInput {
  chargeTypeId: string
  periodKey: string
  months?: number
  dueDate?: string
  amount?: number
}

// ==============================================
// Finance transactions (ledger)
// ==============================================

export type FinanceTransactionType = 'payment' | 'charge'

export interface FinanceTransaction {
  id: string
  type: FinanceTransactionType
  category: FinanceCategory
  date: string
  description: string
  amount: number
  status: string
  reference: string | null
  household: HouseholdRef | null
}

export interface FinanceTransactionSummary {
  income: number
  expenses: number
  balance: number
}

// ==============================================
// Import / export
// ==============================================

export type ImportKind = 'payments' | 'assessments' | 'expenses' | 'utility-readings'
export type ExportFormat = 'csv' | 'xlsx'

export interface ImportBatch {
  id: string
  module: string
  fileName: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK'
  canRollback: boolean
  resultCounts: {
    total: number
    valid: number
    invalid: number
    imported?: number
  } | null
  errors: { _row: number; errors: string[] }[] | null
  processedAt: string | null
  rolledBackAt: string | null
  createdAt: string
}

export interface ImportPreviewResult {
  batchId: string
  totalRows: number
  validRows: number
  invalidRows: number
  preview: Record<string, unknown>[]
  invalid: { _row: number; errors: string[] }[]
}

export interface GenerateAssessmentsInput {
  title?: string
  description?: string
  period?: string
  amount?: number
  dueDate: string
  remarks?: string
  householdIds?: string[]
  chargeTypeId?: string
  billingPeriodId?: string
}

export interface DuesMonthSummary {
  periodKey: string
  label: string
  perHousehold: number
  householdCount: number
  paidCount: number
  partialCount: number
  unpaidCount: number
  overdueCount: number
  waivedCount: number
  totalExpected: number
  totalCollected: number
  dueDate: string | null
}

export interface DuesMonthHousehold {
  assessmentId: string
  householdId: string
  block: string | null
  lot: string | null
  unit: string | null
  amountDue: number
  paidAmount: number
  status: AssessmentStatus
  lastPaymentDate: string | null
}

export interface DuesMonthDetail {
  summary: DuesMonthSummary
  households: DuesMonthHousehold[]
}

export interface CreateDuesMonthInput {
  month: string
  amount?: number
  dueDate?: string
}

export interface DuesMonthMutationResult {
  periodKey: string
  createdCount: number
  skippedCount: number
  householdCount: number
}

export interface GenerateAssessmentsResult {
  createdCount: number
  skippedCount: number
  created: Assessment[]
}

export type DuesCellStatus =
  | AssessmentStatus
  | 'NONE'

export type DuesStanding = 'GOOD' | 'BAD'

export interface DuesTrackerCell {
  assessmentId: string
  status: DuesCellStatus
}

export interface DuesTrackerRow {
  householdId: string
  unitLabel: string
  monthsPaid: number
  monthsBehind: number
  outstanding: number
  standing: DuesStanding
  periods: Record<string, DuesTrackerCell>
}

export interface DuesPeriodSummary {
  period: string
  billed: number
  collected: number
  paidCount: number
  householdCount: number
  collectionRate: number
  collectedRate: number
}

export interface DuesTracker {
  periods: string[]
  rows: DuesTrackerRow[]
  summaries: Record<string, DuesPeriodSummary>
}

// ==============================================
// Expenses
// ==============================================

export type ExpenseCategory =
  | 'UTILITIES'
  | 'MAINTENANCE'
  | 'SALARIES'
  | 'SUPPLIES'
  | 'EVENTS'
  | 'SECURITY'
  | 'TAXES'
  | 'INSURANCE'
  | 'TRANSPORTATION'
  | 'OTHER'

export interface CreatedByRef {
  id: string
  firstName: string
  lastName: string
}

export interface Expense {
  id: string
  expenseNumber: string
  title: string
  description: string | null
  category: ExpenseCategory
  amount: string | number
  expenseDate: string
  paymentMethod: PaymentMethod
  payee: string | null
  referenceNumber: string | null
  notes: string | null
  receiptFileId: string | null
  receiptUrl: string | null
  isImported: boolean
  createdAt: string
  updatedAt: string
  createdBy: CreatedByRef | null
}

export interface CreateExpenseInput {
  title: string
  description?: string
  category?: ExpenseCategory
  amount: number
  expenseDate: string
  paymentMethod?: PaymentMethod
  payee?: string
  referenceNumber?: string
  notes?: string
  receiptFileId?: string
  receiptUrl?: string
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>

// ==============================================
// Income statement (fund transparency)
// ==============================================

export interface IncomeStatementCategory {
  category: ExpenseCategory
  amount: number
  count: number
}

export interface IncomeStatementMonthly {
  month: string
  income: number
  expenses: number
}

export interface IncomeStatementSummary {
  income: number
  expenses: number
  fundBalance: number
  billed: number
}

export interface IncomeStatement {
  from: string | null
  to: string | null
  summary: IncomeStatementSummary
  categories: IncomeStatementCategory[]
  monthly: IncomeStatementMonthly[]
  expenses: Expense[]
}

// ==============================================
// Utility Expenses
// ==============================================

export type UtilityType =
  | 'ELECTRICITY'
  | 'WATER'
  | 'GARBAGE'
  | 'SEWERAGE'
  | 'INTERNET'
  | 'OTHER'

export interface UtilityExpense {
  id: string
  utilityNumber: string
  providerName: string
  utilityType: UtilityType
  amount: string | number
  expenseDate: string
  billingPeriod: string | null
  paymentMethod: PaymentMethod
  referenceNumber: string | null
  invoiceNumber: string | null
  description: string | null
  receiptFileId: string | null
  isImported: boolean
  createdAt: string
  updatedAt: string
  createdBy: CreatedByRef | null
}

export interface CreateUtilityExpenseInput {
  providerName: string
  utilityType: UtilityType
  amount: number
  expenseDate: string
  billingPeriod?: string
  paymentMethod: PaymentMethod
  referenceNumber?: string
  invoiceNumber?: string
  description?: string
  receiptFileId?: string
}

export type UpdateUtilityExpenseInput = Partial<CreateUtilityExpenseInput>

export interface UtilityExpenseSummary {
  totalAmount: number
  totalCount: number
  byType: { type: UtilityType; total: number; count: number }[]
  byProvider: { provider: string; total: number; count: number }[]
}

// ==============================================
// Finance overview (plain-language dashboard)
// ==============================================

export interface FinanceOverviewSummary {
  collected: number
  expenses: number
  availableFunds: number
  billed: number
  unpaid: number
}

export interface FinanceOverviewRecentIn {
  id: string
  date: string
  description: string
  category: FinanceCategory | string
  method: PaymentMethod | string
  amount: number
  payer: string | null
  household: HouseholdRef | null
  reference: string | null
}

export interface FinanceOverviewRecentOut {
  id: string
  kind: 'expense' | 'utility'
  date: string
  description: string
  category: ExpenseCategory | string
  method: PaymentMethod | string
  amount: number
  payee: string | null
  reference: string | null
}

export interface FinanceOverviewNeedsAttention {
  pendingVerificationPayments: number
  pendingVerificationAmount: number
  householdsWithUnpaidDues: number
  overdueAssessments: number
  missingMeterReadings: number
}

export interface FinanceOverview {
  summary: FinanceOverviewSummary
  recentMoneyIn: FinanceOverviewRecentIn[]
  recentMoneyOut: FinanceOverviewRecentOut[]
  needsAttention: FinanceOverviewNeedsAttention
}

// ==============================================
// Utility billing (per-household metered/fixed)
// ==============================================

export type UtilityRateMode = 'METERED' | 'FIXED'

export interface TieredRate {
  upTo: number | null
  rate: number
}

export interface UtilityBillingConfig {
  id: string
  utilityType: UtilityType
  name: string
  rateMode: UtilityRateMode
  unitRate: string | number | null
  fixedRate: string | number | null
  tieredRates: TieredRate[] | null
  isActive: boolean
  chargeType: ChargeTypeRef | null
}

export interface UtilityBillingConfigInput {
  utilityType: UtilityType
  name?: string
  rateMode: UtilityRateMode
  unitRate?: number | null
  fixedRate?: number | null
  tieredRates?: TieredRate[] | null
  isActive?: boolean
}

export interface UtilityReading {
  id: string
  periodKey: string
  previousReading: string | number | null
  currentReading: string | number | null
  usage: string | number
  readingDate: string
  notes: string | null
  isImported: boolean
  importBatchId: string | null
  household: HouseholdRef & { id: string }
  utilityConfigId: string
}

export interface UtilityBillingResult {
  periodKey: string
  createdCount: number
  skippedExisting: number
  noReadings: number
}

