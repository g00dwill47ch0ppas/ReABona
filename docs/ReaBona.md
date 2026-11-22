# ReaBona

**Project Overview, Functional Requirements, Technical Specifications and Development Guide (Azure edition)**

*One Report. Shared Responsibility. Visible Progress.*

|  |  |
| --- | --- |
| **Project name** | ReaBona |
| **Project category** | Civic Technology / GovTech / Public-Service Delivery |
| **Primary environment** | North West Province, South Africa |
| **Development approach** | Cloud-native web application on Microsoft Azure |
| **Prototype tools** | React (Vite, TypeScript) on Azure App Service, Azure Functions, Azure Maps, Azure SQL Database, Azure Blob Storage, Microsoft Entra ID |
| **Potential future tools** | Azure Communication Services, Azure Maps, Azure SignalR Service, Azure AI services, Azure API Management, Power BI or Microsoft Fabric |
| **Slogan** | Turning public concerns into public action |

## PART 1: PROJECT OVERVIEW

### 1.1 What is ReaBona?

ReaBona is a proposed citizen-to-government engagement, service-delivery coordination and accountability platform designed to improve how public-service concerns are reported, managed, referred and resolved.

The platform provides citizens with a way to report public-service challenges (electricity, road, sewage, water, road, etc..) and follow the progress of their reports. It also provides government departments and authorised officials with a coordinated environment to receive, manage, assign and collaborate on reported cases. Department executives should be able to see a dashboard to gain insights from the data.

A key feature of ReaBona is its proposed interdepartmental collaboration capability. Some public-service challenges cannot be addressed by one institution alone. ReaBona aims to make it easier for relevant departments to coordinate around a shared case, communicate responsibilities, record actions and provide progress updates.

The platform also provides management with aggregated information about reported issues, outstanding cases, response progress and recurring service-delivery challenges.

In simple terms: ReaBona connects citizens and government institutions through a shared process for reporting problems, coordinating responses and making progress visible.

### 1.2 The problem

Citizens encounter public-service problems such as:

- Water shortages and interruptions.
- Sewage leaks and sanitation problems.
- Damaged roads and infrastructure.
- Electricity interruptions.
- Problems involving public schools.
- Healthcare service challenges.
- Waste-management problems.

However, reporting a problem is not necessarily the same as getting it resolved. ReaBona is designed around three related challenges:

1. **Difficulty identifying the responsible institution.** Citizens may not know which municipality, department or public institution is responsible for a particular issue.
2. **Limited visibility after reporting.** After submitting a complaint or service-delivery concern, citizens may struggle to establish whether it has been received, assigned, investigated or addressed.
3. **Fragmented institutional coordination.** Some challenges involve multiple government institutions. Without an effective coordination process, responsibility, communication and progress updates may become fragmented.

### 1.3 The proposed solution

ReaBona proposes a shared digital case-management process that connects the citizen reporting experience with institutional case handling.

The platform should enable:

1. Citizens to submit service-delivery reports. Citizens should be able to capture and upload images of issues they experience in the community, e.g potholes, open drainage pipes, etc...
2. Reports to be categorised and directed to an appropriate institution.
3. Officials to receive and manage assigned cases.
4. Cases to be referred to other relevant institutions when necessary.
5. Authorised officials from different institutions to collaborate around the same case.
6. Citizens to receive updates and track progress.
7. Management to monitor cases and identify recurring problems.

### 1.4 Vision

To contribute to a more connected, responsive and accountable public-service environment where citizens can participate meaningfully and government institutions can coordinate their responses more effectively.

### 1.5 Mission

To provide an accessible digital platform that improves communication between citizens and government, strengthens interdepartmental collaboration and makes the progress of public-service reports more visible.

### 1.6 Core objectives

- Simplify the reporting of public-service challenges.
- Improve the identification of responsible institutions.
- Establish traceable case-management processes.
- Enable collaboration between multiple departments.
- Improve communication between officials and citizens.
- Make case progress and outstanding actions visible.
- Provide useful information to government decision-makers.

### 1.7 Intended users

| User group | Description |
| --- | --- |
| **A. Citizens / Residents** | People who want to report a public-service problem, provide supporting information, track a case and give feedback. |
| **B. Departmental officials** | Authorised government employees who receive, assess, assign, update and work on cases. |
| **C. Departmental managers/Executives** | Managers who oversee departmental workloads, monitor outstanding cases and identify recurring problems. |
| **D. Platform administrators** | Authorised personnel responsible for managing platform configuration, user permissions, departments and system settings. |

## PART 2: CORE PLATFORM CONCEPT

### 2.1 The complete case lifecycle

ReaBona should follow a structured process:

| Step | Name | What happens |
| --- | --- | --- |
| 1 | **Report** | A citizen submits a service-delivery concern. |
| 2 | **Register** | The platform creates a case record and generates a unique reference number. |
| 3 | **Categorise** | The report is classified according to the type of problem. |
| 4 | **Route** | The platform identifies the appropriate institution based on the report category, location and applicable institutional responsibilities. |
| 5 | **Review and assign** | An authorised official reviews the case and assigns responsibility. |
| 6 | **Coordinate** | If additional institutions are needed, the responsible official refers the case to them. |
| 7 | **Take action** | The relevant officials record actions, progress and outstanding requirements. |
| 8 | **Update the citizen** | The citizen receives progress information and can track the case. |
| 9 | **Resolve and verify** | The responsible institution records the outcome. Where appropriate, the citizen can provide feedback or confirm whether the problem has been addressed. |
| 10 | **Analyse** | Management uses aggregated case information to identify patterns, outstanding issues and areas requiring attention. |

### 2.2 Example scenario: a school experiencing a water shortage

Imagine a public school in the North West Province has been without water for several days.

1. A school representative or resident submits a report through ReaBona.
2. The report is categorised as a water and sanitation issue.
3. The platform records the school’s location and creates a reference number.
4. The case is directed to the institution responsible for the water-service problem, which may be the relevant municipality.
5. The Department of Education may also need to know about the effect on the school.
6. The responsible official refers the case to the relevant supporting institution.
7. Authorised officials can access the information relevant to their responsibilities and record their actions.
8. The municipality records its progress on the water issue.
9. The Education Department records any relevant school-related action.
10. The citizen can see consolidated progress updates.

The important point is that the case is not treated as an isolated complaint. It becomes a coordinated matter involving the relevant institutions.

> **Important jurisdictional rule:** ReaBona must not assume that every problem in a category belongs to one department. Responsibility must be determined using the location, applicable government mandate and institutional arrangements.

## PART 3: FUNCTIONAL SPECIFICATIONS

Functional specifications describe what the platform must do.

### 3.1 Citizen registration and access

**Purpose:** Allow citizens to access the platform and submit reports.

Required capabilities:

- Register an account.
- Sign in securely.
- Sign out.
- Recover access where supported.
- Maintain basic profile information.
- View their submitted reports.
- Access their individual case reference numbers and track reported issues

