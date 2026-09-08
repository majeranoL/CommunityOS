COMMUNITYOS – IMPLEMENTATION REQUIREMENTS AND IMPROVEMENTS

Implement the following changes and improvements for CommunityOS. Follow the existing architecture, database conventions, authentication, authorization, UI design system, and coding patterns. Before making schema changes, inspect the existing models and relationships and reuse them where possible.

The system must remain simple and understandable for HOA officers and residents who may not be highly IT-literate.

1. COMMUNITY PROVISIONING AND COMMUNITY ACCOUNT

Change the community provisioning or community creation flow back to using a separate Community Account.

When a new community is created, the community email address should be used to create or identify the initial administrative login account for that HOA. However, this account must NOT automatically be assigned to a Household and must NOT automatically be treated as a normal Resident.

The Community Account should exist independently from Household and Resident records.

The initial Community Account should automatically receive the President role for the newly created community.

Relationship:
Community → Community Account / Initial Administrator → Automatically assigned President role

The community email is used for login and administration, but the system must not automatically create or link that account to a Household, Block/Lot, Resident record, or normal household membership.

If the Community Account later needs to be associated with a Resident or Household, that relationship must be created explicitly through the appropriate workflow.

Clearly distinguish:
- Community information
- Community Account
- Initial President/Administrator role
- Optional later Resident or Household relationship

2. VEHICLE STICKER REQUEST WORKFLOW

For normal residents, replace the button named "Issue Sticker" with "Request Sticker".

Residents request a sticker. Authorized HOA officers review, approve, and issue the actual sticker.

Workflow:
Resident → Request Sticker → Submit vehicle information → Select quantity if allowed → Pay if required → Pending → Officer review → Approve/Reject → Issue Sticker → Generate sticker number → Active

Residents must not directly issue their own stickers.

3. AUTOMATIC STICKER NUMBER GENERATION

Sticker numbers must be generated automatically based on the last successfully issued sticker and must remain unique.

Example:
STK-000001
STK-000002
STK-000003

Generate numbers safely on the backend/database level rather than relying only on the frontend. Prevent duplicates during simultaneous requests or officer actions.

If numbering is community-specific, scope the sequence to the correct community.

4. STICKER AVAILABILITY DATE, ISSUE DATE, AND EXPIRATION

Sticker validity must follow the HOA's configured annual sticker cycle instead of simply adding one year from each resident's request date.

The system must distinguish:
- Request Date
- Approval Date
- Actual Issue Date
- Sticker Cycle Start Date
- Sticker Expiration Date

Example cycle:
Availability starts: April 1, 2026
Expiration: April 30, 2027

A sticker issued in April 2026 follows this cycle.

A sticker requested or issued in December 2026 should still expire in April 2027 rather than December 2027.

Authorized HOA officers should configure the annual sticker cycle. The system must consistently calculate expiration using the active cycle.

5. STICKER QUANTITY SELECTION

Allow residents to select sticker quantity when the HOA permits multiple stickers.

Example:
Quantity: [-] 1 [+]

Calculate:
Sticker Quantity × Price Per Sticker = Total Sticker Fee

If multiple stickers are not allowed, keep quantity fixed at 1 and hide unnecessary controls.

A single request may contain multiple stickers, but every issued physical sticker must have its own unique sticker number.

Example request quantity: 3
Generated stickers:
STK-000101
STK-000102
STK-000103

6. STICKER PAYMENT AND ISSUANCE

Connect sticker fees to the existing Finance and Payment systems.

A Sticker Request should show:
- Sticker fee
- Quantity
- Total amount
- Payment status
- Payment method
- Payment reference where applicable

The HOA should configure whether:
- Payment is required before approval
- Payment is required before issuance
- The sticker is free
- Payment requires manual verification

A submitted request must not automatically activate a sticker.

7. OFFICIAL RECEIPT PRINTING

Fix Official Receipt printing.

When the user clicks Print, print only the receipt document, not the entire application page.

Do not print:
- Sidebar
- Navigation
- Buttons
- Unrelated content

Implement a proper print view or print-only CSS using @media print.

The printed result must preserve the receipt layout, spacing, readable fonts, and correct transaction details. It should also work properly when the user saves it as a PDF through the browser print dialog.

8. SEPARATE NOTIFICATION COUNTS

Fix sidebar notification badges so notification counts are specific to the authenticated user.

Normal residents must not see officer notification counts.

Example:
Officer Complaints: 5
This may mean five complaints requiring officer attention.

Resident Complaints: 1
This may mean a status update or response to that resident's complaint.

Associate notifications with:
- Recipient User
- Recipient Role where appropriate
- Community
- Related Module
- Related Record
- Read/Unread Status

Sidebar badges should show unread notifications relevant only to the currently logged-in user and accessible modules.

9. RESET DATABASE AND CREATE A COMPLETE DEMO COMMUNITY

Clear the existing development/demo database data and create a new realistic Demo Community containing records across major CommunityOS features.

IMPORTANT: Never perform destructive deletion against production without explicit verification. Confirm the active environment before clearing data.

