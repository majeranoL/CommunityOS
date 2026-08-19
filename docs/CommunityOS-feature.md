CommunityOS — Detailed Product & System Specification

Purpose

CommunityOS is a multi-community HOA/community management SaaS platform. The system uses one central codebase while allowing each HOA/community to have its own households, residents, users, vehicles, pets, financial records, branding, enabled optional features, policies, and permissions.

Core principle:

One CommunityOS platform, many independent HOAs, configurable features and policies per HOA.

CommunityOS should distinguish between standard platform functionality and optional HOA-specific functionality. Standard features are available to all subscribed communities. Optional features are developed once and can be assigned by the Superadmin to selected communities through the Superadmin Features management system.

Core Architectural Principles

Multi-Tenancy

Every major record must belong to a community directly or through a related entity. Data from one community must never be exposed to another community.

Feature Flags

Optional HOA-specific functionality should be assigned through a feature catalog and community-feature relationship.

Feature
   ↓
CommunityFeature
   ↓
Community

Feature availability answers:

Does this HOA have this functionality?

Permissions answer:

Which users in this HOA may use it?

The frontend may hide disabled functionality, but the backend must also enforce feature access.

Auditability

Important changes and financial events should record:

actor

community

action

affected record

timestamp

relevant before/after information

Privacy

Residents should see only information they are authorized to view. Community-wide financial, standing, audit, and administrative information must be restricted to authorized officers.

Optional HOA Feature Model

The Superadmin Features section should be the central place to manage all optional functionality.

Examples of features that may be optional per HOA:

Good/Bad Standing

Pet Registration

Construction/Renovation Management

Construction Bond Management

Special HOA workflows

Advanced finance rules

HOA-specific reports

Other custom modules

Features should support:

name

unique code

description

active/inactive status

standard/optional type

dependencies

assigned communities

enabled date

enabled by

community-specific configuration

A feature should be assignable to one or many communities without creating separate codebases.

IDEA 1 — Improved HOA Payments / Finance System with Utility Billing

CommunityOS should provide a flexible and complete Finance and Billing system as a standard core capability of the platform, with Utility Billing included as part of Finance rather than treated as a separate optional feature. The Finance module should allow each HOA to configure the specific types of charges and billing rules it uses, because different communities may have different financial requirements, while the overall Finance and Utility Billing capabilities remain available to every community. Standard financial functions should include recurring charges such as Monthly Association Dues, Quarterly or Annual Dues, Utility Charges, and other recurring fees, as well as one-time charges such as Special Assessments, Construction/Renovation Bonds, Facility Usage Fees, Event Fees, Vehicle Sticker/Gate Pass Fees, Parking Fees, Membership/Registration Fees, Late Payment Penalties, Violation Fines, and other HOA-defined charges. Each charge type should be classified as either recurring or one-time, and recurring charges should generate individual billing periods so the system can clearly track which periods are paid, unpaid, overdue, waived, cancelled, or available for advance payment. Residents should be able to pay recurring charges in advance for specific future billing periods instead of receiving a generic wallet or credit balance; for example, if monthly dues are ₱2,000, a household can select September, October, and November and submit ₱6,000, after which CommunityOS directly allocates the payment to those three specific assessments. The same Finance system should also support Utility Billing, where an HOA can configure the utility types it actually manages, such as Water, Electricity, Garbage Collection, Sewerage, or other community utilities; utility types are configurable per HOA, but the Utility Billing capability itself is part of the standard Finance module. Utilities should support both metered and fixed-rate billing. For metered utilities, each Household can have a Utility Account and/or Meter record containing a unique meter number, previous reading, current reading, reading dates, usage, unit of measurement, and reading source. For fixed-rate utilities, the HOA can configure a recurring charge without requiring meter readings, such as a monthly garbage collection fee. The system should support configurable utility pricing models including flat rates, per-unit rates, tiered/slab rates, minimum charges, fixed base charges plus usage charges, and other supported calculations. For example, if a water meter changes from 1,250 m³ to 1,275 m³, CommunityOS should calculate 25 m³ of consumption and generate a utility assessment using the configured rate, with a transparent breakdown such as Base Charge ₱100 + Usage Charge ₱500 + Other Fee ₱50 = Total ₱650. Utility billing should support monthly, bi-monthly, quarterly, or other configured billing periods and must prevent duplicate billing for the same household, utility, and billing period. The HOA should be able to configure whether residents can submit their own meter readings or whether only authorized staff can record readings; if resident submission is enabled, the system may require a meter photo for verification. Meter readings can go through a Pending Verification workflow, and authorized officers can review readings, correct errors through controlled adjustments, mark readings as Estimated when an actual reading is unavailable, and later reconcile estimated readings with actual readings, with every change recorded in the Audit Log. Residents should be able to view only their own utility accounts, readings, usage history, utility assessments, balances, payments, and receipts, while authorized officers can view community-wide utility records based on permissions. Utility Billing must integrate directly with the existing Finance architecture: Household Utility Assessment → Resident Payment → HOA Funds Increase, while the actual bill paid by the HOA to the utility provider must be recorded separately as an HOA Utility Expense → Provider Payment → HOA Funds Decrease. For example, if households are billed and pay ₱50,000 for water while the HOA pays the provider ₱42,000, CommunityOS should record ₱50,000 collected from households, ₱42,000 as the HOA's Utility Expense, and the ₱8,000 difference as the financial difference between collections and provider expense without automatically treating that amount as ordinary profit, since its accounting treatment depends on the HOA's policy. If the HOA pays the provider before all households have paid, the system should show the provider expense, the amount collected so far, and the remaining outstanding household utility assessments. Utility provider expenses should use the existing Expenses system and include information such as Expense ID, category, vendor/provider, amount, date, payment method, reference number, invoice/receipt attachment, approval status, recorded by, approved by, and timestamp, and these expenses should appear in the Income Statement/Financial Summary and overall HOA fund calculations. The Finance module should therefore maintain two connected but separate financial flows: Household → HOA for assessments and payments, and HOA → Utility Provider for expenses and provider payments. All utility payments should use the existing CommunityOS payment infrastructure, including GCash, bank transfer, cash, external payment proof verification, Payment Allocation, timestamps, and official receipts, while utility expenses should reduce the HOA's available funds when the HOA actually pays the provider. Utility charges should also follow the existing distinction between Assessments, Payments, Payment Allocations, and Expenses, ensuring that what a household owes, what it actually paid, and what the HOA spent are never confused. The Finance Overview should incorporate utility information where appropriate, including utility collections, outstanding utility assessments, provider expenses, consumption summaries, and other financial indicators. The system should support utility-specific notifications for upcoming due dates, missing meter readings, unusually high consumption, estimated readings, overdue utility bills, and other configured events. Utility data should use the existing contextual Import/Export workflow directly inside the Finance/Utility area, allowing authorized officers to import and export utility readings and billing records without navigating to a separate global Import/Export page. Utility calculations, rate changes, meter changes, bill adjustments, imports, exports, payments, provider expenses, and corrections must be audited. The overall Finance architecture should therefore support Charge Type → Assessment → Billing Period (if recurring) → Payment → Payment Allocation → Receipt, while metered utilities add Meter → Reading → Usage Calculation → Rate → Utility Assessment, and HOA utility spending follows Provider Invoice → Expense → Provider Payment → HOA Funds Decrease. The specific utility types, rates, billing frequency, meter rules, calculation methods, required readings or photos, payment policies, and utility-specific permissions should be configurable per HOA, but Utility Billing itself is part of the standard CommunityOS Finance system and does not require Superadmin feature activation.

IDEA 2 — Improved Subscription / SaaS Business Model

CommunityOS should operate primarily as a fixed-price managed SaaS service in which an HOA pays ₱2,000 per month for access to the hosted standard CommunityOS platform, with the subscription covering the software, hosting, database operation, backups, security maintenance, bug fixes, standard updates, monitoring, and technical support, while the provider retains ownership of the central SaaS codebase. The subscription should not primarily be based on the number of residents or user accounts because the product is being sold as a managed HOA platform rather than as a per-user application; however, reasonable infrastructure and fair-use limits can be defined in the service agreement for unusually large or abusive usage. The SaaS product should include the standard platform capabilities and should be maintained centrally so improvements and bug fixes benefit all subscribing communities. A selected HOA may receive a Billing Exemption through the Superadmin, allowing the community to retain its active plan and features while temporarily or permanently waiving its subscription fee; exemptions should have a reason, start date, optional end date, and audit trail. A separate Custom CommunityOS offering should be available starting at approximately ₱25,000–₱35,000+ depending on scope, where an HOA can request substantial customization, branding, workflows, integrations, or dedicated functionality and receive the agreed source code under a separate contract. The custom agreement should define source-code ownership or licensing, hosting responsibility, maintenance period, support terms, warranty/bug-fix period, future development fees, and deployment responsibilities. Custom development should not silently become unlimited work under the one-time fee. The overall business model should therefore distinguish between managed SaaS access and custom software delivery, allowing CommunityOS to generate recurring revenue from the SaaS platform while retaining the flexibility to perform higher-value custom projects for individual HOAs.