Suggested profile information:

- Full name.
- Email address or mobile number.
- Preferred communication method.
- Optional address or locality information.

**Prototype note:** Sign-in is handled by Microsoft Entra ID through Azure App Services for departments/ institutions. The first time a person signs in, the API creates a Citizen profile for them. Officials, managers and administrators are pre-registered by an administrator using their email address. Demonstration accounts must use fictional data, and must never be presented as proof of production-grade identity verification.

### 3.2 Citizen reporting module

**Purpose:** Allow residents to submit public-service concerns.

The reporting form should contain:

| Field | Description |
| --- | --- |
| Report title | Short description of the problem. Citizen can use speech to text for the description. |
| Category | Type of public-service issue |
| Description | Detailed explanation |
| Location | Where the problem occurred through Azure Maps to automatically capture the location. |
| Date reported | Date the report was submitted (set by the server) |
| Supporting photograph | Optional evidence. Scan through computer vision/OCR. |
| Reporter details | Information identifying the submitting user (taken from the signed-in account) |
| Contact preference | How the citizen wants updates. Telegram/Email |

Suggested report categories:

- Water and sanitation.
- Education.
- Healthcare.
- Roads and infrastructure.
- Electricity.
- Waste management.
- Other public-service issues.

Functional requirements:

- Validate required fields (in the browser and again in the API).
- Prevent submission of incomplete reports.
- Allow supporting photographs where enabled.
- Save submitted reports.
- Generate a unique reference number.
- Display a submission confirmation.
- Allow citizens to view their previous submissions.

### 3.3 Case registration and reference numbers

**Purpose:** Give each submitted concern a traceable identity.

Every report must have:

- A unique case ID.
- A human-readable reference number.
- Submission date and time.
- Current status.
- Assigned institution.
- Case history.

Suggested reference format: **RB-2026-00001**

The reference number must be generated consistently by the server and must not be based on a number typed by the citizen. In this build, the API generates it from an Azure SQL sequence (see Part 8, Phase 2), so two reports can never receive the same number.

### 3.4 Categorisation and institutional routing

**Purpose:** Help identify which institution should handle a report.

The platform should consider:

- Report category.
- Geographic location.
- Municipality or district.
- Applicable government responsibility.
- Existing routing rules.

Example: a report about a municipal water interruption may be routed to the relevant municipality. A report concerning a provincial school infrastructure problem may require involvement from the Department of Education.

Functional requirements:

- Allow an authorised administrator to configure routing rules.
- Suggest a responsible institution.
- Allow an authorised official to correct an incorrect assignment.
- Record why a case was reassigned.
- Preserve the case history.

**Prototype requirement:** Use predefined routing rules (a RoutingRules table keyed by category and district) or a manually selected department. Do not claim that the prototype automatically understands every government jurisdiction.

### 3.5 Official case-management module

**Purpose:** Give departmental officials a workspace for managing cases.

Officials should be able to:

- View cases assigned to their institution.
- Open case details.
- Review descriptions and supporting information.
- Accept or acknowledge a case.
- Assign an official or team.
- Change the case status.
- Add an official update.
- Request additional information.
- Refer a case to another institution.
- View previous case actions.

Suggested statuses:

1. Submitted.
2. Under review.
3. Assigned.
4. Referred.
5. In progress.
6. Awaiting information.
7. Resolved.
8. Closed.

The platform must record who made a status change and when it happened.

### 3.6 Interdepartmental collaboration module

**Purpose:** Enable authorised officials from different institutions to coordinate around a shared public-service case.

This is one of ReaBona’s central proposed capabilities.

Required capabilities:

- Refer a case to another department.
- Identify the lead institution.
- Identify supporting institutions.
- Define the responsibilities of participating institutions.
- Allow authorised officials to add case-related updates.
- Record referrals and responses.
- Display a consolidated case timeline.
- Track outstanding actions.
- Preserve a record of institutional contributions.

Example: a water problem at a public school may require the municipality to investigate the water supply and the Department of Education to assess the effect on the school. ReaBona should allow both institutions to contribute to the same case while maintaining clear responsibility and appropriate access controls.

> **Important distinction:** A referral does not automatically transfer all responsibility. The platform must retain the lead institution and show which institution is responsible for each action.

### 3.7 Citizen tracking and communication

**Purpose:** Allow citizens to understand what is happening after they submit a report.

Required capabilities:

- View submitted reports.
- Search using a case reference number.
- View the current status.
- View the responsible institution.
- View citizen-appropriate progress updates.
- Receive notifications when important changes occur.
- Provide additional information when requested.
- Submit feedback after a case is marked resolved.

Citizen-facing updates must not expose confidential internal discussions or personal information belonging to other people.

### 3.8 Notifications

**Purpose:** Keep relevant users informed about case activity.

Potential notifications:

- Report successfully submitted.
- Case received.
- Case assigned.
- Case referred.
- Additional information requested.
- Case status changed.
- Case resolved.
- Feedback requested.

Potential delivery channels:

- In-app notifications.
- Email (Azure Communication Services).
- SMS (Azure Communication Services).
- Other approved communication channels.

**Prototype requirement:** Demonstrate an in-app notification (a Notifications table that the app reads). Email through Azure Communication Services is a recommended stretch goal; SMS can be added later.

### 3.9 Management dashboard

**Purpose:** Give authorised managers an overview of public-service reports.

Suggested dashboard indicators:

- Total reports received.
- Reports awaiting review.
- Reports in progress.
- Reports referred to other institutions.
- Reports marked resolved.
- Overdue reports.
- Reports by category.
- Reports by district or municipality.
- Reports by responsible institution.
- Recurring problem locations.

The dashboard should support decisions by presenting useful information rather than simply displaying numbers.

Potential future capabilities:

- Trend analysis.
- Geographic visualisation (heatmap using Azure Maps).
- Departmental workload analysis.
- Average response and resolution times.
- Identification of recurring service-delivery problems.

> **Important:** A case marked resolved by an official is not necessarily independently verified as resolved. The system should distinguish institutional resolution status from citizen feedback or verification.

### 3.10 Administration module

**Purpose:** Allow authorised administrators to maintain the platform.

Required capabilities:

- Manage user accounts.
- Assign user roles.
- Manage departments and institutions.
- Configure report categories.
- Configure routing rules.
- Manage system settings.
- Review audit records.
- Manage access permissions.

## PART 4: TECHNICAL SPECIFICATIONS

Technical specifications describe how the platform should be designed and implemented.

### 4.1 Proposed technical architecture

ReaBona follows a layered architecture hosted on Microsoft Azure. Every layer has one clear job, and the browser never talks directly to the database.

**Layer 1: Presentation layer (frontend).** This is the part of ReaBona users interact with. It includes citizen reporting screens, citizen tracking screens, official case-management screens, interdepartmental collaboration screens, management dashboards and administration screens.