Create repeatable development/demo reset and seed workflows.

The Demo Community should contain internally consistent data for:

COMMUNITY
- Demo HOA
- Settings
- Branding
- Address and contact information

USERS AND ROLES
- President
- Treasurer
- Secretary
- Other officers
- Residents
- Administrative users
- Different permission scenarios

HOUSEHOLDS
- Multiple Blocks
- Multiple Lots
- Different household situations

RESIDENTS
- Multiple residents
- Different household memberships
- At least one resident associated with multiple households for testing

FINANCE
- Monthly dues
- Paid, unpaid, and overdue dues
- Assessments
- Pending and verified payments
- Expenses
- Utilities if supported
- Other charges
- Income and expense records
- Ledger entries

COMMUNICATION
- Announcements
- Announcements with images
- Events
- Events with images
- Polls if supported
- Documents

COMPLAINTS
- Open
- In progress
- Resolved
- Image evidence
- Video evidence if supported

OPERATIONS
- Visitors
- Facilities
- Reservations if supported
- Maintenance
- Staff
- Vehicles
- Sticker requests
- Issued stickers
- Pending requests

DOCUMENTS
- Public document
- Private/restricted document
- PDF
- DOC/DOCX where supported

NOTIFICATIONS
- Resident notifications
- Officer notifications
- Read and unread examples

AUDIT LOGS
- Sample auditable actions

Do not create disconnected random records. All seeded relationships must be valid.

The goal is to support UI testing, permission testing, feature demonstrations, finance testing, and multi-household testing.

10. CONSTRUCTION AND RENOVATION MANAGEMENT REVIEW

Inspect the existing Construction and Renovation Management feature before changing it.

Review:
- Database models
- Backend endpoints
- Frontend pages
- Forms
- Status workflow
- Permissions
- Document handling
- Fees and payment handling if applicable

Then explain how the existing feature currently works.

The explanation must cover:
1. Who can submit a request
2. Required information
3. Required documents
4. Who reviews it
5. Approval/rejection workflow
6. Available statuses
7. Fees
8. Payment connection
9. Start and end dates
10. Inspection/progress tracking
11. Who can view requests
12. Audit logs

After reviewing it, provide:

CURRENT IMPLEMENTATION
- What already works
- How the current workflow behaves

POSSIBLE IMPROVEMENTS
- Missing functionality
- Security concerns
- UX issues
- Recommended workflow improvements

Do not redesign working functionality without identifying a clear issue first.

Evaluate the current feature against this possible workflow:

Resident/Household → Submit Construction/Renovation Request → Upload Requirements/Documents → Pay Permit/Processing Fee if Required → Officer Review → Approved / Rejected / Requires Revision → Construction Start → Progress or Inspection Tracking if Supported → Completion → Closed and Archived

11. ONE RESIDENT OR USER BELONGING TO MULTIPLE HOUSEHOLDS

Modify the Household and Resident relationship so one Resident/User can be associated with multiple Households when necessary.

Do NOT duplicate the Resident.

Example:
Juan Dela Cruz owns:
Block A - Lot 1
Block B - Lot 5

Juan should have one canonical Resident/User identity and multiple household relationships.

Use a junction or relationship model such as ResidentHousehold.

Relationship:
Resident/User → ResidentHousehold → Household A
                                  → Household B
                                  → Household C if applicable

The relationship should support:
- Resident ID
- Household ID
- Relationship Type
- Is Primary Household
- Ownership/Occupancy role
- Start Date
- End Date where applicable
- Active/Inactive status

Example:
Juan Dela Cruz

Block A - Lot 1
Role: Owner
Primary: Yes

Block B - Lot 5
Role: Owner
Primary: No

This supports:
- Multiple property ownership
- Living in one property while owning another
- Multiple household memberships
- One identity and login account

Only one active household relationship should normally be marked as Primary unless the business rules explicitly support otherwise.

The Primary Household is the default context after login.

The user must be able to switch between authorized households.

Example:
Current Household: Block A - Lot 1

[Switch Household]

Available:
- Block A - Lot 1 (Primary)
- Block B - Lot 5

When switching household context, load only data belonging to that selected household.

This includes:
- Statement of Account
- Monthly dues
- Assessments
- Payments
- Utility bills
- Vehicles
- Sticker requests
- Household documents
- Household-specific complaints where applicable

Financial balances must remain separate.

Example:
Block A - Lot 1: Outstanding ₱1,000
Block B - Lot 5: Outstanding ₱2,500

Do not combine balances by default.

A combined owner summary may optionally be provided later, but the underlying financial records must remain independent.

Permissions should consider:
1. Authenticated User
2. Resident identity
3. Relationship to the selected Household
4. Community-wide role

A person may simultaneously be:
- Owner of Household A
- Tenant of Household B
- Community Treasurer

Community-wide officer permissions must remain independent from household membership.

DATA MIGRATION

Inspect the existing schema before changing relationships.

If the current system assumes Resident → Household as a direct relationship, safely migrate existing assignments into the new ResidentHousehold relationship.

Existing relationship:
Resident → Household

