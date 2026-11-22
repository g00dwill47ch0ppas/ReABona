# ReaBona prototype

ReaBona is a service-delivery reporting and case-coordination prototype for the fictional school water-shortage scenario described in [docs/ReaBona.md](docs/ReaBona.md).

## Run locally

Requires Node.js 20 or newer.

1. Install the API dependency, then install frontend dependencies and start both services:

   ```powershell
   cd api
   npm install
   cd ..
   cd web
   npm install
   npm run setup:speech
   npm run setup:map
   npm run setup:vision
   npm run dev
   ```

2. Open the Vite URL shown in the terminal. Keep the command running; press Ctrl+C to stop both services. The API stores demo data in `api/data/demo.json` and seeds the school-water case on first launch.

If either port is already in use, stop the existing ReaBona development process before starting the combined command. If the browser reports a 502, check that the API started on `127.0.0.1:3001` and restart the combined command.

The account selector switches among fictional citizen, municipal official, education official and manager identities. The local API binds to `127.0.0.1` and uses an `X-Demo-User` header strictly for local demonstration. This is not authentication and must not be used or deployed as production security.

## Implemented prototype flow

- Citizens submit reports, optionally attaching one JPEG, PNG or WebP photo (up to 10 MB), receive a server-generated reference number, view their reports and follow citizen-visible case history. They can capture a photo using a browser-supported camera or choose an existing image. Camera access requires browser permission and a secure context such as localhost or HTTPS. Images may contain location metadata and other sensitive details.
- On the report form, citizens can request an AI-suggested category and description using the title and, optionally, locally detected issue labels from their photo. The photo itself stays on the device; the title and detected labels are sent to Azure AI, so avoid sensitive details. Suggestions can be wrong or incomplete and must be reviewed and applied explicitly. The local model detects a limited set of objects; it does not read text (OCR). If local analysis is unavailable, untick photo detection to request a title-only suggestion.
- On the report form, citizens can use a one-time GPS reading or place/move a pin on the offline South Africa map, or switch to a typed location. GPS requires browser permission and localhost or HTTPS. The selected coordinates or typed location are saved with the report; the map and positioning requests do not send them to an external map service. GPS indicates the device's position, so check the pin represents the issue. If GPS or the map is unavailable, use a typed location.
- Reports receive a predefined category-based routing suggestion; this does not determine legal jurisdiction.
- Officials can confirm assignment to their institution, refer cases to a supporting institution, change valid statuses and publish internal or citizen-visible updates. After citizens confirm a resolution, the feedback panel disappears for that resolution; it returns if the case is reopened and resolved again.
- Officials can use their own Ask ReaBona chat for general guidance. Only the text entered in that chat is sent to Azure; report details and photos are not sent automatically. Do not enter sensitive information.
- In the official assistant, Photo analysis runs an offline object detector on photos from accessible reports. Its optional boxes and suggested departments/actions are unverified hints, not diagnoses, and must be checked by qualified officials. The general-purpose model is not trained specifically for infrastructure faults and can miss or misidentify them. It does not read text (OCR).
- Managers see institution-scoped counts and category/institution summaries, average time from submission to the first recorded resolution (with its sample size), and a category-filtered density map. GPS reports are aggregated into approximate 0.1-degree cells; typed locations are listed separately. The map does not identify wards.
- If a report remains in its initial Submitted status without a status transition for 30 minutes, the assigned lead-institution official(s), or otherwise the lead institution's officials, and the submitting citizen receive one reminder. After one hour without a status transition, the responsible officials and the department's managers are notified; if the department has no manager, the demo managers receive the escalation. The manager's notification includes the reference, title, department and assigned officer (or “Unassigned”). A fallback manager receives the details but does not gain access to another department's case. Reminders and escalations are checked while the local API is running, including on startup and notification requests; they cannot be delivered while it is stopped. A backlog message is a generic notice, not a verified estimate of service time.
- Citizens can use Ask ReaBona to ask about reporting and tracking, start new chats, and have the assistant help prepare a report. The camera button next to the chat send button captures a photo for the report, not for the chat. Review or edit the title, category, location and description, optionally attach a photo, then explicitly confirm before submission. The assistant cannot access existing reports or see photos. Messages and text report drafts are sent to the configured Azure AI service; do not enter personal or sensitive information.
- All demo roles can choose English, Setswana, Sesotho (Southern Sotho) or Afrikaans for interface labels. The app preloads translations sequentially and caches the fixed interface catalog in the browser; the first load can still take time and incur Azure usage charges. Translations are machine-generated and require review. Existing reports, notifications and other user-authored text are not automatically translated or changed. Ask ReaBona remains citizen-only and is instructed to respond in the language of the latest message.
- Officials and managers can request case-specific AI insights after reviewing and removing sensitive details from the case text. Only the reviewed text, category and optional locally detected photo labels are sent to Azure; photos remain local. AI suggestions are not verified and require professional review. The detector does not read text (OCR).
- Manager dashboards automatically request AI suggestions based on aggregate counts and resolution statistics, not case text, coordinates or typed locations. These suggestions may be inaccurate and Azure requests can incur charges.
- The microphone buttons record up to 30 seconds and transcribe locally in the browser using the multilingual Whisper tiny model. Select the spoken language first (English is the default); automatic language detection is not available. English and Afrikaans are available; Setswana and Sesotho voice transcription are not supported by this model. Press the microphone again to stop; review and edit the transcription before submitting. Microphone permission and a secure context (localhost or HTTPS) are required. Audio is not sent to Azure or stored on the server. The first model load can take time and speech accuracy varies by language and accent.
- All local demo writes persist to a JSON file; `database/schema.sql` and `database/seed.sql` define the Azure SQL data foundation for a later authenticated Azure Functions implementation.