- Proposed technology: a React single-page application (Vite + TypeScript) hosted on **Azure Static Web Apps**.
- Supporting libraries: React Router, TanStack Query, React Hook Form with Zod, Fluent UI React v9 or Tailwind CSS, Recharts, and the Azure Maps Web SDK.

**Layer 2: Application layer (backend and business logic).** This layer processes information and controls how the platform behaves. It handles report submission, required-field validation, reference generation, case assignment, status changes, departmental referrals, notifications, permission checks and workflow rules.

- Proposed technology: **Azure Functions** (Node.js, TypeScript) exposed as `/api/*` routes inside the same Static Web App.
- The API is the only component allowed to read or write the database, and every endpoint checks the caller’s identity and role.

**Layer 3: Data layer.** This layer stores citizen profiles, reports, departments, case assignments, referrals, status changes, official updates, citizen feedback, notifications and audit records.

- Proposed technology: **Azure SQL Database** for relational data and **Azure Blob Storage** for supporting photographs.
- Alternatives if your tenant allows them: Azure Cosmos DB, or a SQL database in Microsoft Fabric (which also gives a ready analytics layer).

**Layer 4: Integration layer.** This layer allows ReaBona to exchange information with other services and approved external systems.

- Azure services used by ReaBona itself: Azure Maps, Azure Communication Services, Azure SignalR Service and (optionally) Azure AI services.
- Possible external integrations: existing municipal case-management systems, provincial departmental systems, approved government identity services, email and SMS providers, geographic information services and government reporting systems.
- Proposed technology for future integrations: secured APIs published through Azure API Management. An API is a controlled way for two software systems to exchange information.

> **Important:** External integrations with government systems are future capabilities unless the relevant institutions provide access, approval and technical documentation.

**Cross-cutting services.** These apply to every layer: Microsoft Entra ID (identity), Azure Key Vault (secrets), Application Insights (monitoring) and GitHub Actions (build and deployment).

### 4.2 Proposed technology stack

| Component | Prototype technology | Possible future technology |
| --- | --- | --- |
| User interface | React + Vite + TypeScript on Azure Static Web Apps | Same, plus installable PWA or a native mobile wrapper |
| Business logic and workflow | Azure Functions (HTTP APIs) | Azure Functions with Durable Functions or Logic Apps for long-running workflows |
| Data storage | Azure SQL Database (relational data), Blob Storage (photographs) | Azure SQL with higher tiers, or an approved government database; Microsoft Fabric for analytics |
| Notifications | In-app notifications stored in the database; email through Azure Communication Services as a stretch goal | Email, SMS, WhatsApp and push notifications |
| Live updates | Polling the API every 30 seconds | Azure SignalR Service |
| Dashboard | Custom React dashboard using Recharts and Azure Maps | Power BI Embedded or Microsoft Fabric, if licensed |
| Authentication | Microsoft Entra ID through Static Web Apps built-in authentication | Entra External ID for citizens, organisational Entra ID for officials, approved government identity services |
| Integration | Demonstration only | Secured APIs through Azure API Management and approved connectors |
| Monitoring, secrets, deployment | Application Insights, Key Vault, GitHub Actions | Azure Monitor, Defender for Cloud, Azure DevOps |

The final technology choices must be reviewed against licensing, cost, regional availability, government IT policies, information security requirements and expected usage.

### 4.3 Azure services and their roles

| Service | Role in ReaBona | Priority |
| --- | --- | --- |
| Azure Static Web Apps | Hosts the React front end, provides built-in authentication, route protection and managed API hosting | Must-have |
| Azure Functions | Implements all business logic and database access | Must-have |
| Azure SQL Database | Stores reports, users, institutions, referrals, updates, history and audit records | Must-have |
| Microsoft Entra ID | Identifies users; combined with the Users table it determines each person’s role and institution | Must-have |
| Azure Blob Storage | Stores supporting photographs, uploaded directly from the browser using short-lived upload links | Must-have |
| Azure Maps | Converts addresses to coordinates and draws the recurring-problem heatmap | Recommended |
| Azure Communication Services | Sends email (and later SMS or WhatsApp) status updates to citizens | Recommended |
| Azure SignalR Service | Pushes new cases and updates to open dashboards without refreshing | Optional |
| Azure AI services | Photo and text analysis, translation (for example Vision, Language, Translator) | Optional |
| Azure Key Vault | Holds secrets such as connection strings | Recommended |
| Application Insights | Monitors errors, performance and usage | Recommended |
| GitHub Actions | Builds and deploys the app on every push | Must-have |

### 4.4 How data moves through the platform

1. The citizen signs in through Static Web Apps. Entra ID authenticates them, and the API creates or loads their profile.
2. The citizen submits the form. React validates the fields, requests an upload link for the photograph, and uploads it straight to Blob Storage.
3. React sends the report to `POST /api/reports`. The Function validates it again, generates the reference number and saves the report, the first status history entry, an audit record and a notification.
4. An official signs in. The API checks their role and institution, and returns only the cases assigned or referred to that institution.
5. The official assigns, refers or updates the case. Each action is saved as a separate record (assignment, referral, update, status change) together with an audit entry.
6. The citizen’s tracking screen reads the case through the API, which returns only citizen-visible updates.
7. The manager dashboard calls aggregate endpoints. SQL calculates the counts and averages, and React charts them. Azure Maps draws the heatmap from report coordinates.

### 4.5 Proposed database structure

A production-oriented design separates different types of information into related records. Because Azure SQL is a relational database, ReaBona can use this proper structure from the start. Data types below are Azure SQL types.

**Table 1: Users**

| Field | Data type | Purpose |
| --- | --- | --- |
| UserID | UNIQUEIDENTIFIER (primary key) | Identifies the user |
| EntraObjectId | NVARCHAR(64) | Links the profile to the signed-in Entra identity |
| FullName | NVARCHAR(150) | User’s name |
| Email | NVARCHAR(200) | Contact and login identifier |
| Phone | NVARCHAR(30) | Optional contact number |
| RoleID | INT (foreign key) | User’s role |
| InstitutionID | INT (foreign key) | Associated institution (officials and managers) |
| AccountStatus | NVARCHAR(20) | Active or inactive |
| CreatedAt | DATETIME2 | Account creation date |

**Table 2: Reports**

| Field | Data type | Purpose |
| --- | --- | --- |
| ReportID | UNIQUEIDENTIFIER (primary key) | Identifies the report |
| ReferenceNumber | NVARCHAR(20), unique | Citizen-facing case reference |
| Title | NVARCHAR(200) | Short report title |
| Description | NVARCHAR(MAX) | Problem details |
| CategoryID | INT (foreign key) | Report category |
| Location | NVARCHAR(300) | Location description |
| Latitude | DECIMAL(9,6) | Optional geographic coordinate |
| Longitude | DECIMAL(9,6) | Optional geographic coordinate |
| PhotoBlobName | NVARCHAR(300) | Optional photograph stored in Blob Storage |
| SubmittedBy | UNIQUEIDENTIFIER (foreign key) | Citizen who submitted it |
| SubmittedAt | DATETIME2 | Submission date |
| CurrentStatusID | INT (foreign key) | Current case status |
| LeadInstitutionID | INT (foreign key) | Institution leading the case |