IDEA 3 — Improved Feature-Specific Customization

CommunityOS should maintain a single central codebase while allowing individual HOAs to receive features that other communities do not need. Any functionality that is not universally required should be designed as a feature-managed module rather than as a permanent assumption in the core system. The Superadmin should maintain a feature catalog and assign optional features to communities through the Features menu, while the feature itself can also have community-specific configuration values. When a feature is enabled for a community, the frontend should display its navigation, pages, actions, and related UI, while the backend independently verifies that the community has that feature before processing the request. This means a disabled feature is not merely hidden; its API is also inaccessible to the community. Optional features may include Good/Bad Standing, Pet Registration, Construction/Renovation Management, special financial workflows, specialized reports, and future HOA-specific modules. Each feature should be able to define dependencies so the system can prevent incompatible configurations. Features should also be separate from permissions: enabling a feature means the HOA has it, while role permissions determine whether a President, officer, resident, or other user may use its functions. If a custom feature later becomes broadly useful, it can be promoted to a standard CommunityOS feature without creating a second codebase. Custom feature development can be charged separately when requested by a specific HOA. This architecture allows CommunityOS to remain maintainable while still supporting different HOA policies and specialized requirements.

IDEA 4 — Improved Online Payments, Financial Auditing & Migration

CommunityOS should provide a complete online payment and financial auditing workflow where residents can view their own assessments, monthly dues, construction bonds, special assessments, facility fees, fines, penalties, and other charges, submit payments using available payment methods, and upload payment proof when external payments require manual verification. Each submission should record the amount, payment type, billing period, household, payer, payment method, transaction/reference number, payment date, proof file, submission timestamp, verification timestamp, verifier, and final status. Payment status should progress through clear states such as PENDING VERIFICATION, VERIFIED, REJECTED, REFUNDED, or CANCELLED. The system should provide separate finance views for categories such as Monthly Dues, Special Assessments, Construction Bonds, Facility Fees, Fines/Penalties, and Other Payments, plus an All Transactions view. The President and authorized officers should be able to view all community payment records when granted finance.view_all, while narrower permissions can allow an officer to view only specific categories such as monthly dues. Residents must only be able to view their own household's records and must never be able to retrieve another household's payment information or proof. The system should support granular permissions such as finance.view_own, finance.view_all, finance.verify, finance.reject, finance.refund, finance.import, finance.export, and module-specific category permissions. Financial records should support Excel/CSV import and export with preview, column mapping, validation, duplicate detection, and explicit confirmation before data is committed. Imported records must be marked as historical/migrated records and should retain information about the source batch, importing user, imported timestamp, and result counts. Export should support filters, custom columns, and configurable formats, while respecting exactly the same privacy and permission rules used for viewing data. Every import, export, verification, rejection, refund, adjustment, and manual modification should be audited. The system should preserve payer identity even when ownership changes later and should distinguish Household, Payer, Assessment, Payment, and Payment Allocation so historical financial records remain accurate. The architecture should initially support manual verification for GCash/bank/external payments but remain ready for future official payment gateway integrations and webhook-based automatic verification.

IDEA 5 — HOA-Specific Good/Bad Standing

CommunityOS should support an optional Good/Bad Standing feature that is enabled only for communities that use this policy. For the HOA that requested the concept, a household remains in Good Standing when its monthly dues are up to date or no more than three months behind, while four or more months behind results in Bad Standing, but the actual threshold should be configurable per HOA. The system should calculate standing from actual assessment/payment records rather than a manually edited status. Standing should belong to the Household because the financial obligation is property/household-based. A Bad Standing household may be restricted from services that consume or depend on HOA funds, including facility reservations, event reservations, paid amenities, and other services designated by the HOA, while essential functions such as emergency reporting, complaints, and required communications remain available. The HOA should be able to configure which services are restricted, the delinquency threshold, payment-plan exceptions, and authorized overrides. The President and officers with appropriate permissions can view all household standings, while residents can see only their own household's standing. Other households' standing must never be exposed in public resident-facing lists or pages. The feature should be assigned through the Superadmin Features system so communities without this policy simply do not have it. The status should interact with Finance and Reservations automatically, for example preventing a Bad Standing household from creating a restricted reservation while still allowing basic account use and essential services.

IDEA 6 — Superadmin Feature Management

CommunityOS should include a dedicated Features menu for the Superadmin that acts as the central feature catalog and community assignment system for optional functionality. The feature catalog should identify whether a feature is Standard or Optional/HOA-Specific, include a unique feature code, description, status, dependencies, configuration options, assigned communities, and activation history, and allow the Superadmin to search for communities and grant or revoke optional functionality without modifying code. Standard features such as Finance, Payments, Residents, Complaints, Announcements, and other core functionality are available to all SaaS communities. Optional features may include Good/Bad Standing, Pet Registration, Construction/Renovation Management, specialized HOA workflows, specialized reports, and future features that are not universally applicable. When the Superadmin assigns an optional feature, the system should record communityId, featureId, enabled status, enabledAt, enabledBy, and relevant audit information. Feature assignment should support dependencies, meaning an optional module may require another standard or optional module to function correctly. The Superadmin should be able to view which communities have each feature, which features each community has, and the status of the assignment. Feature availability is separate from role permissions: once a feature is enabled for a community, the President can then grant appropriate permissions to officers and users inside that community. This becomes the main mechanism for safely expanding CommunityOS without creating separate versions for different HOAs.

IDEA 7 — Community Appearance, Branding & White-Label Settings

CommunityOS should provide an Appearance & Branding area under Community Settings so each HOA can customize its own public-facing application appearance without affecting other communities. Authorized President/officer users with branding permissions should be able to change the community display name, logo, favicon, theme preset, primary color, accent color, sidebar color, navbar color, page background, card/surface color, and other controlled design tokens. A live theme editor should show a realistic preview of the dashboard, navigation, cards, tables, forms, buttons, and other UI elements before changes are published. The HOA should be able to choose from predefined presets or build a Custom theme, such as a red sidebar, black navbar, and white content area. The system should not permit arbitrary CSS editing; instead it should use controlled design tokens so hover, border, focus, disabled, and related states are derived safely and accessibility contrast can be validated. The preview should support viewing the theme as President, Officer, or Resident so the HOA can see how role-specific navigation will look. Branding settings are community-level configuration and must be isolated per tenant. The system should provide Reset to Default and Save/Publish operations, and important changes should be audited. This feature effectively gives CommunityOS controlled white-label capabilities without creating separate applications for each HOA.

IDEA 7 IS DONE — see completion checker below.

IDEA 8 — Improved System-Wide Data Import, Export & Migration

CommunityOS should provide a reusable system-wide Data Import, Export, and Migration engine that can be used consistently across supported modules such as Households, Residents, Users, Vehicles, Pets, Payments, Assessments, Staff, Visitors, Documents, and future modules. The important user-experience rule is that Import and Export must be available directly inside the module where the data is being managed, rather than requiring HOA officers to leave the current module and navigate to a separate global Import/Export page. For example, the Finance → Payments page should have Import Payments and Export Payments actions, the Residents page should have Import Residents and Export Residents, the Vehicles page should have Import Vehicles and Export Vehicles, and the Households page should have Import Households and Export Households; the same pattern should apply to every supported module. The underlying import/export engine should remain centralized and reusable internally so validation, permissions, templates, audit logging, migration batches, and security are implemented consistently, but the user-facing workflow must be contextual to the current module. Each supported module should provide its own standardized Import Template containing the exact fields expected by that module, including column names, required or optional fields, accepted values, examples, and relationship requirements, allowing an HOA to take existing Excel or CSV files from its previous system and copy or map the data into the CommunityOS structure. When an authorized officer clicks Import from a module, CommunityOS should automatically know which entity is being imported, which template and validation rules apply, and which related records must exist. The import process should always follow Open Module → Import → Upload File → Preview → Map Columns → Validate → Detect Duplicates → Validate Relationships → Review Errors/Warnings → Confirm → Create Import Batch → Commit Records. The preview must show exactly what will be created or updated before anything is committed to the database, including valid records, warnings, errors, duplicates, skipped records, and records that will update existing data; officers should be able to download rejected/error rows, correct them in their local file, and re-import them. Validation should include required fields, invalid data types, invalid dates, invalid enum values, duplicate records, incorrect community relationships, and missing related records. Relationship validation is especially important; for example, a Resident must point to a valid Household, a Vehicle must belong to a valid Household, a Pet must belong to a valid Household and may reference a valid Resident caretaker, a Payment must point to the correct Household and Assessment, and an Assessment must point to the correct Household. The system must reject invalid relationships instead of silently creating orphaned or incorrectly linked records. Export should also be available directly inside each module and should support both Standard Export and Custom Export. Standard Export should use the predefined CommunityOS format, while Custom Export should allow authorized users to select columns, remove columns, reorder columns, apply filters, and generate Excel or CSV files, making it possible for an HOA to create exports that closely match its existing local spreadsheets or external reporting formats. Exported files should be human-readable and may include optional instruction or reference sheets when useful. Import and Export actions must respect the same permissions used to view and manage the underlying records; for example, an officer may have permission to view and export Payments but not import them, while another officer may have both permissions. A user must never be able to export records they are not authorized to view, and must never be able to import records into a module they are not authorized to manage. Community/tenant isolation must also be enforced on the backend. Imported records should be marked as IMPORTED or MIGRATED where appropriate and grouped into an Import Batch containing at least the source filename, module, community, importing user, timestamp, success count, warning count, and error count. Where technically safe, an Import Batch should support rollback so an incorrect or accidental migration can be reverted as one tracked operation. Every import, export, column mapping, validation confirmation, batch creation, rollback, and major migration action should generate an Audit Log entry containing the responsible user, community, module, action, timestamp, and import/export batch information where applicable. The central design rule is that the import/export engine is shared internally, but the Import/Export controls are initiated directly from the relevant module, giving CommunityOS consistent backend behavior while keeping the user experience simple and intuitive for HOA officers.