New relationship:
Resident → ResidentHousehold → Household

Existing assignments should become active ResidentHousehold records and normally be marked as Primary.

Do not lose existing household assignments.

12. GENERAL REQUIREMENTS

Before implementation:
- Inspect the existing schema.
- Inspect frontend and backend functionality.
- Reuse existing models and services where possible.
- Do not duplicate finance, user, resident, or household logic.
- Do not break authentication or authorization.
- Keep Community Account, User login, Resident identity, and Household membership clearly separated.

After implementation, test:

1. Creating a community with a separate Community Account.
2. Verifying it is not automatically assigned to a Household.
3. Verifying it receives the President role.
4. Resident sticker requests.
5. Officer approval and issuance.
6. Sequential unique sticker numbers.
7. Multiple sticker quantities.
8. Multiple issued stickers with unique numbers.
9. Annual sticker expiration cycles.
10. Late-year requests expiring according to the configured cycle.
11. Sticker payment workflow.
12. Official Receipt printing without printing the full application.
13. Different notification counts for officers and residents.
14. Resetting only the intended development/demo database.
15. Seeding a complete Demo Community.
16. Reviewing and documenting Construction/Renovation functionality.
17. One Resident belonging to two Households.
18. Switching household context.
19. Keeping financial balances separate.
20. Safely migrating existing household assignments.

Prioritize data integrity, correct permissions, auditability, and simplicity for non-technical HOA users.


Below are the current todo and done task check this first before reading everything else
[✓] Phase 1 schema (StickerRequest/Sequence/StickerRequestStatus + migration)
[✓] Phase 1 backend service/controller/DTOs (request-centric, officer-gated create, sequence numbering, cycle settings)
[✓] Phase 1 backend tests + build (24 spec tests, prune build, full jest green)
[✓] Phase 1 frontend rewrite (requests model, quantity, cycle settings)
[✓] Phase 1 frontend verification (tsc/vitest/eslint pass, vite build ok)
[✓] Phase 2 official receipt printing (print-only receipt, hides app shell/portals, page margins, PDF-safe)
[•] Phase 3 notification sidebar badges (user-specific counts) -> [DONE] GET /notifications/unread-by-module (groupBy type), sidebar badge map to per-user unread per module (complaints/facilities/announcements/events/polls/vehicles/stickers/finance), SSE invalidation, specs + builds green
[ ] Phase 4 multi-household refactor (ResidentHousehold junction, activeHouseholdId, switch) -> [DONE] ResidentHousehold junction + HouseholdRelationshipType/HouseholdMembershipStatus enums + Resident.primaryHouseholdId; migration + hand-written backfill (existing assignments -> ACTIVE + PRIMARY, verified 14/14, zero missing); session me()/login/refresh now return resident.households (active memberships); PATCH /households/switch (assessment.view, validates ACTIVE membership + ACTIVE household, updates Resident.householdId); POST /residents/:id/households (resident.verify, adds association, first association -> active+primary); topbar SwitchHouseholdButton dropdown (primary badge, clears query cache, reloads dashboard); 4 new switch specs, backend 208 + frontend 42 tests green
[ ] Phase 5 Community Account (President provisioning, optional unit) -> [DONE] User.isCommunityAccount flag (+ migration add_is_community_account); provision() only links Household/Resident when the caller explicitly requires it (requireUnit=true superadmin path) - self-signup never auto-creates Household/Resident/membership even when unit fields are provided; initial account always created with isCommunityAccount=true + President role; session login/refresh/profile now return isCommunityAccount; get-started owner step no longer requires unit/address (optional); frontend SessionUser.isCommunityAccount; 5 new provision specs (self-signup independent, unit-info ignored, explicit requireUnit links, missing unit 400, duplicate email 409); backend 213 + frontend 42 tests green
[ ] Phase 6 demo reset/seed guard (SEED_CONFIRM=yes, prod host detection) -> [DONE] prisma/seed.ts now aborts unless SEED_CONFIRM=yes (clear instructions printed), and blocks production/managed hosts (NODE_ENV=production or DATABASE_URL host matching prod patterns incl. .railway./supabase.co/aws/azure/gcp/etc.) unless SEED_ALLOW_PRODUCTION=yes override; demo data completeness: seed now creates ResidentHousehold ACTIVE+PRIMARY memberships for all 14 residents, adds a second FAMILY membership for Maria Dela Cruz (demo Treasurer) to demo the Phase 4 topbar household switcher, and marks the demo community-account President (admin@communityos.com) isCommunityAccount=true; guard smoke-tested (no-confirm abort + prod-host abort, exit 1 before any DB touch), no new lint issues introduced
[x] Phase 7 construction/renovation management (initial workflow implemented)

Implementation scope: optional `construction-management` feature with resident
construction/renovation requests, community-configurable required documents,
officer approval/rejection/completion/closure, bond assessment creation through
the existing Finance system, officer bond refund/forfeiture, community-scoped
uploads, permissions, and audit events. Inspection/progress milestones and
automated bond refund remain intentionally deferred because the approved first
version selected no inspection subsystem and officer-controlled bond resolution.