**Table 3: Institutions**

| Field | Data type | Purpose |
| --- | --- | --- |
| InstitutionID | INT (primary key) | Institution identity |
| InstitutionName | NVARCHAR(150) | Institution name |
| InstitutionType | NVARCHAR(30) | Municipality, department, etc. |
| District | NVARCHAR(100) | District |
| ContactDetails | NVARCHAR(250) | Official contact information |
| Active | BIT | Whether the institution is active |

**Table 4: Case Assignments**

| Field | Data type | Purpose |
| --- | --- | --- |
| AssignmentID | UNIQUEIDENTIFIER (primary key) | Assignment identity |
| ReportID | UNIQUEIDENTIFIER (foreign key) | Related report |
| InstitutionID | INT (foreign key) | Assigned institution |
| AssignedOfficialID | UNIQUEIDENTIFIER (foreign key) | Responsible official |
| Responsibility | NVARCHAR(500) | Required action |
| AssignmentStatus | NVARCHAR(30) | Current assignment status |
| AssignedAt | DATETIME2 | Assignment date |

**Table 5: Case Referrals**

| Field | Data type | Purpose |
| --- | --- | --- |
| ReferralID | UNIQUEIDENTIFIER (primary key) | Referral identity |
| ReportID | UNIQUEIDENTIFIER (foreign key) | Related case |
| FromInstitutionID | INT (foreign key) | Referring institution |
| ToInstitutionID | INT (foreign key) | Receiving institution |
| Reason | NVARCHAR(MAX) | Why referral is necessary |
| ReferredBy | UNIQUEIDENTIFIER (foreign key) | Official making referral |
| ReferredAt | DATETIME2 | Referral date |
| ReferralStatus | NVARCHAR(20) | Pending, accepted, declined, completed |

**Table 6: Case Updates**

| Field | Data type | Purpose |
| --- | --- | --- |
| UpdateID | UNIQUEIDENTIFIER (primary key) | Update identity |
| ReportID | UNIQUEIDENTIFIER (foreign key) | Related case |
| CreatedBy | UNIQUEIDENTIFIER (foreign key) | Person making update |
| InstitutionID | INT (foreign key) | Institution the update is made on behalf of |
| UpdateText | NVARCHAR(MAX) | Update content |
| Visibility | NVARCHAR(20) | Citizen-visible or internal |
| CreatedAt | DATETIME2 | Update timestamp |

**Table 7: Status History**

| Field | Data type | Purpose |
| --- | --- | --- |
| HistoryID | UNIQUEIDENTIFIER (primary key) | History record |
| ReportID | UNIQUEIDENTIFIER (foreign key) | Related case |
| PreviousStatusID | INT (foreign key) | Previous status |
| NewStatusID | INT (foreign key) | New status |
| ChangedBy | UNIQUEIDENTIFIER (foreign key) | Person making change |
| ChangedAt | DATETIME2 | Change timestamp |
| Reason | NVARCHAR(500) | Explanation |

**Table 8: Citizen Feedback**

| Field | Data type | Purpose |
| --- | --- | --- |
| FeedbackID | UNIQUEIDENTIFIER (primary key) | Feedback identity |
| ReportID | UNIQUEIDENTIFIER (foreign key) | Related case |
| SubmittedBy | UNIQUEIDENTIFIER (foreign key) | Citizen |
| FeedbackText | NVARCHAR(MAX) | Citizen response |
| ResolutionConfirmed | BIT | Whether citizen confirms resolution |
| SubmittedAt | DATETIME2 | Feedback date |

**Table 9: Audit Logs**

| Field | Data type | Purpose |
| --- | --- | --- |
| AuditID | UNIQUEIDENTIFIER (primary key) | Audit record |
| UserID | UNIQUEIDENTIFIER (foreign key) | User responsible |
| Action | NVARCHAR(100) | Action performed |
| RecordType | NVARCHAR(50) | Record affected |
| RecordID | NVARCHAR(64) | Identifier of affected record |
| Timestamp | DATETIME2 | When action occurred |

**Supporting tables**

| Table | Key fields | Purpose |
| --- | --- | --- |
| Roles | RoleID, RoleName | Citizen, Official, Manager, Administrator |
| Categories | CategoryID, CategoryName | Report categories |
| Statuses | StatusID, StatusName, SortOrder | The eight case statuses |
| RoutingRules | RuleID, CategoryID, District, InstitutionID | Suggested lead institution for a category and district |
| Notifications | NotificationID, UserID, ReportID, Message, IsRead, CreatedAt | In-app notifications |

> **Database design principle:** Reports, assignments, referrals, updates and status history are separate records. This prevents the platform from losing important information when a case changes. For the hackathon, it is acceptable to build only the tables needed for the demonstration scenario first (see Part 7), then add the rest.

### 4.6 Proposed API endpoints

All endpoints require a signed-in user. The role column shows who may call each one; the API enforces it.

| Method and route | Roles | Purpose |
| --- | --- | --- |
| `GET /api/me` | Any signed-in user | Returns (or creates) the caller’s profile, role and institution |
| `POST /api/uploads` | Citizen | Returns a short-lived link for uploading a photograph |
| `POST /api/reports` | Citizen | Validates and saves a report, returns the reference number |
| `GET /api/reports/mine` | Citizen | Lists the caller’s own reports |
| `GET /api/reports/{ref}` | Citizen, Official, Manager | Case details, filtered by role and institution |
| `GET /api/cases` | Official, Manager | Cases assigned or referred to the caller’s institution |
| `POST /api/cases/{id}/assign` | Official, Manager | Sets lead institution and assigned official |
| `POST /api/cases/{id}/refer` | Official, Manager | Refers the case to a supporting institution |
| `POST /api/cases/{id}/updates` | Official, Manager | Adds an update (citizen-visible or internal) |
| `POST /api/cases/{id}/status` | Official, Manager | Changes status and records history |
| `POST /api/reports/{id}/feedback` | Citizen | Submits feedback after resolution |
| `GET /api/dashboard/summary` | Manager, Administrator | Totals, by category, by institution, resolution times |
| `GET /api/dashboard/heatmap` | Manager, Administrator | Report coordinates for the map |
| `GET /api/notifications` | Any signed-in user | The caller’s in-app notifications |
| `GET/POST /api/admin/*` | Administrator | Users, roles, institutions, categories, routing rules, audit records |

### 4.7 Suggested repository structure