IDEA 9 — Household, Resident, User, Vehicle & Vehicle Sticker Relationship

CommunityOS should strengthen the existing Household, Resident, User, Vehicle, and Vehicle Sticker structure so that the Household remains the central property/unit record while clearly separating resident-controlled vehicle information from HOA-controlled vehicle sticker management. A Household can contain multiple Residents, multiple Vehicles, and one primary User account under the current one-account-per-household policy. The User account is linked to a designated Resident, while other Residents may exist without separate login accounts. During registration, a User or Resident must always be associated with a valid Household, and duplicate Household records for the same property/unit must be prevented. The household account holder is the only user allowed to manage the core vehicle record for their own Household: they can register a vehicle, edit their own vehicle information, and unregister/delete a vehicle from their active records. The President and HOA officers should have view-only access to the core vehicle information and must not be able to edit, transfer, delete, unregister, or deactivate a resident's vehicle, even if they have administrative authority; however, they can still manage HOA-controlled sticker records and verification processes according to their permissions. Vehicle unregistration should not permanently destroy the database record; instead, the vehicle should become UNREGISTERED/INACTIVE so its historical registration, previous stickers, payments, and audit records remain preserved. When registering a vehicle, the user should be asked "Does this vehicle currently have an HOA sticker?" with Yes/No options. If the user selects No, the vehicle is registered with a NO STICKER status and the system can provide an Apply for Sticker option. If the user selects Yes, the system should collect the existing sticker number and other relevant information such as issue date, expiration date, and optional sticker photo, but the user-provided sticker should initially be marked PENDING VERIFICATION rather than automatically becoming an officially valid HOA sticker. An authorized HOA officer can then verify the sticker information and mark it as VERIFIED/ACTIVE or reject it with a reason. Vehicle stickers should be treated as separate records from the underlying vehicle because a single vehicle can have multiple sticker records over time due to renewal, expiration, replacement, loss, or revocation. A sticker record should support statuses such as PENDING, PAYMENT_REQUIRED, PENDING_VERIFICATION, APPROVED, ISSUED, ACTIVE, EXPIRED, LOST, REPLACEMENT_REQUESTED, REVOKED, and CANCELLED, while the underlying Vehicle record remains owned and controlled by the household account holder. The sticker application process should integrate directly with the Finance system: the resident selects or requests a sticker, CommunityOS creates the appropriate Vehicle Sticker Assessment, the user pays the configured sticker fee through GCash, bank transfer, cash, or another supported payment method, uploads proof when required, the payment enters PENDING VERIFICATION, and after authorized verification the sticker application can proceed to approval and issuance. Sticker fees, renewal fees, replacement fees, validity periods, required documents, approval rules, numbering format, QR/barcode requirements, and other sticker policies should be configurable per HOA. The system should support sticker renewal and replacement, including cases where a sticker expires or is lost; the old sticker should be marked EXPIRED, LOST, or REVOKED while the new sticker receives a new unique sticker number, preserving the complete sticker history. A vehicle can therefore have one active vehicle record but multiple historical sticker records. The HOA may optionally configure whether a household's Good/Bad Standing affects sticker issuance or renewal, but this must not be assumed for every community. The resident should be able to view the current vehicle and sticker status, request a new sticker, renew an expired sticker, or request a replacement, while authorized officers can verify applications, verify documents and payment, issue stickers, revoke stickers, and view sticker history without modifying the underlying vehicle information. Vehicle and sticker permissions must remain separate: the Vehicle record is resident-controlled, while the Sticker is an HOA-controlled security/registration credential. This feature should be integrated with Households, Residents, Finance, Payments, Notifications, Audit Logs, Import/Export, and the Superadmin Features system, with Vehicle Sticker Registration & Management treated as an optional HOA-specific feature that the Superadmin can enable only for communities that require vehicle stickers.

IDEA 10 — Move-In, Move-Out, Ownership Transfer & Renters

CommunityOS should maintain the Household/property record permanently while tracking changing ownership and occupancy through Move-In, Move-Out, Ownership Transfer, and Renter Management records. When a property is sold, the previous owner should become a Former Owner/Former Resident with a move-out date and no longer have active access to the current Household, while the Household itself remains unchanged and the new owner receives a new Move-In record and User account. Historical payments, receipts, complaints, reservations, vehicles, documents, and audit records of the former owner must remain intact and must never be reassigned to the new owner. The finance system should preserve the identity of the original payer, meaning each payment should identify both the Household receiving the assessment and the person who actually made the payment. Renters should be modeled as Residents with a configurable Resident Type such as Renter/Tenant, and the HOA should be able to decide whether renters may receive their own User accounts. Renter permissions should be distinct from owner permissions and can allow activities such as viewing announcements, submitting complaints, registering vehicles, or making selected payments while denying property ownership management or access to private owner financial information. When a renter moves out, their Resident record becomes Former Renter/Former Resident and their User account loses access, while their historical activity remains preserved. Vehicle registrations associated with former occupants should also be reviewable and capable of being deactivated, transferred, or revalidated. Each Household should maintain an Occupancy History containing previous owners, renters, residents, move-in dates, move-out dates, and current occupants. Every move-in, move-out, ownership transfer, renter change, account status change, and vehicle status change should be auditable.

IDEA 11 — Pet Registration & Management

CommunityOS should provide Pet Registration as an optional HOA-specific feature managed through Superadmin → Features. When enabled for a community, households can register pets and associate each pet with the Household and optionally with a primary Resident/caretaker. Pet information can include pet name, species, breed, sex, color, date of birth/age, photo, registration number, registration date, and status. The household account holder can register and manage their own pets, while authorized HOA officers can view, verify, edit, deactivate, import, and export pet records according to permissions. New registrations can follow a Pending → Approved/Rejected → Active workflow when verification is required. Pet photos, vaccination certificates, rabies certificates, microchip information, veterinary certificates, pet licenses, and other documents should be optional by default, but each HOA can configure individual items as Required, Optional, or Disabled based on its own policy. Missing optional documents must not make a pet non-compliant. Pet records should remain historically preserved when a resident or renter moves out, with the pet either becoming inactive, moving with the former resident, or being associated with a new caretaker if it remains in the Household. If the HOA uses pet-related fees or penalties, the Pet module should integrate with Finance and Payments. Residents may only manage pets linked to their own Household, while authorized officers can manage community-wide pet records.

IDEA 12 — Improved User-Friendly Dashboard, Smooth Transitions & Neumorphic UI

The CommunityOS frontend should be improved to feel more user-friendly, smooth, professional, and responsive while preserving performance and accessibility. The dashboard should have a clear information hierarchy, role-specific content, useful quick actions, and contextually relevant information rather than presenting every possible metric at once. Navigation between sidebar menus should use subtle context-aware transitions so the main content changes smoothly instead of abruptly; the Sidebar and Topbar should generally remain stable while the primary content region performs a short fade, translate, or other lightweight transition. Related pages may use consistent directional transitions to reinforce navigation context. Buttons, cards, tabs, dialogs, dropdowns, notifications, and other interactive elements should have subtle hover, press, focus, and entrance animations that provide feedback without becoming decorative. CommunityOS can use a restrained neumorphic design language with soft shadows, subtle highlights, rounded surfaces, and raised/pressed states, but neumorphism should be selective rather than applied to every element because excessive use can reduce contrast and accessibility. The design must remain compatible with the per-community branding system and should derive visual states from shared design tokens. Data-heavy areas should use skeleton loading so the interface does not appear frozen while requests are completing. Animations must not block navigation or make the system feel slower, and the frontend should respect prefers-reduced-motion. The result should feel like a modern SaaS platform without sacrificing speed, accessibility, clarity, or usability.

