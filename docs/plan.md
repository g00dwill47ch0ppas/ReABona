# ReaBona application execution plan

## Problem and proposed approach

The workspace currently contains only the ReaBona specification in `docs/ReaBona.md`; there is no application code yet. Build the hackathon MVP around the documented school water-shortage scenario, delivering the ten minimum features end to end before considering optional integrations. Use the specified React/Vite/TypeScript frontend, Azure Functions API, Azure SQL data model and Static Web Apps local workflow. Develop and validate locally first, then deploy to Azure when the team confirms access, service availability, region and configuration.

## Execution phases

1. **Confirm scope and development prerequisites**
   - Use the demo scenario and MVP feature list in Part 7 as the acceptance boundary.
   - Confirm team tools, Node.js/Git, local Azure Functions/App Services tooling using the Azure subscription: ceec9fec-a2ef-481f-bc76-460bf4bf7f1a
   - Keep all demonstration data fictional; do not treat prototype authentication or controls as production-grade.

2. **Create the app skeleton and data foundation**
   - Establish the React/Vite/TypeScript and Azure Functions TypeScript app structure.
   - Add versioned SQL schema and fictional seed data for users/roles, institutions, categories, statuses, reports, assignments, referrals, updates, status history, notifications and audit entries.
   - Keep credentials and local settings out of source control; document the local run command.

3. **Implement identity and authorization**
   - Add caller profile lookup, role and institution resolution, and route protection for Citizen, Official, Manager and Administrator roles.
   - Enforce authorization and institution/case filtering in every API endpoint; frontend route guards are usability only.
   - Verify citizens can access only their own cases and citizen-visible updates, while officials/managers see only institution-appropriate cases.

4. **Build the citizen reporting and tracking journey**
   - Implement the welcome page, validated report form, server-created reference number, submission confirmation, My Reports and case tracking.
   - Persist report creation, initial status history, audit entry and in-app notification atomically.
   - Return only permitted data and updates from case detail endpoints.

5. **Build official case handling and collaboration**
   - Implement case list/detail screens, assignment, lead/supporting institution referrals, official updates, status changes and a consolidated timeline.
   - Preserve the lead institution and record each institution's responsibility and actions.
   - Add role-checked APIs and auditable history for each state-changing action.

6. **Build the management view**
   - Implement the manager dashboard with total, pending, in-progress and resolved counts, plus category and institution summaries.
   - Use server-side aggregates and make clear that an official's “resolved” status is not the same as citizen confirmation.

7. **Verify the full MVP and prepare deployment**
   - Run focused API and UI checks plus a complete demo flow: submit report → route/assign → refer → update/status change → citizen tracking → manager overview.
   - Check validation errors, unauthorized access, cross-citizen access, institution boundaries, transactional persistence and responsive/accessibility basics.
   - Once Azure access and approved region/service choices are confirmed, configure and deploy the app and database; validate the deployed flow without using real citizen data.

8. **Consider stretch features only after MVP acceptance**
   - Prioritize optional photo upload to private Blob Storage and Azure Maps if time and service access permit.
   - Defer email, SignalR, AI, external government integrations, predictive analytics and production-wide identity until the core workflow is stable and approved.

## Key decisions and considerations

- **Scope:** Hackathon MVP only; broader prototype and production hardening are excluded from the initial delivery.
- **Deployment:** Local-first. Azure provisioning/deployment follows local end-to-end validation and confirmation of subscription, service availability, cost and region.
- **Routing:** Use predefined category/district rules or explicit manual selection; do not claim automatic jurisdiction determination.
- **Security/privacy:** API-enforced roles and data filtering are MVP requirements. Use fictional seed data, protect secrets, restrict uploads if implemented, and treat POPIA assessment and production identity as follow-on work.
- **Specification review:** Treat code snippets as illustrative. Validate Azure Functions, Static Web Apps, identity headers, SQL driver, storage upload and configuration details against the selected current runtime before implementation.
- **Current repository state:** Only `docs/ReaBona.md` is present; no existing code conventions, tests or build commands can be relied on.

## Local implementation boundary

The runnable MVP uses a localhost-only Node demo API and fictional demo identities so the end-to-end workflow can be developed and tested without Azure credentials. `database/schema.sql` and `database/seed.sql` establish the Azure SQL data model, but the Azure Functions adapter, Entra ID integration, Azure SQL connection and hosted deployment remain follow-up work; the demo API must not be exposed or used with real data.