```
reabona/
  src/                     React app
    components/            Shared UI pieces
    pages/                 Citizen, Staff, Manager, Admin screens
    lib/                   API client, auth helper, types
  api/                     Azure Functions
    src/functions/         One file per endpoint group
    src/lib/               db.ts, auth.ts, audit.ts, storage.ts
  database/                SQL scripts (schema.sql, seed.sql)
  staticwebapp.config.json Routing and security rules
  .github/workflows/       Deployment pipeline
```

## PART 5: SECURITY AND DATA PROTECTION

Security must be considered from the beginning, not added as an afterthought.

### 5.1 Authentication

Authentication verifies the identity of a user.

- Users sign in through Microsoft Entra ID using Azure Static Web Apps built-in authentication. The browser receives a secure session cookie, and the API receives the verified identity with every request.
- Secure sign-in and sign-out.
- Organisational account authentication for officials (in production).
- Appropriate account recovery procedures (handled by the identity provider).
- Multi-factor authentication where required.

### 5.2 Authorisation and role-based access control

Authorisation determines what an authenticated user is permitted to access.

| Role | Permitted access |
| --- | --- |
| Citizen | Own reports and citizen-visible updates |
| Departmental official | Cases assigned or referred to their institution |
| Departmental manager | Departmental cases and management reports |
| Platform administrator | Approved system-management functions |

In ReaBona, authorisation is enforced **in the API**, not only in the interface. For every request, the Function looks up the caller in the Users table, reads their role and institution, and filters the data accordingly (for example, `WHERE SubmittedBy = @userId` for citizens).

- A citizen must not be able to access another citizen’s private reports simply by changing a record ID.
- An official must not automatically have access to every confidential record across every institution.
- Hiding a button in React is never security on its own.

### 5.3 Encryption

Encryption protects information from unauthorised access.

- Encryption in transit: all traffic uses HTTPS (TLS), enforced by Static Web Apps and Azure SQL.
- Encryption at rest: Azure SQL (transparent data encryption) and Blob Storage encrypt data at rest by default.
- Secure handling of uploaded photographs: containers are private, uploads use short-lived write-only links, and file type and size are checked.
- Approved encryption and key-management practices: secrets live in app settings or Azure Key Vault, never in the code repository.

### 5.4 Audit trails

The system should record important actions, including:

- Report creation.
- Case assignment.
- Case referral.
- Status changes.
- Official updates.
- Permission changes.
- Administrative actions.

Audit records identify who performed an action and when. They are written by the API to the AuditLogs table, and technical errors are tracked separately in Application Insights.

### 5.5 POPIA compliance

ReaBona is intended for use in South Africa and must be designed with the Protection of Personal Information Act (POPIA) in mind. Design considerations include:

- Collect only information necessary for the service.
- Explain why personal information is collected.
- Restrict access to personal information.
- Protect personal information from unauthorised access.
- Establish appropriate retention and deletion rules.
- Provide appropriate processes for access and correction requests.
- Establish procedures for security incidents.
- Handle photographs and location information carefully.
- Host data in the **South Africa North** Azure region where available.

The production platform will require a formal privacy and security assessment. A prototype should use fictional demonstration data.

### 5.6 Prototype security limitations

- The prototype uses real sign-in and server-side role checks, which is stronger than a demonstration role selector. It is still not a production-grade deployment.
- Preconfigured Entra sign-in on the Static Web Apps Free plan accepts Microsoft accounts from any organisation. Restricting sign-in to government tenants requires custom authentication on the Standard plan.
- Database connection strings stored as app settings are acceptable for a prototype. Production should use Key Vault and managed identities.
- The team must not claim production-grade security, government endorsement or POPIA certification.

## PART 6: NON-FUNCTIONAL REQUIREMENTS

Non-functional requirements describe the quality and operational expectations of the platform.

### 6.1 Usability

- Clear navigation.
- Simple reporting forms.
- Understandable status descriptions.
- Consistent screen layouts.
- Mobile-friendly design.

### 6.2 Accessibility

- Readable text.
- Appropriate colour contrast.
- Clear labels.
- Accessible form controls (keyboard navigation and screen-reader labels).
- Support for users with different accessibility needs.

### 6.3 Language support

The platform should consider South Africa’s linguistic diversity. Potential future support includes English and relevant local languages used in the deployment area (for example Setswana and Afrikaans), using a translation file in React or Azure AI Translator.

### 6.4 Performance

- Screens should load within reasonable time (Static Web Apps serves the front end from a global content network).
- Forms should submit reliably.
- Case searches should return relevant results (indexed SQL queries).
- Dashboards should display information efficiently (aggregates calculated in SQL, not in the browser).

### 6.5 Reliability

- Submitted reports should be saved correctly (database transactions).
- Errors should be communicated clearly.
- Important records should not be silently lost.
- Appropriate backups and recovery processes should exist (Azure SQL provides automatic backups and point-in-time restore).

### 6.6 Scalability

The design should allow additional municipalities, departments, users and reports to be added without requiring the entire system to be rebuilt. Azure Functions and Static Web Apps scale automatically, and institutions are data, not code.

### 6.7 Low-data accessibility

The platform should aim to minimise unnecessary data usage. Potential approaches:

- Lightweight screens.
- Compressed image uploads (resize photographs in the browser before upload).
- Avoiding unnecessary large downloads.
- Simple forms.
- Mobile-first design, installable as a PWA.

### 6.8 Maintainability

The system should be documented and structured so authorised technical personnel can maintain, improve and troubleshoot it. The code lives in GitHub, the database schema in versioned SQL scripts, and deployment is automated.

## PART 7: HACKATHON PROTOTYPE SCOPE

The prototype should demonstrate the central value of ReaBona without attempting to build an entire provincial government system.

### 7.1 Recommended demonstration scenario

Use one realistic scenario: a public school experiences a water shortage, requiring coordination between the municipality and the Department of Education.

This scenario demonstrates:

- Citizen reporting.
- Categorisation.
- Case registration.
- Institutional assignment.
- Interdepartmental referral.
- Shared case updates.
- Citizen tracking.
- Management visibility.

### 7.2 Minimum viable prototype features

The first working version should contain:

1. Report submission form.
2. Report database.
3. Unique case reference.
4. Case listing for officials.
5. Case details screen.
6. Department assignment.
7. Referral to a supporting department.
8. Official case update.
9. Citizen-facing tracking screen.
10. Basic management dashboard.

**Stretch goals (only after the ten features above work end to end):** Azure Maps heatmap on the manager dashboard, photograph upload to Blob Storage, email notification through Azure Communication Services, live dashboard updates through SignalR, and photo or text categorisation using Azure AI.

### 7.3 Features to postpone

Do not make these essential to the first prototype:

- Artificial intelligence-based routing.
- Automatic identification of every responsible institution.
- Live integrations with municipal systems.
- Advanced geographic information systems.
- Complex real-time messaging.
- Predictive analytics.
- Full SMS infrastructure.
- Automated duplicate detection.
- Province-wide production authentication.

