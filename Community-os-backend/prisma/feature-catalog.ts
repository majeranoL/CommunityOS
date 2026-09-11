import { FeatureType, Prisma } from '@prisma/client';

export interface BuiltinFeature {
  code: string;
  name: string;
  description: string;
  type: FeatureType;
  dependencies: string[];
  configSchema?: Prisma.InputJsonValue;
}

export const BUILTIN_FEATURES: BuiltinFeature[] = [
  {
    code: 'pet-registration',
    name: 'Pet Registration & Management',
    description:
      'Register pets, link them to a household and caretaker, manage verification, certificates, and licenses.',
    type: FeatureType.OPTIONAL,
    dependencies: [],
    configSchema: {
      required: ['verificationMode'],
      properties: {
        verificationMode: { type: 'string', enum: ['auto', 'approval'] },
        documentsRequired: { type: 'boolean' },
      },
    },
  },
  {
    code: 'good-bad-standing',
    name: 'Good/Bad Standing',
    description:
      'Compute household standing from dues and restrict reserved services for delinquent households.',
    type: FeatureType.OPTIONAL,
    dependencies: [],
    configSchema: {
      properties: {
        delinquencyThresholdMonths: { type: 'number' },
        restrictedServices: { type: 'array' },
      },
    },
  },
  {
    code: 'construction-management',
    name: 'Construction/Renovation Management',
    description:
      'Manage construction and renovation applications, bonds, and inspections.',
    type: FeatureType.OPTIONAL,
    dependencies: [],
  },
  {
    code: 'visitor-gate-management',
    name: 'Visitor & Gate Management',
    description:
      'Create visitor invitations, generate passes, and verify visitors at the gate.',
    type: FeatureType.OPTIONAL,
    dependencies: [],
  },
  {
    code: 'household-credit',
    name: 'Household Credit',
    description:
      'Let finance officers and superadmins issue, adjust, and void household credits which automatically offset future dues.',
    type: FeatureType.OPTIONAL,
    dependencies: [],
    configSchema: {
      properties: {
        autoApplyOnPayment: { type: 'boolean' },
      },
    },
  },
  {
    code: 'finance-transparency',
    name: 'Finance Transparency',
    description:
      'Expose expense reports, utility bills, and income statements to non-admin members when enabled for a community.',
    type: FeatureType.OPTIONAL,
    dependencies: [],
  },
  {
    code: 'vehicle-stickers',
    name: 'Vehicle Sticker Management',
    description:
      'Issue and manage vehicle parking stickers with verification, renewal, and status tracking.',
    type: FeatureType.OPTIONAL,
    dependencies: [],
  },
  {
    code: 'complaints',
    name: 'Complaints & Incidents',
    description:
      'Residents submit complaints, incidents, and service requests with officer assignment and resolution.',
    type: FeatureType.STANDARD,
    dependencies: [],
  },
  {
    code: 'documents',
    name: 'Documents & Digital Records',
    description:
      'Centralized storage for HOA, household, financial, and pet documents with versioning and audit.',
    type: FeatureType.STANDARD,
    dependencies: [],
  },
  {
    code: 'events-calendar',
    name: 'Community Calendar & Events',
    description:
      'Publish HOA events, meetings, deadlines, and facility schedules on a shared calendar.',
    type: FeatureType.STANDARD,
    dependencies: [],
  },
  {
    code: 'reports-analytics',
    name: 'Reports & Analytics',
    description:
      'Operational and financial reporting with filters and Excel/CSV export.',
    type: FeatureType.STANDARD,
    dependencies: ['documents'],
  },
];

// Default config values applied to a community when the feature is provisioned.
export const BUILTIN_FEATURE_CONFIGS: Record<string, Prisma.InputJsonValue> = {
  'pet-registration': {
    verificationMode: 'auto',
    documentsRequired: false,
    rulesUrl: '',
  },
  'good-bad-standing': {
    delinquencyThresholdMonths: 3,
    restrictedServices: ['facility_reservations'],
  },
  'household-credit': {
    autoApplyOnPayment: true,
  },
};