## Assistant configuration

Set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, and `MODEL_DEPLOYMENT` in the root `.env` file and restart the app. Use an Azure resource endpoint or a full deployment chat-completions URL with `api-version`; the deployment must support JSON response format. The API reads these values server-side; never expose the key in frontend code or commit `.env`. Chats and unsubmitted drafts are held in memory and cleared when the page reloads or the demo account changes. Messages and text report drafts are sent to Azure when the assistant is contacted; photos are not. Submitted photos are stored in the local demo JSON file and are visible to users who can access the report. Azure usage may incur charges.

The one-time `npm run setup:speech` command downloads and verifies approximately 44 MB of [Xenova/whisper-tiny](https://huggingface.co/Xenova/whisper-tiny) model files (Apache-2.0) into `web/public/models`. It downloads model files only, not recordings; transcription itself uses local assets. Run the command again if the model files are missing.

The one-time `npm run setup:vision` command downloads and verifies approximately 155 MB of [Xenova/owlvit-base-patch32](https://huggingface.co/Xenova/owlvit-base-patch32) model files into `web/public/models`. Analysis runs in the browser without sending the photo to a remote model. Run the command again if the model files are missing; model loading and inference can take time.

The one-time `npm run setup:map` command downloads an approximately 346 MB [BBBike South Africa](https://data.bbbike.org/osm/region/africa/south-africa/) basemap and Open Sans map fonts into `web/public/maps`. Map data is © OpenStreetMap contributors, available under the [ODbL](https://www.openstreetmap.org/copyright); Open Sans is available under the SIL Open Font License. The map is limited to South Africa and its surrounding border area; map data may become outdated. The setup command downloads public assets only, not the user's location. This setup script requires PowerShell.

## Restricted Telegram demo bot

The bot runs only while the local API is running, and accepts messages only from explicitly allowlisted Telegram user IDs in private chats. It is a demo, not production authentication; do not send real personal or sensitive information. Telegram receives all messages, locations and photos sent through it. Telegram reports use separate local citizen identities and are visible to the responsible demo institution; they are not linked to the web demo citizen account. The bot sends backlog reminders and status changes to the originating private chat, including the report reference. Messages are persisted and retried while the bot is enabled; delivery can be delayed by polling, network errors or a disabled bot. If an ID is removed from the allowlist, its queued messages remain pending until it is allowed again. A delivery retry may produce a duplicate if Telegram accepted a message before a connection or persistence failure.

1. Set `TELEGRAM_BOT_TOKEN` in the root `.env`; keep the token secret. Leave `TELEGRAM_ALLOWED_USER_IDS` unset while identifying your account.
2. Send `/start` to your bot in a private Telegram chat. From `api`, run `npm run telegram:identify`. Verify which numeric user ID is yours; the command prints IDs from pending private `/start` messages and does not print message contents or the token. If multiple users started the bot, only allow the intended ID.
3. Add `TELEGRAM_ALLOWED_USER_IDS=123456789` to `.env`, replacing the example with your verified ID. Multiple approved IDs may be comma-separated. Restart the app. A Telegram webhook or another active poller prevents long polling; disable or resolve those separately rather than running multiple instances.
4. Send `/start` again to begin. The bot asks for title, category, description, typed or shared location, and an optional Telegram photo. It shows the answers and submits only after `YES`; `/cancel` discards a draft. Drafts, pending messages, Telegram IDs and reports persist in the local demo JSON file. The bot does not support a web account link or interactive report tracking.

## Checks

```powershell
cd api
npm test
```

```powershell
cd web
npm run build
npm run lint
```

## Deployment status

This repository currently contains a local demo API, not an Azure Functions deployment. Azure provisioning, Entra ID integration, Azure SQL connectivity, Blob uploads and production security/privacy review remain required before any hosted or real-data use. Do not put credentials in the repository.