These can be considered after the core case lifecycle works.

## PART 8: STEP-BY-STEP DEVELOPMENT GUIDE

This guide is written for a team where not everyone is an advanced developer. Work through the phases in order. At the end of each phase there is a quick check, so you know it works before moving on.

### PHASE 1: Confirm the development environment

Before building anything, establish:

1. Which Azure subscription the team will use, and whether it is organisational or personal.
2. Whether every team member has access to the same subscription (role **Contributor** on one shared resource group is enough).
3. Which Azure services are available and allowed: Static Web Apps, Functions, SQL Database, Storage, Maps, Communication Services, Key Vault and Application Insights.
4. Whether Microsoft Fabric or Power BI is included. Neither is needed for this guide.
5. Which Azure region to use. Use **South Africa North** for the database and storage where available.
6. A shared GitHub repository that every team member can push to.

**Recommended approach:** Use the hackathon-provided organisational account. Do not build in one person’s private subscription if the intention is for the entire team to collaborate and continue developing it.

**Install on each laptop:**

- Node.js (LTS version) and Git.
- Visual Studio Code with the extensions: Azure Functions, Azure Static Web Apps, SQL Server (mssql), and ESLint.
- Azure Functions Core Tools (`npm install -g azure-functions-core-tools@4`).
- A SQL client: the VS Code SQL Server extension is enough.

**Create the resource group:** In the Azure portal, search for **Resource groups**, select **Create**, name it `rg-reabona`, choose the region and create it. Put every ReaBona resource in this group so you can manage and delete them together.

> **Region note.** Static Web Apps managed functions are only available in a limited set of regions, and South Africa is not one of them. For the hackathon, choose the closest available region (for example West Europe) for the Static Web App, and keep the database in South Africa North. For production, host the API in its own Function app in South Africa North (Static Web Apps Standard plan, “bring your own functions”) so personal information is processed locally.

**Quick check:** every team member can open `rg-reabona` in the portal and push to the GitHub repository.

### PHASE 2: Create the data layer

**What we are building:** the Azure SQL database that stores everything. **Why:** reports, referrals and history must be kept as separate, related records so nothing is lost when a case changes.

**Create the database.** In the Azure portal choose **Create a resource, Databases, SQL Database**. Select `rg-reabona`, name the database `reabona-db`, and create a new server (for example `reabona-sql-<teamname>`). For authentication, use SQL authentication for the prototype and store the admin password safely. Choose **Serverless** compute (General Purpose) with auto-pause to keep costs low. Under **Networking**, enable **Allow Azure services and resources to access this server** and **Add current client IP address**. Select **Create**.

**Create the tables.** Connect to the database from VS Code (SQL Server extension, using the server name and your login) and run the script below. Save it in the repository as `database/schema.sql`.

```sql
CREATE TABLE dbo.Roles (RoleID INT PRIMARY KEY, RoleName NVARCHAR(30) NOT NULL);
CREATE TABLE dbo.Statuses (StatusID INT PRIMARY KEY, StatusName NVARCHAR(30) NOT NULL, SortOrder INT NOT NULL);
CREATE TABLE dbo.Categories (CategoryID INT IDENTITY(1,1) PRIMARY KEY, CategoryName NVARCHAR(60) NOT NULL);

CREATE TABLE dbo.Institutions (
  InstitutionID INT IDENTITY(1,1) PRIMARY KEY,
  InstitutionName NVARCHAR(150) NOT NULL,
  InstitutionType NVARCHAR(30) NOT NULL,
  District NVARCHAR(100) NULL,
  ContactDetails NVARCHAR(250) NULL,
  Active BIT NOT NULL DEFAULT 1);

CREATE TABLE dbo.Users (
  UserID UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  EntraObjectId NVARCHAR(64) NULL,
  FullName NVARCHAR(150) NOT NULL,
  Email NVARCHAR(200) NOT NULL UNIQUE,
  Phone NVARCHAR(30) NULL,
  RoleID INT NOT NULL REFERENCES dbo.Roles(RoleID),
  InstitutionID INT NULL REFERENCES dbo.Institutions(InstitutionID),
  AccountStatus NVARCHAR(20) NOT NULL DEFAULT 'Active',
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());

CREATE SEQUENCE dbo.ReportRefSeq START WITH 1 INCREMENT BY 1;

CREATE TABLE dbo.Reports (
  ReportID UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  ReferenceNumber NVARCHAR(20) NOT NULL UNIQUE,
  Title NVARCHAR(200) NOT NULL,
  Description NVARCHAR(MAX) NOT NULL,
  CategoryID INT NOT NULL REFERENCES dbo.Categories(CategoryID),
  Location NVARCHAR(300) NOT NULL,
  Latitude DECIMAL(9,6) NULL,
  Longitude DECIMAL(9,6) NULL,
  PhotoBlobName NVARCHAR(300) NULL,
  SubmittedBy UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Users(UserID),
  SubmittedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CurrentStatusID INT NOT NULL DEFAULT 1 REFERENCES dbo.Statuses(StatusID),
  LeadInstitutionID INT NULL REFERENCES dbo.Institutions(InstitutionID));

CREATE TABLE dbo.CaseAssignments (
  AssignmentID UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  ReportID UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Reports(ReportID),
  InstitutionID INT NOT NULL REFERENCES dbo.Institutions(InstitutionID),
  AssignedOfficialID UNIQUEIDENTIFIER NULL REFERENCES dbo.Users(UserID),
  Responsibility NVARCHAR(500) NULL,
  AssignmentStatus NVARCHAR(30) NOT NULL DEFAULT 'Active',
  AssignedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());

CREATE TABLE dbo.CaseReferrals (
  ReferralID UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  ReportID UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Reports(ReportID),
  FromInstitutionID INT NOT NULL REFERENCES dbo.Institutions(InstitutionID),
  ToInstitutionID INT NOT NULL REFERENCES dbo.Institutions(InstitutionID),
  Reason NVARCHAR(MAX) NOT NULL,
  ReferredBy UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Users(UserID),
  ReferredAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  ReferralStatus NVARCHAR(20) NOT NULL DEFAULT 'Pending');

CREATE TABLE dbo.CaseUpdates (
  UpdateID UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  ReportID UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Reports(ReportID),
  CreatedBy UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Users(UserID),
  InstitutionID INT NULL REFERENCES dbo.Institutions(InstitutionID),
  UpdateText NVARCHAR(MAX) NOT NULL,
  Visibility NVARCHAR(20) NOT NULL DEFAULT 'Internal',
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());

CREATE TABLE dbo.StatusHistory (
  HistoryID UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  ReportID UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Reports(ReportID),
  PreviousStatusID INT NULL REFERENCES dbo.Statuses(StatusID),
  NewStatusID INT NOT NULL REFERENCES dbo.Statuses(StatusID),
  ChangedBy UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Users(UserID),
  ChangedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  Reason NVARCHAR(500) NULL);

CREATE TABLE dbo.CitizenFeedback (
  FeedbackID UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  ReportID UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Reports(ReportID),
  SubmittedBy UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Users(UserID),
  FeedbackText NVARCHAR(MAX) NULL,
  ResolutionConfirmed BIT NOT NULL,
  SubmittedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());

CREATE TABLE dbo.AuditLogs (
  AuditID UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  UserID UNIQUEIDENTIFIER NULL REFERENCES dbo.Users(UserID),
  Action NVARCHAR(100) NOT NULL,
  RecordType NVARCHAR(50) NOT NULL,
  RecordID NVARCHAR(64) NULL,
  Timestamp DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());

CREATE TABLE dbo.RoutingRules (
  RuleID INT IDENTITY(1,1) PRIMARY KEY,
  CategoryID INT NOT NULL REFERENCES dbo.Categories(CategoryID),
  District NVARCHAR(100) NULL,
  InstitutionID INT NOT NULL REFERENCES dbo.Institutions(InstitutionID));

CREATE TABLE dbo.Notifications (
  NotificationID UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
  UserID UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Users(UserID),
  ReportID UNIQUEIDENTIFIER NULL REFERENCES dbo.Reports(ReportID),
  Message NVARCHAR(300) NOT NULL,
  IsRead BIT NOT NULL DEFAULT 0,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
```