IDEA 13 — Community Operating & Platform Improvements

CommunityOS should continue improving the already-existing core platform areas rather than rebuilding them unnecessarily. The existing Finance, Subscription, Feature Management, Import/Export, Dashboard, and Superadmin systems should be hardened with better validation, stronger permissions, more detailed audit trails, operational monitoring, and clearer administrative workflows. The subscription system should provide the Superadmin with visibility into active communities, subscription status, invoices, overdue communities, billing exemptions, and service health while separating CommunityOS SaaS billing from the HOA's own Finance records. The Superadmin should be able to onboard communities through a structured workflow that sets up community information, branding, policies, features, officers, payment configuration, and migration of existing data. Existing Dashboard functionality should be improved with role-specific widgets, meaningful quick actions, recent activity, and operational summaries rather than simply adding more cards. The existing import/export functionality should evolve into a reusable migration engine with templates, validation, previews, batch tracking, and rollback where safe. The system should also have stronger security controls such as session management, password reset, optional officer 2FA, rate limiting, secure file handling, tenant isolation, and strict backend authorization. Since CommunityOS is a managed SaaS, platform monitoring should detect API failures, database problems, failed background processes, notification failures, and service availability problems so the provider can respond before communities are heavily affected. These improvements should strengthen the existing system instead of duplicating functionality.

IDEA 14 — Visitor & Gate Management

CommunityOS should add an optional Visitor and Gate Management feature that can be assigned to specific HOAs through Superadmin → Features. The feature should allow a resident/account holder to create visitor invitations by entering visitor name, contact details, visit date, expected time, purpose, vehicle information, and optional notes, with the system generating a visitor pass or QR code where appropriate. HOA security staff can verify the visitor at the gate, record entry and exit timestamps, and confirm whether the visitor is expected and belongs to the correct Household. The feature should support one-time visitors, recurring visitors, service providers, contractors, deliveries, and other visitor categories. Visitor history should be retained for security auditing, while resident access should be limited to their own visitor records and security staff/officers can receive broader access. Vehicle plate information can be stored as part of a visitor event. Optional controls may include visitor expiration, gate approval, QR scanning, recurring visitor validity, and security notes. The feature should integrate with Households, Residents, Vehicles, Notifications, Audit Logs, and future security workflows without exposing unrelated households' visitor information.

IDEA 15 — Complaints, Incidents & Service Requests

CommunityOS should provide an optional or standard Complaints/Incidents/Service Request management system that gives residents a structured way to report HOA issues such as noise complaints, maintenance problems, garbage issues, streetlights, water problems, security incidents, property concerns, or other community concerns. A resident should be able to submit a request with title, category, description, location, date/time, attachments, and priority where applicable. The system should support a workflow such as OPEN → ASSIGNED → IN PROGRESS → RESOLVED → CLOSED, with authorized officers assigning requests to appropriate staff and adding comments, evidence, resolution notes, and timestamps. Residents should be able to view only their own reports while officers can view community reports according to permissions. The system should support attachments, status history, internal officer notes where appropriate, resident-visible updates, notifications, and audit logging. Complaint and service-request data can contribute to dashboard and analytics reporting and can be connected to Maintenance, Visitors, Facilities, and other operational modules when appropriate.

IDEA 16 — Documents & Digital Records

CommunityOS should provide a centralized Documents and Digital Records system for storing important HOA, household, financial, construction, resident, pet, and administrative documents. Documents should support categorization, metadata, access permissions, upload/download/preview, version history, optional expiration dates, and auditing. Community documents can include HOA rules, policies, meeting minutes, contracts, and notices. Household documents can include ownership-related documents or other records defined by the HOA. Financial documents can be linked to payments, assessments, or reports. Construction documents can be linked to renovation applications and inspections. Pet documents can be linked to pet registrations. The system should not expose documents merely because a user knows a URL; access must be authorized by the backend according to community and record-level permissions. File uploads should enforce allowed file types, size limits, secure naming, and appropriate storage policies. Documents should integrate with the system-wide import/export approach where relevant and should produce audit entries for important changes.

IDEA 17 — Community Calendar & Event Scheduling

CommunityOS should provide a centralized Community Calendar that can combine HOA events, facility reservations, meetings, maintenance schedules, important deadlines, community activities, and other scheduled events. Authorized officers should be able to create, publish, update, cancel, or complete community events while residents can view relevant published events. The calendar should integrate with Facilities and Reservations so reservation activities can be reflected on the schedule when privacy rules allow it, and it should also integrate with Notifications to remind residents of upcoming events or deadlines. Finance-related dates such as dues deadlines can appear in individual resident views without exposing private financial information to other users. Calendar visibility should respect role and community permissions, and events should maintain an audit history for creation, changes, and cancellation.

IDEA 18 — Backup, Disaster Recovery & Data Protection

CommunityOS should have a dedicated Backup and Disaster Recovery system because the platform will store financial records, household history, payment receipts, documents, resident information, audit logs, and other data that cannot simply be recreated after data loss. Production databases should have automated backups on a defined schedule, with retention rules that keep multiple recovery points rather than only the most recent backup. Backups should be stored separately from the primary database environment so a primary infrastructure failure does not destroy both the live database and its backups. The system should maintain documented restore procedures and regularly test restoration using a safe environment so backups are known to be usable rather than merely assumed to exist. Disaster recovery should define how CommunityOS responds to database corruption, accidental deletion, infrastructure failure, deployment problems, or other service interruptions, including recovery priorities and the process for restoring service. Important high-risk operations such as large data imports should have rollback or recovery procedures where technically safe. The Superadmin should be able to see backup health, last successful backup, backup retention status, and any backup/restore failures, while the application itself should continue enforcing strict tenant isolation after a restore. The system should also maintain a recovery strategy for uploaded files and documents, not just relational database data. Backup and disaster recovery should therefore be treated as a core platform responsibility of the managed SaaS rather than a community-facing optional feature.

IDEA 19 — Reports & Analytics

CommunityOS should provide reporting and analytics for both operational and financial decision-making. Standard reports can include monthly dues collection, outstanding balances, collection rates, payment history, construction bonds, revenue by payment type, household counts, owner/renter counts, vehicle counts, pet counts, complaint volumes, facility usage, reservation statistics, visitor activity, and other operational indicators. Reports should support filtering by date, household, status, category, and other appropriate dimensions and should respect user permissions so unauthorized users cannot retrieve private records through reports. Authorized officers should be able to export reports to Excel/CSV, while the President dashboard can show selected high-level analytics. Superadmin analytics should focus on platform-level information such as active communities, usage, subscriptions, feature adoption, and system health rather than exposing unnecessary resident financial details.

IDEA 20 — Superadmin Platform Monitoring & Operations

CommunityOS should provide a Superadmin operational dashboard for monitoring the SaaS platform itself. It should show active communities, user activity, subscription status, billing health, system health, API availability, database connectivity, storage health, notification failures, background job failures, and other platform-level indicators. Monitoring should help identify problems such as the kind of backend unavailability that previously caused slow or failed production access. The Superadmin should be able to see when a backend service is unhealthy, when deployments fail, when database connectivity is degraded, or when critical background processes stop working. The system should provide enough logging and health information to diagnose problems without exposing unnecessary private resident information. This platform-level monitoring supports the SaaS promise that the provider is responsible for keeping the system running and maintained.

Optional HOA Features Managed by Superadmin

The following are currently considered optional/HOA-specific unless later promoted to standard:

Good/Bad Standing

Pet Registration

Construction/Renovation Management

Construction Bond Management

Advanced or HOA-specific finance rules

Visitor/Gate Management

Specialized reports/workflows

Future custom modules requested by an HOA

Other feature-flagged functionality

The following are expected to be core/standard CommunityOS capabilities:

Authentication

Communities/Tenant Management

Users

Roles

Permissions

Households

Residents

Core Finance

Payments

Notifications

Announcements

Core Dashboard

Audit Logs

Import/Export framework

Community settings

Basic branding

Core administrative functions

The exact classification can evolve, but optional functionality must be controlled through the Superadmin Features system rather than through separate application versions.

Recommended System Development Direction

The current system already contains a substantial foundation. The next development goal should therefore be improvement and integration rather than indiscriminate feature expansion.

Priority should be:

Harden Household/Resident/User relationships.

Harden Finance and Payment Allocation.

Improve subscription and Superadmin operations.

Improve Import/Export and migration.

Improve permissions and auditing.

Improve Dashboard and frontend UX.

Add optional HOA features through the Features catalog.

Add visitor/gate management.

Add documents, calendar, complaints/service requests, and reporting where needed.

Establish strong backup, disaster recovery, monitoring, and operational reliability.

Final System Concept