**Add the starting data** (`database/seed.sql`). Use clearly fictional institutions so nothing is presented as a real government record:

```sql
INSERT dbo.Roles VALUES (1,'Citizen'),(2,'Official'),(3,'Manager'),(4,'Administrator');
INSERT dbo.Statuses VALUES (1,'Submitted',1),(2,'Under review',2),(3,'Assigned',3),(4,'Referred',4),
  (5,'In progress',5),(6,'Awaiting information',6),(7,'Resolved',7),(8,'Closed',8);
INSERT dbo.Categories (CategoryName) VALUES ('Water and sanitation'),('Education'),('Healthcare'),
  ('Roads and infrastructure'),('Electricity'),('Waste management'),('Other');
INSERT dbo.Institutions (InstitutionName, InstitutionType, District) VALUES
  ('Demo Local Municipality','Municipality','Demo District'),
  ('Department of Education (demo)','Department',NULL),
  ('Department of Health (demo)','Department',NULL),
  ('Department of Public Works and Roads (demo)','Department',NULL);
```

Then add team members as officials, a manager and an administrator, using the email addresses they will sign in with (see Phase 4), for example:

```sql
INSERT dbo.Users (FullName, Email, RoleID, InstitutionID)
VALUES ('Demo Municipal Official','official1@example.com',2,1),
       ('Demo Education Official','official2@example.com',2,2),
       ('Demo Manager','manager@example.com',3,1),
       ('Demo Admin','admin@example.com',4,NULL);
```

**Quick check:** `SELECT * FROM dbo.Statuses` returns eight rows, and `SELECT NEXT VALUE FOR dbo.ReportRefSeq` returns a number (the first call uses up number 1, which is fine).

### PHASE 3: Create the application skeleton

**What we are building:** a React front end and an Azure Functions API in one repository, running locally. **Why:** the Static Web Apps command-line tool runs both together and imitates the real sign-in, so what works on your laptop works in Azure.

1. Create the project and install the libraries:

```bash
npm create vite@latest reabona -- --template react-ts
cd reabona
npm install
npm install react-router-dom @tanstack/react-query react-hook-form zod @hookform/resolvers recharts azure-maps-control @fluentui/react-components
npm install -D @azure/static-web-apps-cli
```

2. Create the API folder:

```bash
mkdir api && cd api
func init . --worker-runtime node --language typescript --model V4
npm install mssql @azure/storage-blob
npm install -D @types/mssql
cd ..
```

3. Create `api/local.settings.json` (this file is for your laptop only and must be listed in `.gitignore`):

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    "SQL_CONNECTION": "Server=<your-server>.database.windows.net;Database=reabona-db;User Id=<user>;Password=<password>;Encrypt=true",
    "STORAGE_CONNECTION": "<blob storage connection string, added in the photo step>"
  }
}
```

4. Create `api/src/lib/db.ts`, a small helper that reuses one database connection:

```ts
import sql from 'mssql';
let pool: sql.ConnectionPool | null = null;
export async function getPool() {
  if (!pool) pool = await new sql.ConnectionPool(process.env.SQL_CONNECTION as string).connect();
  return pool;
}
```

5. Run everything together from the project root:

```bash
npx swa start http://localhost:5173 --run "npm run dev" --api-location api
```

**Expected result:** the app opens at `http://localhost:4280`. The Vite page appears, and `http://localhost:4280/.auth/login/aad` shows a simulated sign-in page.

**Common errors:** if the API does not start, check that Azure Functions Core Tools is installed and that `api/package.json` has a `build` script. If the database connection fails, add your current IP address to the SQL server firewall.

### PHASE 4: Authentication and roles

**What we are building:** sign-in through Microsoft Entra ID and role checks in the API. **Why:** the document requires real access control, and the browser can never be trusted to enforce it.

How it works: Static Web Apps handles sign-in and passes the verified identity to the API in a header named `x-ms-client-principal`. The API looks the person up in the **Users** table. Officials, managers and administrators are pre-registered by email (as in Phase 2). Anyone else who signs in for the first time is created as a **Citizen**.

1. Create `staticwebapp.config.json` in the project root:

```json
{
  "routes": [
    { "route": "/api/*", "allowedRoles": ["authenticated"] },
    { "route": "/app/*", "allowedRoles": ["authenticated"] },
    { "route": "/login", "redirect": "/.auth/login/aad" },
    { "route": "/logout", "redirect": "/.auth/logout" }
  ],
  "responseOverrides": {
    "401": { "redirect": "/.auth/login/aad?post_login_redirect_uri=.referrer", "statusCode": 302 }
  },
  "navigationFallback": { "rewrite": "/index.html", "exclude": ["/assets/*", "/api/*"] }
}
```

2. Create `api/src/lib/auth.ts`:

```ts
import { HttpRequest } from '@azure/functions';
import sql from 'mssql';
import { getPool } from './db';

export type AppUser = { userId: string; fullName: string; email: string; role: string; institutionId: number | null };

export async function getCurrentUser(req: HttpRequest): Promise<AppUser | null> {
  const header = req.headers.get('x-ms-client-principal');
  if (!header) return null;
  const p = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
  const email = String(p.userDetails || '').toLowerCase();
  const pool = await getPool();
  let res = await pool.request().input('email', sql.NVarChar, email).input('oid', sql.NVarChar, p.userId)
    .query(`UPDATE dbo.Users SET EntraObjectId = @oid WHERE Email = @email AND EntraObjectId IS NULL;
            SELECT u.UserID, u.FullName, u.Email, r.RoleName, u.InstitutionID
            FROM dbo.Users u JOIN dbo.Roles r ON r.RoleID = u.RoleID
            WHERE u.Email = @email AND u.AccountStatus = 'Active'`);
  if (res.recordset.length === 0) {
    res = await pool.request().input('email', sql.NVarChar, email).input('oid', sql.NVarChar, p.userId)
      .query(`INSERT dbo.Users (FullName, Email, EntraObjectId, RoleID) VALUES (@email, @email, @oid, 1);
              SELECT u.UserID, u.FullName, u.Email, r.RoleName, u.InstitutionID
              FROM dbo.Users u JOIN dbo.Roles r ON r.RoleID = u.RoleID WHERE u.Email = @email`);
  }
  const u = res.recordset[0];
  return { userId: u.UserID, fullName: u.FullName, email: u.Email, role: u.RoleName, institutionId: u.InstitutionID };
}

export function hasRole(user: AppUser, roles: string[]) {
  return roles.includes(user.role);
}
```

3. Add the `GET /api/me` function that returns the caller’s profile and role. The React app calls it once after sign-in, stores the role, and uses it to decide which menu items and routes to show.
4. In React, create a `RequireRole` component that redirects people away from screens their role cannot use. This is for usability only. The API checks the role again on every request.

**Quick check:** signing in with a citizen email shows the citizen menu; signing in with `official1@example.com` (use a real address you can sign in with) shows the official menu. Calling `/api/cases` as a citizen returns 403.

### PHASE 5: Design the application screens

Create the following screens (React pages). Build the citizen screens first, then the official screens, then the manager screens.

| Screen | Who sees it | Purpose and content |
| --- | --- | --- |
| 1. Welcome / Home | Everyone | ReaBona name and slogan, short explanation, **Report an Issue**, **Track a Report** and **Staff Sign-in** buttons |
| 2. Citizen Report Form | Citizen | Title, category, description, location (with Azure Maps address search as a stretch), optional photograph, Submit. All fields except the photograph are required. After submission show a confirmation and the generated reference number |
| 3. My Reports | Citizen | Reference number, title, category, date submitted, current status and latest citizen-visible update. Includes search by reference number |
| 4. Official Dashboard | Official | Counts and a list of cases by status: new, under review, assigned, referred, in progress, resolved. Open a case to manage it |
| 5. Case Details | Official, Manager | Reference, title, description, category, location, submitting user (subject to permissions), lead institution, supporting institutions, current status and a full timeline of updates, referrals and status changes |
| 6. Assignment and Referral | Official | Lead institution, supporting institution, referral reason, assigned official, status, Update button. For the demo, the municipality is the lead and the Department of Education is supporting |
| 7. Management Dashboard | Manager | Total, pending, in-progress and resolved counts, plus category and institution summaries, average resolution time and heatmap if time allows |
| 8. Administration | Administrator | Users and roles, institutions, categories, routing rules and audit log |

Suggested validation on the report form: use Zod to require title, category, description and location, and show the error next to the field. The API repeats the same validation.

### PHASE 6: Configure the reporting workflow

**What happens when the citizen submits:** the API validates the fields, generates the reference number, saves the report, records the first status, writes an audit entry and creates a notification, all in one database transaction. If any step fails, nothing is saved.

Create `api/src/functions/reports.ts`:

```ts
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import sql from 'mssql';
import { getPool } from '../lib/db';
import { getCurrentUser, hasRole } from '../lib/auth';

app.http('createReport', {
  methods: ['POST'], route: 'reports', authLevel: 'anonymous',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const user = await getCurrentUser(req);
    if (!user) return { status: 401 };
    if (!hasRole(user, ['Citizen'])) return { status: 403 };
    const b: any = await req.json();
    if (!b.title || !b.categoryId || !b.description || !b.location)
      return { status: 400, jsonBody: { error: 'Missing required fields' } };

    const tx = new sql.Transaction(await getPool());
    await tx.begin();
    try {
      const seq = await new sql.Request(tx).query('SELECT NEXT VALUE FOR dbo.ReportRefSeq AS n');
      const ref = 'RB-' + new Date().getFullYear() + '-' + String(seq.recordset[0].n).padStart(5, '0');
      const ins = await new sql.Request(tx)
        .input('ref', sql.NVarChar, ref).input('title', sql.NVarChar, b.title)
        .input('desc', sql.NVarChar, b.description).input('cat', sql.Int, b.categoryId)
        .input('loc', sql.NVarChar, b.location).input('lat', sql.Decimal(9, 6), b.latitude ?? null)
        .input('lng', sql.Decimal(9, 6), b.longitude ?? null).input('photo', sql.NVarChar, b.photoBlobName ?? null)
        .input('uid', sql.UniqueIdentifier, user.userId)
        .query(`INSERT dbo.Reports (ReferenceNumber, Title, Description, CategoryID, Location, Latitude, Longitude, PhotoBlobName, SubmittedBy)
                OUTPUT inserted.ReportID VALUES (@ref, @title, @desc, @cat, @loc, @lat, @lng, @photo, @uid)`);
      const id = ins.recordset[0].ReportID;
      await new sql.Request(tx).input('rid', sql.UniqueIdentifier, id).input('uid', sql.UniqueIdentifier, user.userId)
        .query(`INSERT dbo.StatusHistory (ReportID, PreviousStatusID, NewStatusID, ChangedBy, Reason) VALUES (@rid, NULL, 1, @uid, 'Report submitted');
                INSERT dbo.AuditLogs (UserID, Action, RecordType, RecordID) VALUES (@uid, 'CreateReport', 'Report', CAST(@rid AS NVARCHAR(64)));
                INSERT dbo.Notifications (UserID, ReportID, Message) VALUES (@uid, @rid, 'Your report was submitted.')`);
      await tx.commit();
      return { status: 201, jsonBody: { reference: ref } };
    } catch (e) { await tx.rollback(); throw e; }
  }
});
```

Also create `GET /api/reports/mine` (always filtered with `WHERE SubmittedBy = @userId`) and `GET /api/reports/{ref}` (citizens may only open their own report, and only citizen-visible updates are returned).

**Photographs (optional but recommended):**

1. In the portal create a **Storage account** (same resource group, region South Africa North) and a **private** container named `report-photos`.
2. Add the storage connection string to the API settings as `STORAGE_CONNECTION`.
3. Create `POST /api/uploads`. It checks the caller is signed in, creates a random blob name, and returns a short-lived (about 10 minutes), write-only shared access link.
4. In React, resize the image in the browser (about 1280 pixels wide), then upload it directly to that link with a `PUT` request and the header `x-ms-blob-type: BlockBlob`.
5. Send only the blob name with the report. In the storage account’s **Resource sharing (CORS)** settings, allow your app’s address for the `PUT` method.

**Quick check:** submitting a complete report returns a reference such as `RB-2026-00002`, and the row appears in `dbo.Reports`. Submitting with an empty title returns a 400 error and saves nothing.