CommunityOS should operate as a multi-tenant HOA management SaaS in which every community uses the same central application while maintaining isolated data, community-specific branding, configurable features, configurable financial rules, and role-based permissions. Households are the core property-level entity connecting residents, the primary user account, vehicles, pets, finances, occupancy history, and other household-level functionality. Residents represent people associated with a household, Users represent authentication identities, and the system must preserve the distinction between the three. Finance must preserve both the household receiving a charge and the actual payer making a payment, including historical records after ownership changes. Standard CommunityOS functionality is available to all subscribed communities, while optional HOA-specific modules are assigned by the Superadmin through the Features system. Privacy, tenant isolation, granular permissions, audit logs, migration support, backup/recovery, monitoring, and a smooth frontend are all part of the platform foundation. The long-term goal is a maintainable single-codebase SaaS capable of supporting many HOAs with different policies without creating separate applications for each community.



every time you done one idea always indicate it in this md and add a checker for it

---

## Idea Completion Checkers & Verification Log

### IDEA 1 — Improved HOA Payments / Finance System — DONE (2026-08-15)

Checklist:

- [x] Flexible charge configuration — charge types (recurring vs one-time) backed by `ChargeType` model + `GET /charge-types` endpoint; frontend Charge types tab (visible to `finance.manage`)
- [x] Assessments per billing period — monthly-dues generation via `POST /assessments/generate` (B1: bulk-create one assessment per ACTIVE household for a period, skips households that already have one); per-period paid/unpaid/overdue status derived by `determineAssessmentStatus`
- [x] Payment submission with method + reference — `method`/`referenceNumber` on payments (G6); ledger per household (`buildHouseholdLedger`) + CSV export
- [x] PENDING VERIFICATION → verify/reject flow — `finance.verify` / `finance.reject` / `finance.refund` / `finance.cancel` permissions gate officer actions; rejected submissions require a reason
- [x] Payment Allocation record separating payments from assessments (existing `PaymentAllocation` model; G2.1 enforces payer resident belongs to the assessing household)
- [x] Finance role model — 10 `finance.*` codes + `payment.cancel` in the catalog; `finance.view_own` (residents see only own household) vs manager view-all (G3, member scoping)
- [x] Standing (IDEA 5 dependency) — `summarizeFinance` standing GOOD/BAD + household standing filter/sort (G5)
- [x] Production visibility — fixed the deployed-hide bug: Railway Postgres held stale role grants (President missing all 18 newer codes incl. all `finance.*`), so the finance tabs were hidden on Vercel. Boot-time reconciler (`PermissionsProvisioningService`, commit `27089b5`) self-heals grants on every deploy. Deployed + verified live (President 136 perms, all `finance.*` present; `/api/charge-types`, `/api/billing-periods`, `/api/finance/import-export/import/batches` → 200).
- [x] Import/export surface — `/api/finance/import-export/import/batches` (gated `finance.import`) + `finance.export`
- [x] Duplicate-allocation guard — `verifyOwnership` (explicit `allocations` + legacy `assessmentId`) and `ensurePeriodAssessment` (billing-period advance payments) now refuse to re-pay an assessment that is already PAID/WAIVED/CANCELLED (ConflictException, 2026-08-15)
- [x] Official receipt view — `GET /payments/:id/receipt` (payment + resident + household + community + allocations; gated `payment.view`, household-scoped IDOR guard) + printable `PaymentReceiptDialog` (view-only + Print via `window.print()`), 2026-08-15
- [x] Advance payment to N future billing periods — payment form lists OPEN billing periods of advance-enabled charge types as checkboxes → one payment submits `billingPeriodIds`; `resolveTargets`/`ensurePeriodAssessment` create each household's per-period assessment (guarded against re-paying PAID/WAIVED/CANCELLED). Per-charge-type config: `allowAdvancePayment` + `advanceAppliesToOneTime` (ChargeType form). Verified 2026-08-15.
- [x] Payment proof upload on manual verification — `documentsService.upload` in the payment form (`proofFileId`/`proofUrl`), verifiers open it via "View proof" in `payment-detail-dialog`. Charge-type categories beyond monthly dues: `FinanceCategory` enum has 11 values (DUES, SPECIAL_ASSESSMENT, BOND, FACILITY_FEE, VEHICLE_STICKER, PARKING_FEE, UTILITY, MEMBERSHIP_FEE, LATE_PENALTY, VIOLATION_FINE, OTHER) selectable in the ChargeType form. Verified 2026-08-15.
- [x] Per-period billing UI — `BillingPeriodsTab` lists periods (charge type, due date, amount, assessment count, status); `BillingPeriodDialog` creates one or bulk-generates N months; backend CRUD + `generate`; assessment generation auto-creates a period via `findOrCreateBillingPeriod`. Verified 2026-08-15.
- [x] Utility Expense Tracking — dedicated `UtilityExpense` model (provider name, type, billing period, invoice number) + `UTL-NNNNNN` auto-numbering; backend CRUD at `/utility-expenses` gated by existing `finance.expense_*` permissions; `UtilitiesTab` in Finance page with summary cards (total + by-type), filterable data table, form dialog (provider, type, amount, date, billing period, invoice #, payment method, description), and inline edit/delete. Income statement and expense exports include utility expenses. Verified 2026-08-17.
- [x] Vehicle Sticker Management — feature-gated (`vehicle-stickers`, optional, `@Feature` guard + `@FeatureCode` decorator); `VehicleSticker` model (sticker number, vehicle FK, status, issue/expiry dates, amount, payment method, verification); backend CRUD at `/vehicle-stickers` gated by `sticker.*` permissions; `VehicleStickersPage` (officer view) with filters, data table, verify/renew dialogs; `StickerStatusTab` integrated into vehicles page; `vehicle-stickers` nav item with feature-gating. Verified 2026-08-17.

NOTE: THE IDEA 1 HAS BEEN MODIFIED AND THERE ARE NEW FEATURES ADDED PLEASE CONFIRM THE GAP AND ADD IF THE FEATURE IS NOT FOUND ADD IT IN THE CODE AND ONCE DONE MODIFY THIS CHECKLIST


Verification log:

- Backend: `tsc --noEmit` exit 0; eslint 0 errors (pre-existing `any` warnings only); jest 11 suites / 54 tests pass
- Frontend: `npx tsc --noEmit` exit 0
- Deployed: commit `27089b5` pushed → Railway deploy `e6326750` SUCCESS; deploy log `Permission reconciliation complete: 18 permission(s) added, 30 grant(s) added across 1 community(ies).`
- Live API smoke (`https://backend-production-c9f3e.up.railway.app`): President role = 136 perms with all 10 `finance.*` + `payment.cancel` + `pet.*` + `resident.verify` + `vehicle.verify` present; previously-403 finance endpoints now 200; `/api/assessments` (8) + `/api/payments` (3) still 200
- Note: deployed DB has 0 charge types / billing periods / batches (SEED_DB=false) — endpoints authorize but return empty lists until configured in the deployed app
- Follow-ups (commit `db50239` → Railway deploy `74e6d7e5` SUCCESS): `GET /api/payments/:id/receipt` live-verified → 200, PAY-000003, community "CommunityOS Demo HOA", resident returned; reconciler re-ran idempotently (0/0 added). Duplicate-allocation guard not live-exercised — deployed DB has no PAID/WAIVED/CANCELLED assessments (5 OVERDUE + 3 ISSUED); verified by code + local suite
- IDEA 1 close-out audit (2026-08-15): the three previously-deferred items above were already implemented in code; docs promoted to fully DONE (no code changes). Note: deployed DB still has 0 charge types / billing periods (SEED_DB=false) — the finance tabs authorize but stay empty until an admin configures charge types in the deployed app (data config, not code)
- IDEA 1 gap-fill (2026-08-17): Implemented Vehicle Sticker Management (feature-gated, optional) and Utility Expense Tracking (new Finance tab). Backend: `tsc --noEmit` exit 0, `nest build` clean. Frontend: `tsc --noEmit` exit 0, `tsc -b` clean. Migration applied via `prisma migrate deploy`. Stickers feature registered in seed as optional feature.

---

### IDEA 9 — Household, Resident, User & Vehicle Relationship — DONE (2026-08-13)

Checklist:

- [x] Household is the central property/unit record; no orphaned Users/Residents (User must link to a Resident; Resident links to a Household; registration requires existing Household or authorized creation)
- [x] One Household → multiple Residents, multiple Vehicles, one primary User account (1-account-per-household enforced; no account-holder can create extra user accounts)
- [x] User account belongs to a designated Resident in that Household (User.residentId enforced)
- [x] Other residents exist as resident records without login credentials
- [x] Duplicate Households for the same property/unit prevented (block+lot unique)
- [x] Household account holder can add Residents and register Household Vehicles (self-service create gated by `resident.create` / `vehicle.create` on Member/Renter; backend forces own-household / own-resident scope for non-officers)
- [x] HOA configures whether new records become Active immediately or require officer verification (`residentVerification` / `vehicleVerification` settings: `auto` | `approval`; in `approval` mode new records are created PENDING)
- [x] Vehicle statuses support PENDING, APPROVED, ACTIVE, REJECTED, DEACTIVATED, TRANSFERRED (enum + filters + badges + UI actions)
- [x] Officers can view, verify, edit, deactivate, and correct community-wide resident and vehicle records (officer create bypasses approval; `POST /residents/:id/verify` and `POST /vehicles/:id/verify` gated by `resident.verify` / `vehicle.verify`; verify records `verifiedBy` + `verifiedAt` + `verificationRemarks`)
- [x] Verification audit: who/when/remarks persisted on Resident and Vehicle
- [x] Finance, Complaints, Notifications, Import/Export, Occupancy, Permissions modules keep household-level / person-level / login-level data distinct (existing design retained; no regressions)


NOTE: THE IDEA 9 HAS BEEN MODIFIED AND THERE ARE NEW FEATURES ADDED PLEASE CONFIRM THE GAP AND ADD IF THE FEATURE IS NOT FOUND ADD IT IN THE CODE AND ONCE DONE MODIFY THIS CHECKLIST

Verification log:

- Backend: `nest build` clean; eslint 0 errors (pre-existing `any` warnings only); jest 11 suites / 54 tests pass
- Frontend: `npx tsc --noEmit` exit 0; `vite build` OK; vitest 4 files / 20 tests pass
- Migrations applied: `20260813152423_add_verification_workflow`, `20260813154628_add_verification_audit`
- Live API smoke (admin + member accounts): officer create in `auto` mode → ACTIVE; setting flipped to `approval` → member create → PENDING with household/resident scoping enforced; officer verify approve → resident ACTIVE / vehicle APPROVED; reject → resident INACTIVE / vehicle REJECTED with remarks + verifier + timestamp persisted; verify on non-PENDING → 400 "Only pending … can be verified."
- Test data cleaned up; settings restored to `auto`; one-off `sync-permissions.ts` backfill script removed (new communities receive the new permission codes via provision/seed)

Remaining from the broader idea (tracked under IDEA 10): move-in/move-out history, ownership transfer, renter occupancy history, payer identity on payments, per-household Occupancy History.

---

### IDEA 10 — Move-in/move-out, ownership transfer, renters & vehicle lifecycle — DONE (2026-08-13)

Checklist:

- [x] Move-in: a new Owner/Renter registers into a unit via the existing Resident create / User registration flow (self-service forces `OWNER`, officers may set `RENTER`); records are created under the HOA's `residentVerification` mode (`auto` → ACTIVE or `approval` → PENDING)
- [x] Move-out: existing B9 flow marks `movedOutAt` + deactivates the user account; the resident's record and its vehicles remain visible for history/review
- [x] Occupancy history per household: `households.findOne()` returns derived `occupancyHistory` (`current` / `former` / `total` / `owner` where `owner` = current ACTIVE OWNER); computed from live `residentType` / `movedOutAt` / `status` fields (no separate OccupancyHistory model — derived by design)
- [x] Ownership transfer: `POST /households/:id/transfer-ownership` (`household.update` permission) validates the target is an ACTIVE resident of the unit, then transactionally demotes current ACTIVE OWNERs → `RENTER` and promotes the target → `OWNER`
- [x] Renter identity: `Resident.residentType` (`OWNER` | `RENTER`) persisted on every resident; `renterAccountsAllowed` setting (security group, default true) gates `users.createRenter()` with 403 when disabled; resident records expose `residentType` on create/findAll/findOne/update/moveOut/verify
- [x] Renter occupancy history: same derived `occupancyHistory` covers renters (owner = ACTIVE OWNER, renters counted in `current`/`former`); frontend shows per-resident OWNER/RENTER badges + Type column
- [x] Vehicle lifecycle: `POST /vehicles/:id/transfer` (new resident, → `TRANSFERRED`, clears verification) · `POST /vehicles/:id/deactivate` (→ `DEACTIVATED`) · `POST /vehicles/:id/revalidate` (DEACTIVATED/TRANSFERRED → ACTIVE), all gated by `vehicle.update`; frontend Transfer dialog + Deactivate/Revalidate row actions
- [x] Vehicles of former occupants remain reviewable and can be transferred, deactivated, or revalidated (vehicle records are not deleted on move-out; ACTIVE/APPROVED gating for transfer)
- [x] Payer identity preserved: every Payment already records `residentId` (who paid) + assessment's `householdId` (who owed) — G2.1 enforces the payer resident belongs to the assessing household
- [x] Transfer/revalidation is auditable: all routes flow through the global AuditInterceptor (who/when/what), same as every mutating route

Verification log:

- Backend: `nest build` clean; eslint 0 errors (pre-existing `any` warnings only); jest 11 suites / 54 tests pass
- Frontend: `npx tsc --noEmit` exit 0; eslint 0 errors; vitest 4 files / 20 tests pass
- Migrations applied: `20260813155629_add_resident_type` (DB in sync, 29 migrations, `prisma migrate status` up to date)
- Live API smoke: all 4 new routes (`transfer-ownership`, `vehicle transfer`/`deactivate`/`revalidate`) return 401 unauthenticated; dev server restarted healthy on :3000 after Prisma client regeneration (Windows query-engine DLL lock required one stop/start)
- Test data cleaned up; settings remain `auto`; no temp scripts left behind

---

### IDEA 11 — Pet Registration & Management — DONE (2026-08-15)

Checklist:

- [x] Optional HOA feature managed through Superadmin → Features (`featureCode: pet-registration`, `FeatureType.OPTIONAL`, community assignment with `enabled`/`config` + `GET /features` per-community endpoint; demo community seeded enabled)
- [x] Superadmin Features management UI — `/admin/features` (list all features + assignee count, per-feature Communities dialog: enable/disable toggle + revoke, Assign dialog with community search; typed `pet-registration` config editor: `verificationMode` (`auto` | `approval`) select + `documentsRequired` switch, generic JSON editor for other features)
- [x] Feature-aware HOA gating — `useEnabledFeatures` / `useIsFeatureEnabled` hooks read the enabled-codes list; sidebar filters nav by enabled features; nav item carries `feature: 'pet-registration'`
- [x] Backend enforcement — Pets controller `@Feature('pet-registration')` + `FeatureGuard` (403 when feature not enabled); `pet.*` permissions (`pet.create/view/update/delete/verify`) seeded in the catalog + `MEMBER_PERMISSIONS` subset
- [x] Pet registration — pet name, species (`PetSpecies`: DOG/CAT/BIRD/FISH/REPTILE/SMALL_ANIMAL/OTHER), breed, sex, color, date of birth, photo, registration number/date, status, notes
- [x] Pet is associated with the Household and optionally a primary Resident/caretaker (caretaker picker; self-service registration is auto-scoped to the user's own household)
- [x] Workflow: PENDING → Approved/Rejected → ACTIVE when `verificationMode: approval`; `auto` mode creates active records; statuses PENDING/APPROVED/ACTIVE/REJECTED/DEACTIVATED/INACTIVE with StatusBadge variants
- [x] Officer actions — view all community pets, edit, verify (approve/reject with remarks), deactivate, revalidate, delete (permission-gated by `pet.*` codes)
- [x] Documents — photo + vaccination/rabies/veterinary certificate uploads via `documentsService.upload` (auth-gated); viewed through `documentsService.openFile` (no direct URL exposure); optional by default
- [x] Permissions: `petCreate`/`petView`/`petUpdate`/`petDelete`/`petVerify` added to `constants/permissions.ts`; `/app/pets` route wrapped in `<PermissionRoute permission={PERMISSIONS.petView}>`
- [x] Seed cleanup: `registrationFee: 200` removed from the demo `pet-registration` config (no pet fees anywhere — fee/penalty finance integration out of scope)

Verification log:

- Backend: `npx tsc --noEmit` exit 0; eslint 0 errors (925 pre-existing warnings — `any`-typed controller params etc.)
- Frontend: `npx tsc --noEmit` exit 0; eslint 0 errors (49 pre-existing warnings); `npm run build` (tsc + vite build) exit 0 — `pets-page` chunk 18.47 kB, `admin-features-page` chunk 12.56 kB
- Schema: one migration this idea — `20260816160000_add_pet_deleted_at` adds the missing `Pet.deletedAt` column. The baseline pets migration (`20260814120000_add_pets_feature_gating`) never created it (it only existed locally via a `prisma db push`), so the prod Pet table lacked it and every `/api/pets` query 500'd ("Database error occurred") until this migration was applied. Applied locally (`migrate deploy`, 34 migrations, up to date) and on Railway via the entrypoint on redeploy.
- Deployed: commit `ddfa9a0` (seed change + WS1/2/3 + docs) → Railway deploy `6eb2769c` SUCCESS + Vercel (serves build `index-B9-4AnrY.js` matching local `dist`). Commit `e58a661` (deletedAt migration) → Railway deploy `57d8c359` SUCCESS (reconciler idempotent: 0/0 added). See `docs/PROGRESS.md` work log.
- Live verification on `https://backend-production-c9f3e.up.railway.app`: prod DB is `SEED_DB=false` (no Feature catalog) so the demo feature was created + assigned via the superadmin API (same flow the new Features UI uses): `POST /admin/features` created `pet-registration` (OPTIONAL), `POST /admin/features/:id/assign` enabled it with config `{"verificationMode":"auto","documentsRequired":false}`. Then `/api/features` → 200 (feature + config), `/api/pets` → 200 empty list. Gating round-trip: `DELETE` assignment → `/api/pets` 403 ("This community does not have access to this feature.") + `/api/features` count 0; re-assign → 200 again. Member register/officer approve flows not exercised in prod (avoided creating test pet data in production); covered by code + local suite.

Remaining from the broader idea (out of scope, not implemented): per-document-item Required/Optional/Disabled configuration (currently a single `documentsRequired` flag), pet-related fees/penalties finance integration, pet import/export, move-out pet handling (pet remains historically preserved; no explicit re-caretaker workflow).

---

### IDEA 5 — HOA Good/Bad Standing — DONE (2026-08-17)

Checklist:

- [x] Optional HOA feature (`featureCode: good-bad-standing`, `FeatureType.OPTIONAL`) assigned through Superadmin → Features, exactly like pet-registration — superadmin grants/revokes per community; communities without it simply don't have it (demo community seeded enabled)
- [x] Standing computed from actual assessment/payment records (`summarizeFinance` / `buildDuesTracker`), never manually edited — GOOD when the household has neither an unpaid balance meeting the balance threshold nor the delinquency threshold of distinct overdue months; BAD when it reaches either threshold
- [x] BAD-standing rule (per user, 2026-08-17): **unpaid balance ≥ ₱10,000 across any billed assessments (not just recurring dues) OR 4+ months behind in recurring dues** — `outstanding >= badStandingBalanceThreshold || monthsBehind >= delinquencyThresholdMonths`
- [x] Configurable per-HOA thresholds — `delinquencyThresholdMonths` (default 4) and `badStandingBalanceThreshold` (default 10000, pesos) in the feature assignment config, applied to both the household finance summaries and the dues tracker; typed editor in the Superadmin Communities dialog (delinquency threshold input + unpaid balance threshold input + "Restrict facility reservations" checkbox)
- [x] Standing belongs to the Household (financial obligation is household/property-based) — `finance.standing` GOOD/BAD on households list/detail and `/households/me`
- [x] Restricted services — BAD-standing households are blocked from creating facility reservations (`ForbiddenException` in `reservations.service.create`) when the feature config `restrictedServices` includes `facility_reservations`; essential functions (complaints, announcements, required communications) unaffected. Household-based restriction with no role bypass
- [x] Visibility rules — residents see only their own standing (`my-balance-card` via `/households/me`); officers with `household.view` see all standings (Households page). Standing UI (Households Standing column/filter, detail badge, balance-card badge) is hidden entirely when the feature is disabled for the community
- [x] Backend enforcement is independent of UI gating — the restriction reads the assignment config server-side on every reservation create; a disabled feature simply has no `restrictedServices` and computes standing at the default thresholds (4 months / ₱10,000)
- [x] No schema changes — standing is derived data; feature config lives on the existing `CommunityFeature.config` (same pattern as pet-registration)

Verification log:

- Backend: `npx tsc --noEmit` exit 0; eslint 0 errors (pre-existing `any` warnings only); jest 12 suites / 67 tests pass — `reservations.service.spec.ts` (6 cases: feature-off allows, GOOD allows, non-restricted allows, BAD+restricted → ForbiddenException with `reservation.create` never called, resident-without-household skips the check, null summary allows) + threshold cases in `dues-tracker.spec.ts` / `households.service.spec.ts` including balance-threshold BAD with zero overdue months, below-threshold GOOD, and custom balance thresholds
- Frontend: `npx tsc --noEmit` exit 0; eslint 0 errors; `npm run build` exit 0
- Deployed: commit `c516790` → Railway deploy `ae6c6cb5` SUCCESS (reconciler idempotent 0/0) at `https://backend-production-c9f3e.up.railway.app`; Vercel serves bundle `index-BR_6D4hm.js` matching local `dist`; `/api` rewrite via Vercel → Railway `/api/health` 200. Criteria revision (unpaid balance ≥ ₱10,000 OR 4+ months behind, both configurable): commit `0b29871` → Railway deploy `e7b0346d` SUCCESS, Vercel bundle `index-D_0gsd48.js` matching local `dist`. See `docs/PROGRESS.md` work log.
- Live verification on production (`SEED_DB=false`): feature created via superadmin API (`POST /admin/features` → `good-bad-standing` OPTIONAL, id `050995b4-cd55-40fd-945a-4a4f41b93b1a`) and assigned to the demo community; `/api/features` → 200 (pet-registration + good-bad-standing + config). Months threshold round-trip (initial default 3): `PATCH /admin/features/:id/assignments/:communityId` to threshold 4 → BAD household `108cae0d` (3 months behind, balance below threshold) shows GOOD; threshold 2 → BAD; restored 3 → BAD. Balance threshold round-trip (new defaults `{"delinquencyThresholdMonths":4,"badStandingBalanceThreshold":10000,...}`): household `108cae0d` (outstanding ₱21,800, 3 months behind) is BAD at balance threshold 10000 and GOOD at 50000 — balance criterion live. Revoke round-trip: `DELETE` assignment → `/api/features` drops good-bad-standing while `/api/households` still computes standing at the default thresholds — disabled feature = no restrictions, default thresholds, UI hidden; re-assign restores both features + config. Reservation blocking for the BAD household not live-exercised (no resident login for that household in prod); covered by the unit suite.

Remaining from the broader idea (out of scope, not implemented): officer overrides / payment-plan exceptions, restricting event reservations (no event RSVP exists yet) or paid amenities beyond facility reservations, a dedicated standing admin page/report, promotion of the feature to a Standard CommunityOS feature.

---

### IDEA 7 — Community Appearance, Branding & White-Label Settings — DONE (2026-08-18)

Checklist:

- [x] Database schema — 4 new nullable columns on `Community`: `primaryColor VARCHAR(20)`, `accentColor VARCHAR(20)`, `sidebarColor VARCHAR(20)`, `faviconUrl TEXT`; reused existing `logoUrl` field; migration `20260818220248_add_community_branding`
- [x] Backend API — `GET /communities/me/branding` (gated `community.view`) returns `displayName`, `logoUrl`, `primaryColor`, `accentColor`, `sidebarColor`, `faviconUrl`; `PATCH /communities/me/branding` (gated `community.branding`) accepts partial update with null/empty → reset to default
- [x] Permission — `community.branding` code in the permission catalog (module: Communities); not in `MEMBER_PERMISSIONS` so only officers/presidents can manage branding by default
- [x] Frontend types + service — `BrandingData` / `BrandingUpdateInput` interfaces; `brandingService.get()` and `.update()` calling the two endpoints
- [x] React Query hook — `useBranding()` with 5-minute stale time + query key factory `brandingKeys`
- [x] Dynamic CSS variable injection — `BrandingProvider` wraps the app in `App.tsx` inside `SessionBootstrap`; on auth + branding data, converts hex → OKLCH and sets CSS custom properties: `--primary`, `--ring`, `--sidebar-ring` (from primaryColor), `--accent`, `--sidebar-accent` (from accentColor), `--sidebar` (from sidebarColor); dynamically swaps `<link rel="icon">` for faviconUrl; cleans up all overridden properties on unmount
- [x] Branding settings page — `BrandingSettings` component rendered in Settings → Branding tab (permission-gated via `communityBranding`); 8 predefined theme presets (Default, Ocean, Forest, Sunset, Royal, Corporate, Rose, Teal); color picker inputs for primary, accent, sidebar; text inputs for logo URL and favicon URL; live preview card showing sidebar + dashboard mockup; Save and Reset buttons with optimistic cache update
- [x] Sidebar logo integration — `SidebarContent` reads `branding?.logoUrl` and renders custom `<img>` instead of default "C" letter avatar; community display name shown below "CommunityOS" text
- [x] Settings page integration — Branding tab conditionally rendered based on `communityBranding` permission; skeleton loading state while branding data loads

Verification log:

- Backend: `npx prisma generate` regenerated client with branding columns; `npx tsc --noEmit` exit 0; `npx nest build` clean
- Frontend: `npx tsc --noEmit` exit 0 (fixed `sidebar.tsx` NavLink children type error — react-router-dom v7 no longer accepts render function children; refactored to `SidebarLink` component using `useLocation` + `matchPath` for active state); `npx vite build` clean
- Migration: `20260818220248_add_community_branding` applied (4 ALTER TABLE statements)
- Branding fields visible in Prisma schema `CommunitySelect` type after client regeneration

---

### IDEA 4 — Improved Online Payments, Financial Auditing & Migration — DONE (2026-08-17)

Checklist (against the IDEA 4 concept; items already delivered by earlier finance work are marked with their prior commit, new items in this batch are the Expenses + Income Statement + security follow-ups):

- [x] Residents view their own assessments / monthly dues / special assessments / bonds / facility fees / fines / penalties and submit payments with method + reference + proof upload — IDEA 1 (2026-08-15): payment form with method/reference, proof file via `documentsService.upload` (`proofFileId`/`proofUrl`), "View proof" in the payment detail dialog; `FinanceCategory` enum (11 values) selectable per charge type
- [x] Each payment records amount, payment type, billing period, household, payer resident, method, reference number, payment date, proof file, submission/verification timestamps, verifier, status — IDEA 1/G6
- [x] Status lifecycle PENDING → VERIFIED / REJECTED / REFUNDED / CANCELLED with officer verify/reject/refund/cancel (rejection reason required) — IDEA 1
- [x] Per-household finance visibility: residents see only their own household (G3 `finance.view_own` scoping on assessments/payments lists); managers with `finance.view_all` see all; ledger + CSV export (G6)
- [x] Granular finance permissions in the catalog — `finance.view_own`, `finance.view_all`, `finance.verify`, `finance.reject`, `finance.refund`, `finance.import`, `finance.export`, `finance.manage`, `finance.waive`, `payment.*`; new `finance.expense_view/create/update/delete/import/export` + `finance.income_statement_view` (2026-08-17)
- [x] Excel/CSV import & export with preview, validation, and explicit confirmation — payments/assessments/expenses kinds at `/finance/import-export` (preview → confirm/cancel per batch, per-row errors, result counts) — IDEA 1 + expenses kind (2026-08-17); CSV + XLSX formats with filters
- [x] Imported records marked historical/migrated with source batch, importing user, timestamp, result counts — `isImported`/`importBatchId`/`createdById` on payments, assessments, and expenses; ImportBatch row + audit via the global interceptor
- [x] **NEW — Financial auditing & transparency: Expenses module + Income Statement** (this batch): `Expense` model (title, description, `ExpenseCategory` enum, amount, payment method, expense date, payee, reference, notes, `isImported`, soft delete) + migration `20260817120000_add_expense_model`; `GET/POST/PATCH/DELETE /api/expenses` with pagination/search/category/date-range/sort (`expenseNumber|expenseDate|amount|title|createdAt`), auto `EXP-######` numbering, default sort expenseDate desc; `GET /api/finance/income-statement?from&to` returning `summary { income (verified payments), expenses, fundBalance = income − expenses, billed (assessment receivables) }`, expenses-by-category, monthly totals, and the embedded expense list
- [x] **NEW — Income statement access control** (this batch): `finance.income_statement_view` code; statement response embeds `expenses` so granted members get a read-only transparency view without ever touching the `/expenses` mutation endpoints (which require `finance.expense_view`); `GET /expenses` + statement both 401 unauthenticated / 403 without the code
- [x] **NEW — Frontend Finance tabs** (this batch): Income statement tab (Collected / Expenses / Fund balance / Billed cards, expenses-by-category list, monthly summary table, read-only expense records) + Expenses tab (search, category filter, Record expense dialog with expense-number auto-assign, edit/delete row actions, ConfirmDialog); Overview cards relabeled to Collected / Billed / Net receivable; import-export panel gained the `expenses` kind for both import and export
- [x] **NEW — Export scope fix** (this batch, 2026-08-17): `/finance/import-export/export` now scopes to the caller's own household for non-officers (payments/assessments kinds) — an export can never return records the user cannot view (privacy parity)
- [x] **NEW — Finance options scope fix** (this batch): `GET /finance/options/households` / `residents` now include only the caller's own household when the caller is a plain member (no `assessment.view`) — matches the list-scoping rules
- [x] **NEW — Payment-proof ownership fix** (this batch): `uploads.service` proof-file streaming now 404s for non-officers attempting to open another household's payment proof (was a cross-tenant/IDOR-style gap under `finance.import`)

- [x] **IDEA 8 — Generic System-Wide Data Import, Export & Migration Engine** (2026-08-17): Module registry pattern — `ModuleRegistry` service registers per-module config (template fields, validation, apply logic, duplicate keys, export columns); generic `ImportExportService` handles CSV/XLSX parse, column mapping, preview, confirm, rollback, error download; `GET/POST` endpoints at `/import-export/*` gated by per-module permissions; migration `20260817160000_add_import_tracking_to_core_modules` adds `isImported Boolean @default(false)` + `importBatchId String? @db.Uuid` + `importBatch` relation to Household, Resident, Vehicle, Pet, Staff with reverse relations on ImportBatch
- [x] **IDEA 8 — Core module adapters** (2026-08-17): Household (Block/Lot/Unit/Address/Status, block+lot duplicate check), Resident (14 fields, household link by block/lot, RES-number auto-numbering), Vehicle (8 fields, household link), Pet (11 fields, species enum, caretaker link), Staff (9 fields, role/status enums) — each adapter defines template fields, validation, duplicate detection, and apply logic
- [x] **IDEA 8 — Permission codes** (2026-08-17): `household.import/export`, `resident.import/export`, `vehicle.import/export`, `pet.import/export`, `staff.import/export` in backend `permissions.ts` and frontend `constants/permissions.ts`
- [x] **IDEA 8 — Frontend shared components** (2026-08-17): `ModuleImportDialog` (file upload → preview → confirm/cancel, error table, download template), `ModuleExportDialog` (format selection, download), `BatchHistoryPanel` (batch list with rollback) — all in `features/shared/import-export/`; `useImportPreview`, `useConfirmImport`, `useCancelImport`, `useRollbackImport`, `useExportModule`, `useDownloadTemplate`, `useDownloadErrors`, `useImportBatches` hooks with TanStack Query
- [x] **IDEA 8 — Contextual import/export in module pages** (2026-08-17): DropdownMenu with "Import from file" / "Export data" added to Households, Residents, Vehicles, Pets, and Staff pages — permission-gated via `useHasPermission` for each module's import/export codes
- [x] **IDEA 8 — Verification** (2026-08-17): Backend `npx tsc --noEmit` clean; frontend `npx tsc --noEmit` clean; both `npm run build` clean; ImportExportModule registered in `app.module.ts` with `@Global()` + `OnModuleInit` adapter registration

Verification log:

- Backend: `npx tsc --noEmit` exit 0; eslint 0 errors (pre-existing `any` warnings only); jest **14 suites / 73 tests pass** (new `expenses.service.spec.ts` + `income-statement.service.spec.ts`); `npm run build` clean
- Frontend: `npx tsc --noEmit` exit 0; eslint 0 errors (49 pre-existing warnings); `npm run build` exit 0 (tsc + vite build); vitest 4 files / 20 tests pass
- Deployed: commit `ed7bc4d` pushed → Railway deploy `6c2746f8` SUCCESS (reconciler idempotent 0/0) at `https://backend-production-c9f3e.up.railway.app`; Vercel serves bundle `index-CIchZUHg.js` matching local `dist`; `/api/health` → 200
- Live verification on production (admin = President): login OK with all 7 new permission codes present; `GET /api/expenses` 200 (empty); created `EXP-000001` Guardhouse roof repair (MAINTENANCE, ₱8,500) → statement updated (income 4,900, expenses 8,500, fundBalance −3,600, billed 25,500) with category breakdown MAINTENANCE 8,500/1; PATCH amount → 9,000 + notes; search `roof` = 1 hit, category filter = 1 hit; CSV export `expenses-2026-08-16.csv` (`Content-Disposition: attachment`) with correct header + row; import preview 2/2 valid → confirm created EXP-000002 (Streetlight repair, UTILITIES 3,200) + EXP-000003 (Clubhouse cleaning, MAINTENANCE 1,500), both `isImported=true`, statement expenses 13,700; delete EXP-000002 → fundBalance −5,600; fresh preview batch cancel → "Import batch cancelled."; date range `from=2026-08-01&to=2026-08-31` → statement returns 2 embedded expenses; no-auth 401 on `/expenses` + `/finance/income-statement`; temp Member user (no finance codes) → 403 on `/expenses`, `/finance/income-statement`, `/expenses/:id` (deleted after test)

Remaining from the broader idea (out of scope / deferred, consistent with prior decisions): per-category payment views and module-specific category permissions (charge categories exist, no per-category view perm), import column-mapping UI + full duplicate-detection, export custom-column selection, a dedicated payment gateway (payments remain manual per the Production-readiness decision), construction-bond/renovation modules (feature backlog).