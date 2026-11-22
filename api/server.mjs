import { createServer as createHttpServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { createAssistant, validateChatMessages, validateInterfaceLanguage, validateReportDraft } from './assistant.mjs'
import { createUiTranslator } from './ui-translation.mjs'
import { createOfficialAssistant } from './official-assistant.mjs'
import { createReportSuggester, validateSuggestionInput } from './report-suggestions.mjs'
import { createInsights, validateCaseInsightInput } from './insights.mjs'
import { createTelegramBot } from './telegram-bot.mjs'

const year = new Date().getFullYear()
const statuses = ['Submitted', 'Under review', 'Assigned', 'Referred', 'In progress', 'Awaiting information', 'Resolved', 'Closed']
const transitions = {
  Submitted: ['Under review', 'Assigned'],
  'Under review': ['Assigned', 'Awaiting information', 'Resolved'],
  Assigned: ['Referred', 'In progress', 'Awaiting information'],
  Referred: ['In progress', 'Awaiting information', 'Resolved'],
  'In progress': ['Awaiting information', 'Resolved'],
  'Awaiting information': ['In progress', 'Resolved'],
  Resolved: ['In progress', 'Closed'],
  Closed: [],
}

function seedData() {
  const submittedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const reportId = 'e506a228-1b1d-46b3-90e0-000000000001'
  return {
    nextReference: 2,
    users: [
      { userId: '00000000-0000-4000-8000-000000000001', demoId: 'citizen', fullName: 'Thato Mokoena', email: 'thato.resident@example.test', role: 'Citizen', institutionId: null },
      { userId: '00000000-0000-4000-8000-000000000002', demoId: 'municipal-official', fullName: 'Kagiso Molefe', email: 'kagiso.official@example.test', role: 'Official', institutionId: 1 },
      { userId: '00000000-0000-4000-8000-000000000003', demoId: 'education-official', fullName: 'Lerato Ndlovu', email: 'lerato.education@example.test', role: 'Official', institutionId: 2 },
      { userId: '00000000-0000-4000-8000-000000000004', demoId: 'manager', fullName: 'Naledi Radebe', email: 'naledi.manager@example.test', role: 'Manager', institutionId: 1 },
    ],
    institutions: [
      { institutionId: 1, institutionName: 'Demo Local Municipality', institutionType: 'Municipality', district: 'Demo District' },
      { institutionId: 2, institutionName: 'Department of Education (demo)', institutionType: 'Department', district: 'Demo District' },
      { institutionId: 3, institutionName: 'Department of Health (demo)', institutionType: 'Department', district: 'Demo District' },
      { institutionId: 4, institutionName: 'Department of Public Works and Roads (demo)', institutionType: 'Department', district: 'Demo District' },
    ],
    categories: [
      { categoryId: 1, categoryName: 'Water and sanitation' },
      { categoryId: 2, categoryName: 'Education' },
      { categoryId: 3, categoryName: 'Healthcare' },
      { categoryId: 4, categoryName: 'Roads and infrastructure' },
      { categoryId: 5, categoryName: 'Electricity' },
      { categoryId: 6, categoryName: 'Waste management' },
      { categoryId: 7, categoryName: 'Other public-service issues' },
    ],
    reports: [
      {
        reportId,
        referenceNumber: `RB-${year}-00001`,
        title: 'No water at Metsi Primary School',
        description: 'The school has had no running water for three days. Learners and staff need access to clean water and the sanitation facilities cannot be used normally.',
        categoryId: 1,
        location: 'Metsi Primary School, Demo District',
        latitude: null,
        longitude: null,
        submittedBy: '00000000-0000-4000-8000-000000000001',
        submittedAt,
        currentStatus: 'Submitted',
        leadInstitutionId: 1,
      },
    ],
    assignments: [
      { assignmentId: randomUUID(), reportId, institutionId: 1, assignedOfficialId: '00000000-0000-4000-8000-000000000002', responsibility: 'Investigate the water supply interruption', assignedAt: submittedAt },
    ],
    referrals: [],
    updates: [],
    history: [
      { historyId: randomUUID(), reportId, previousStatus: null, newStatus: 'Submitted', changedBy: '00000000-0000-4000-8000-000000000001', reason: 'Report submitted', changedAt: submittedAt },
    ],
    feedback: [],
    notifications: [
      { notificationId: randomUUID(), userId: '00000000-0000-4000-8000-000000000001', reportId, message: 'Your report was submitted.', isRead: false, createdAt: submittedAt },
    ],
    audits: [
      { auditId: randomUUID(), userId: '00000000-0000-4000-8000-000000000001', action: 'CreateReport', recordType: 'Report', recordId: reportId, createdAt: submittedAt },
    ],
  }
}

function loadData(path) {
  if (!path || !existsSync(path)) return seedData()
  return JSON.parse(readFileSync(path, 'utf8'))
}

function saveData(path, data) {
  if (!path) return
  mkdirSync(dirname(path), { recursive: true })
  const temporaryPath = `${path}.${process.pid}.tmp`
  writeFileSync(temporaryPath, JSON.stringify(data, null, 2), { mode: 0o600 })
  renameSync(temporaryPath, path)
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(body === undefined ? '' : JSON.stringify(body))
}

function getUser(data, request) {
  const demoId = request.headers['x-demo-user']
  if (typeof demoId !== 'string' || !demoId) return null
  return data.users.find(user => user.demoId === demoId) || null
}

function getInstitution(data, institutionId) {
  return data.institutions.find(institution => institution.institutionId === institutionId) || null
}

function getReport(data, referenceNumber) {
  return data.reports.find(report => report.referenceNumber.toLowerCase() === referenceNumber.toLowerCase()) || null
}

function canAccessReport(data, user, report) {
  if (user.role === 'Citizen') return report.submittedBy === user.userId
  if (!['Official', 'Manager'].includes(user.role)) return false
  const institutions = new Set([
    report.leadInstitutionId,
    ...data.assignments.filter(item => item.reportId === report.reportId).map(item => item.institutionId),
    ...data.referrals.filter(item => item.reportId === report.reportId && item.status !== 'Declined').map(item => item.toInstitutionId),
  ])
  return institutions.has(user.institutionId)
}

function currentResolutionConfirmed(data, report) {
  const resolution = data.history.findLast(item => item.reportId === report.reportId && item.newStatus === 'Resolved')
  if (!resolution) return false
  return data.feedback.some(item => item.reportId === report.reportId && item.resolutionConfirmed === true &&
    (item.resolutionHistoryId === resolution.historyId ||
      (!item.resolutionHistoryId && item.submittedAt >= resolution.changedAt)))
}

function publicReport(data, report, user, includeTimeline = false) {
  const category = data.categories.find(item => item.categoryId === report.categoryId)
  const leadInstitution = getInstitution(data, report.leadInstitutionId)
  const output = {
    reportId: report.reportId,
    referenceNumber: report.referenceNumber,
    title: report.title,
    description: report.description,
    category: category?.categoryName || 'Other',
    location: report.location,
    submittedAt: report.submittedAt,
    currentStatus: report.currentStatus,
    leadInstitution: leadInstitution?.institutionName || null,
  }
  if (user.role === 'Official' || user.role === 'Manager') {
    output.submittedBy = data.users.find(item => item.userId === report.submittedBy)?.fullName || 'Citizen'
    output.leadInstitutionId = report.leadInstitutionId
    output.allowedNextStatuses = user.institutionId === report.leadInstitutionId ? transitions[report.currentStatus] : []
  }
  if (user.role === 'Citizen') {
    output.resolutionConfirmed = report.currentStatus === 'Resolved' && currentResolutionConfirmed(data, report)
    const citizenUpdates = data.updates
      .filter(item => item.reportId === report.reportId && item.visibility === 'Citizen')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    output.latestCitizenUpdate = citizenUpdates[0]?.text || null
  }
  if (includeTimeline) {
    output.photo = report.photo || null
    const assigned = data.assignments.filter(item => item.reportId === report.reportId).map(item => item.institutionId)
    const referred = data.referrals.filter(item => item.reportId === report.reportId && item.status !== 'Declined').map(item => item.toInstitutionId)
    output.institutions = [...new Set([report.leadInstitutionId, ...assigned, ...referred])]
      .map(id => getInstitution(data, id)?.institutionName)
      .filter(Boolean)
    const history = data.history.filter(item => item.reportId === report.reportId).map(item => ({
      kind: 'status',
      text: `Status changed to ${item.newStatus}${item.reason ? ` — ${item.reason}` : ''}`,
      createdAt: item.changedAt,
      actor: data.users.find(person => person.userId === item.changedBy)?.fullName || 'System',
    }))
    const updates = data.updates.filter(item => item.reportId === report.reportId && (item.visibility === 'Citizen' || user.role !== 'Citizen')).map(item => ({
      kind: 'update',
      text: item.text,
      createdAt: item.createdAt,
      actor: data.users.find(person => person.userId === item.createdBy)?.fullName || 'Official',
      visibility: item.visibility,
    }))
    const referrals = data.referrals.filter(item => item.reportId === report.reportId).map(item => ({
      kind: 'referral',
      text: `Referred to ${getInstitution(data, item.toInstitutionId)?.institutionName || 'supporting institution'} — ${item.reason}`,
      createdAt: item.referredAt,
      actor: data.users.find(person => person.userId === item.referredBy)?.fullName || 'Official',
    }))
    output.timeline = [...history, ...updates, ...referrals].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
  return output
}

async function readBody(request, maxBytes = 32_000) {
  const chunks = []
  let bytes = 0
  for await (const chunk of request) {
    bytes += chunk.length
    if (bytes > maxBytes) throw Object.assign(new Error('Request body is too large.'), { status: 413 })
    chunks.push(chunk)
  }
  if (!bytes) return {}
  const raw = Buffer.concat(chunks).toString('utf8')
  try { return JSON.parse(raw) }
  catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }) }
}

function validatePhoto(value) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw Object.assign(new Error('Photo must be a JPEG, PNG or WebP image.'), { status: 400 })
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!match || match[2].length % 4 !== 0) throw Object.assign(new Error('Photo must be a JPEG, PNG or WebP image.'), { status: 400 })
  const maxBytes = 10 * 1024 * 1024
  if (match[2].length > Math.ceil(maxBytes / 3) * 4) throw Object.assign(new Error('Photo must be 10 MB or smaller.'), { status: 400 })
  const image = Buffer.from(match[2], 'base64')
  if (!image.length || image.length > maxBytes || image.toString('base64') !== match[2]) {
    throw Object.assign(new Error('Photo must be a valid image of 10 MB or less.'), { status: 400 })
  }
  const jpeg = image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff
  const png = image.length >= 8 && image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const webp = image.length >= 12 && image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP'
  if (!({ jpeg, png, webp })[match[1]]) throw Object.assign(new Error('Photo content does not match its image type.'), { status: 400 })
  return value
}

function requireRole(user, roles) {
  if (!roles.includes(user.role)) throw Object.assign(new Error('You do not have permission to perform this action.'), { status: 403 })
}

function visibleReports(data, user) {
  return data.reports.filter(report => canAccessReport(data, user, report))
}

function addAudit(data, user, action, report, at) {
  data.audits.push({ auditId: randomUUID(), userId: user.userId, action, recordType: 'Report', recordId: report.reportId, createdAt: at })
}

function summaryFor(data, user) {
  const reports = visibleReports(data, user)
  const countBy = selector => {
    const counts = new Map()
    for (const report of reports) {
      const key = selector(report)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }
  const resolutionTimes = reports.flatMap(report => {
    const submitted = Date.parse(report.submittedAt)
    const firstResolved = data.history.filter(item => item.reportId === report.reportId && item.newStatus === 'Resolved')
      .map(item => Date.parse(item.changedAt)).filter(value => Number.isFinite(value) && value >= submitted).sort((a, b) => a - b)[0]
    return Number.isFinite(submitted) && Number.isFinite(firstResolved) ? [(firstResolved - submitted) / 3_600_000] : []
  })
  const cells = new Map()
  const typed = new Map()
  let unmapped = 0
  for (const report of reports) {
    const match = /^GPS:\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/.exec(report.location)
    if (match) {
      const latitude = Number(match[1])
      const longitude = Number(match[2])
      if (latitude < -35.5 || latitude > -22 || longitude < 16 || longitude > 33) { unmapped++; continue }
      const lat = (Math.floor(latitude * 10) + 0.5) / 10
      const lng = (Math.floor(longitude * 10) + 0.5) / 10
      const category = data.categories.find(item => item.categoryId === report.categoryId)?.categoryName || 'Other'
      const key = `${lat},${lng},${report.categoryId}`
      const cell = cells.get(key) || { latitude: lat, longitude: lng, category, count: 0 }
      cell.count++
      cells.set(key, cell)
    } else if (report.location.startsWith('GPS:')) {
      unmapped++
    } else {
      const category = data.categories.find(item => item.categoryId === report.categoryId)?.categoryName || 'Other'
      const key = JSON.stringify([report.location, category])
      const row = typed.get(key) || { name: report.location, category, count: 0 }
      row.count++
      typed.set(key, row)
    }
  }
  return {
    total: reports.length,
    pending: reports.filter(item => ['Submitted', 'Under review', 'Assigned', 'Referred', 'Awaiting information'].includes(item.currentStatus)).length,
    inProgress: reports.filter(item => item.currentStatus === 'In progress').length,
    resolved: reports.filter(item => ['Resolved', 'Closed'].includes(item.currentStatus)).length,
    byCategory: countBy(report => data.categories.find(item => item.categoryId === report.categoryId)?.categoryName || 'Other'),
    byInstitution: countBy(report => getInstitution(data, report.leadInstitutionId)?.institutionName || 'Unassigned'),
    averageResolutionHours: resolutionTimes.length ? resolutionTimes.reduce((sum, hours) => sum + hours, 0) / resolutionTimes.length : null,
    resolutionSampleSize: resolutionTimes.length,
    mapCells: [...cells.values()],
    typedLocations: [...typed.values()].sort((a, b) => b.count - a.count),
    unmapped,
  }
}

function validateString(value, name, maxLength) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw Object.assign(new Error(`${name} is required.`), { status: 400 })
  }
  if (value.trim().length > maxLength) {
    throw Object.assign(new Error(`${name} must be ${maxLength} characters or fewer.`), { status: 400 })
  }
  return value.trim()
}

export function createServer({ dataPath = null, assistant = createAssistant({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  key: process.env.AZURE_OPENAI_KEY,
  deployment: process.env.MODEL_DEPLOYMENT,
}), officialAssistant = createOfficialAssistant({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  key: process.env.AZURE_OPENAI_KEY,
  deployment: process.env.MODEL_DEPLOYMENT,
}), reportSuggester = createReportSuggester({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  key: process.env.AZURE_OPENAI_KEY,
  deployment: process.env.MODEL_DEPLOYMENT,
}), insights = createInsights({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  key: process.env.AZURE_OPENAI_KEY,
  deployment: process.env.MODEL_DEPLOYMENT,
}), translateUi = createUiTranslator({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  key: process.env.AZURE_OPENAI_KEY,
  deployment: process.env.MODEL_DEPLOYMENT,
  messages: JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'src', 'ui-messages.json'), 'utf8')),
}), clock = Date.now, reminderIntervalMs = 15_000, telegramToken = '', telegramAllowedUserIds = [], telegramFetch = fetch } = {}) {
  const resolvedDataPath = dataPath ? resolve(dataPath) : null
  const data = loadData(resolvedDataPath)
  const persist = () => saveData(resolvedDataPath, data)

  const createReport = (user, body) => {
    const title = validateString(body.title, 'Title', 200)
    const description = validateString(body.description, 'Description', 5000)
    const location = validateString(body.location, 'Location', 300)
    const categoryId = Number(body.categoryId)
    if (!Number.isInteger(categoryId) || !data.categories.some(item => item.categoryId === categoryId)) {
      throw Object.assign(new Error('Select a valid report category.'), { status: 400 })
    }
    const photo = validatePhoto(body.photo)
    const sequence = data.nextReference++
    const now = new Date(clock()).toISOString()
    const routedInstitutionId = categoryId === 2 ? 2 : categoryId === 3 ? 3 : categoryId === 4 ? 4 : 1
    const report = {
      reportId: randomUUID(), referenceNumber: `RB-${year}-${String(sequence).padStart(5, '0')}`,
      title, description, categoryId, location, photo, submittedBy: user.userId, submittedAt: now,
      currentStatus: 'Submitted', leadInstitutionId: routedInstitutionId,
    }
    data.reports.push(report)
    data.assignments.push({ assignmentId: randomUUID(), reportId: report.reportId, institutionId: routedInstitutionId, assignedOfficialId: null, responsibility: 'Initial category-based routing suggestion', assignedAt: now })
    data.history.push({ historyId: randomUUID(), reportId: report.reportId, previousStatus: null, newStatus: 'Submitted', changedBy: user.userId, reason: 'Report submitted', changedAt: now })
    data.notifications.push({ notificationId: randomUUID(), userId: user.userId, reportId: report.reportId, message: `Your report ${report.referenceNumber} was submitted.`, isRead: false, createdAt: now })
    addAudit(data, user, 'CreateReport', report, now)
    return report.referenceNumber
  }

  let telegramBot
  if (telegramToken && telegramAllowedUserIds.length && resolvedDataPath) {
    data.telegram ||= { offset: 0, drafts: {}, identities: {}, outbox: [] }
    telegramBot = createTelegramBot({
      token: telegramToken, allowedUserIds: telegramAllowedUserIds, state: data.telegram, categories: data.categories, persist, fetchImpl: telegramFetch,
      submit: (telegramId, draft) => {
        let user = data.users.find(item => item.userId === data.telegram.identities[telegramId])
        if (!user) {
          user = { userId: randomUUID(), role: 'Citizen', fullName: 'Telegram resident', institutionId: null }
          data.users.push(user)
          data.telegram.identities[telegramId] = user.userId
        }
        return createReport(user, draft)
      },
    })
  }

  const queueTelegramNotification = (userId, text) => {
    if (!data.telegram) return
    const identity = Object.entries(data.telegram.identities).find(([, citizenId]) => citizenId === userId)
    if (identity) data.telegram.outbox.push({ chatId: identity[0], text })
  }

  const notifyOverdueReports = () => {
    const now = clock()
    const markedReports = []
    const originalNotificationCount = data.notifications.length
    const originalOutboxCount = data.telegram?.outbox.length
    for (const report of data.reports) {
      if (report.currentStatus !== 'Submitted' ||
          !Number.isFinite(Date.parse(report.submittedAt)) || now - Date.parse(report.submittedAt) < 30 * 60_000 ||
          data.history.some(item => item.reportId === report.reportId && item.previousStatus !== null)) continue
      const assigned = data.assignments.filter(item => item.reportId === report.reportId &&
        item.institutionId === report.leadInstitutionId && item.assignmentStatus !== 'Completed' && item.assignedOfficialId)
      const assignedOfficials = data.users.filter(user => user.role === 'Official' && user.institutionId === report.leadInstitutionId && assigned.some(item => item.assignedOfficialId === user.userId))
      const officials = assignedOfficials.length ? assignedOfficials : data.users.filter(user => user.role === 'Official' && user.institutionId === report.leadInstitutionId)
      const createdAt = new Date(now).toISOString()
      if (!report.initialStatusReminderAt) {
        for (const official of officials) {
          data.notifications.push({ notificationId: randomUUID(), userId: official.userId, reportId: report.reportId, message: `Report ${report.referenceNumber} has not had a status update in 30 minutes. Please check it.`, isRead: false, createdAt })
        }
        const message = `The department is experiencing a backlog. Your report ${report.referenceNumber} will be attended to shortly.`
        data.notifications.push({ notificationId: randomUUID(), userId: report.submittedBy, reportId: report.reportId, message, isRead: false, createdAt })
        queueTelegramNotification(report.submittedBy, message)
        report.initialStatusReminderAt = createdAt
        markedReports.push([report, 'initialStatusReminderAt'])
      }
      if (!report.initialStatusEscalatedAt && now - Date.parse(report.submittedAt) >= 60 * 60_000) {
        const departmentManagers = data.users.filter(user => user.role === 'Manager' && user.institutionId === report.leadInstitutionId)
        const managers = departmentManagers.length ? departmentManagers : data.users.filter(user => user.role === 'Manager')
        if (!managers.length) {
          console.error(`Unable to escalate report ${report.referenceNumber}: no manager is configured.`)
          continue
        }
        const department = getInstitution(data, report.leadInstitutionId)?.institutionName || 'Unassigned'
        const responsible = assignedOfficials.map(official => official.fullName).join(', ') || 'Unassigned'
        const message = `Escalated: report ${report.referenceNumber} has had no status update for one hour. Title: ${report.title}. Department: ${department}. Officer responsible: ${responsible}.`
        for (const manager of managers) {
          data.notifications.push({ notificationId: randomUUID(), userId: manager.userId, reportId: report.reportId, message, isRead: false, createdAt })
        }
        for (const official of officials) {
          data.notifications.push({ notificationId: randomUUID(), userId: official.userId, reportId: report.reportId, message: `Report ${report.referenceNumber} has been escalated to a manager because its status has not been updated in one hour.`, isRead: false, createdAt })
        }
        report.initialStatusEscalatedAt = createdAt
        markedReports.push([report, 'initialStatusEscalatedAt'])
      }
    }
    if (markedReports.length) {
      try { persist() }
      catch (error) {
        data.notifications.length = originalNotificationCount
        if (data.telegram) data.telegram.outbox.length = originalOutboxCount
        for (const [report, field] of markedReports) delete report[field]
        throw error
      }
    }
  }

  const server = createHttpServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost')
    if (!url.pathname.startsWith('/api/')) return send(response, 404, { error: 'Route not found.' })

    try {
      const user = getUser(data, request)
      if (!user) return send(response, 401, { error: 'Choose a demo account to continue.' })
      const method = request.method || 'GET'
      if (method === 'POST' && /^\/api\/cases\/[^/]+\/status$/.test(url.pathname)) notifyOverdueReports()

      if (method === 'GET' && url.pathname === '/api/ui-translations') {
        const language = validateInterfaceLanguage(url.searchParams.get('language'))
        try {
          return send(response, 200, await translateUi(language))
        } catch (error) {
          if (error?.status === 502 || error?.status === 503) error.expose = true
          throw error
        }
      }
      if (method === 'POST' && url.pathname === '/api/assistant') {
        requireRole(user, ['Citizen'])
        const body = await readBody(request)
        const messages = validateChatMessages(body.messages)
        const language = validateInterfaceLanguage(body.language ?? 'en')
        let draft
        try { draft = validateReportDraft(body.report, data.categories) }
        catch (error) { throw Object.assign(error, { status: 400 }) }
        try {
          return send(response, 200, await assistant(messages, draft, data.categories, language))
        } catch (error) {
          if (error?.status === 502 || error?.status === 503) error.expose = true
          throw error
        }
      }
      if (method === 'POST' && url.pathname === '/api/official-assistant') {
        requireRole(user, ['Official'])
        const body = await readBody(request)
        const messages = validateChatMessages(body.messages)
        const language = validateInterfaceLanguage(body.language ?? 'en')
        try {
          return send(response, 200, await officialAssistant(messages, language))
        } catch (error) {
          if (error?.status === 502 || error?.status === 503) error.expose = true
          throw error
        }
      }
      if (method === 'POST' && url.pathname === '/api/report-suggestions') {
        requireRole(user, ['Citizen'])
        const input = validateSuggestionInput(await readBody(request))
        try {
          return send(response, 200, await reportSuggester(input, data.categories))
        } catch (error) {
          if (error?.status === 502 || error?.status === 503) error.expose = true
          throw error
        }
      }
      if (method === 'GET' && url.pathname === '/api/me') {
        return send(response, 200, { ...user, institutionName: getInstitution(data, user.institutionId)?.institutionName || null })
      }
      if (method === 'GET' && url.pathname === '/api/categories') {
        return send(response, 200, data.categories)
      }
      if (method === 'GET' && url.pathname === '/api/notifications') {
        notifyOverdueReports()
        return send(response, 200, data.notifications.filter(item => item.userId === user.userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      }
      if (method === 'GET' && url.pathname === '/api/reports/mine') {
        requireRole(user, ['Citizen'])
        return send(response, 200, data.reports.filter(item => item.submittedBy === user.userId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map(item => publicReport(data, item, user)))
      }
      if (method === 'POST' && url.pathname === '/api/reports') {
        requireRole(user, ['Citizen'])
        const body = await readBody(request, Math.ceil(10 * 1024 * 1024 / 3) * 4 + 32_000)
        const referenceNumber = createReport(user, body)
        persist()
        return send(response, 201, { referenceNumber })
      }
      if (method === 'GET' && url.pathname === '/api/cases') {
        requireRole(user, ['Official', 'Manager'])
        return send(response, 200, visibleReports(data, user).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map(item => publicReport(data, item, user)))
      }
      if (method === 'GET' && url.pathname === '/api/dashboard/summary') {
        requireRole(user, ['Manager'])
        return send(response, 200, summaryFor(data, user))
      }
      if (method === 'POST' && url.pathname === '/api/dashboard/insights') {
        requireRole(user, ['Manager'])
        const body = await readBody(request)
        const language = validateInterfaceLanguage(body.language ?? 'en')
        const summary = summaryFor(data, user)
        const aggregate = {
          total: summary.total, pending: summary.pending, inProgress: summary.inProgress, resolved: summary.resolved,
          byCategory: summary.byCategory, byInstitution: summary.byInstitution,
          averageResolutionHours: summary.averageResolutionHours, resolutionSampleSize: summary.resolutionSampleSize,
        }
        try { return send(response, 200, await insights('dashboard', aggregate, language)) }
        catch (error) { if (error?.status === 502 || error?.status === 503) error.expose = true; throw error }
      }

      const insightsMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/insights$/)
      if (method === 'POST' && insightsMatch) {
        requireRole(user, ['Official', 'Manager'])
        const report = getReport(data, decodeURIComponent(insightsMatch[1]))
        if (!report || !canAccessReport(data, user, report)) return send(response, 404, { error: 'Report not found.' })
        const input = validateCaseInsightInput(await readBody(request))
        const category = data.categories.find(item => item.categoryId === report.categoryId)?.categoryName || 'Other'
        try { return send(response, 200, await insights('case', { category, reviewedText: input.reviewedText, uncertainPhotoLabels: input.photoLabels }, input.language)) }
        catch (error) { if (error?.status === 502 || error?.status === 503) error.expose = true; throw error }
      }

      const reportMatch = url.pathname.match(/^\/api\/reports\/([^/]+)$/)
      if (method === 'GET' && reportMatch) {
        const report = getReport(data, decodeURIComponent(reportMatch[1]))
        if (!report || !canAccessReport(data, user, report)) return send(response, 404, { error: 'Report not found.' })
        return send(response, 200, publicReport(data, report, user, true))
      }

      const feedbackMatch = url.pathname.match(/^\/api\/reports\/([^/]+)\/feedback$/)
      if (method === 'POST' && feedbackMatch) {
        requireRole(user, ['Citizen'])
        const report = getReport(data, decodeURIComponent(feedbackMatch[1]))
        if (!report || report.submittedBy !== user.userId) return send(response, 404, { error: 'Report not found.' })
        if (report.currentStatus !== 'Resolved') throw Object.assign(new Error('Feedback is available after a report is marked resolved.'), { status: 409 })
        const body = await readBody(request)
        if (typeof body.resolutionConfirmed !== 'boolean') throw Object.assign(new Error('Choose whether the issue has been resolved.'), { status: 400 })
        if (currentResolutionConfirmed(data, report)) throw Object.assign(new Error('Resolution has already been confirmed for this report.'), { status: 409 })
        const feedbackText = typeof body.feedbackText === 'string' ? body.feedbackText.trim().slice(0, 2000) : ''
        const resolutionHistoryId = data.history.findLast(item => item.reportId === report.reportId && item.newStatus === 'Resolved')?.historyId || null
        data.feedback.push({ feedbackId: randomUUID(), reportId: report.reportId, submittedBy: user.userId, feedbackText, resolutionConfirmed: body.resolutionConfirmed, resolutionHistoryId, submittedAt: new Date(clock()).toISOString() })
        persist()
        return send(response, 201, { saved: true })
      }

      const actionMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/(assign|refer|updates|status)$/)
      if (method === 'POST' && actionMatch) {
        requireRole(user, ['Official', 'Manager'])
        const report = getReport(data, decodeURIComponent(actionMatch[1]))
        if (!report || !canAccessReport(data, user, report)) return send(response, 404, { error: 'Report not found.' })
        const body = await readBody(request)
        const action = actionMatch[2]
        const now = new Date(clock()).toISOString()
        if (action === 'assign') {
          const institutionId = Number(body.institutionId ?? user.institutionId)
          if (!Number.isInteger(institutionId) || !getInstitution(data, institutionId)) throw Object.assign(new Error('Select a valid institution.'), { status: 400 })
          if (institutionId !== user.institutionId) throw Object.assign(new Error('You can only assign work within your own institution.'), { status: 403 })
          if (user.role === 'Manager') report.leadInstitutionId = institutionId
          const assignedOfficialId = body.assignedOfficialId || user.userId
          const assignee = data.users.find(item => item.userId === assignedOfficialId && item.role === 'Official' && item.institutionId === institutionId)
          if (!assignee) throw Object.assign(new Error('The assignee must be an official in the selected institution.'), { status: 400 })
          const existingAssignment = data.assignments.find(item => item.reportId === report.reportId && item.institutionId === institutionId && item.assignmentStatus !== 'Completed')
          if (existingAssignment) {
            existingAssignment.assignedOfficialId = assignedOfficialId
            existingAssignment.responsibility = typeof body.responsibility === 'string' ? body.responsibility.trim().slice(0, 500) : existingAssignment.responsibility
          } else {
            data.assignments.push({ assignmentId: randomUUID(), reportId: report.reportId, institutionId, assignedOfficialId, responsibility: typeof body.responsibility === 'string' ? body.responsibility.trim().slice(0, 500) : null, assignedAt: now })
          }
          data.notifications.push({ notificationId: randomUUID(), userId: assignedOfficialId, reportId: report.reportId, message: `Case ${report.referenceNumber} was assigned to you.`, isRead: false, createdAt: now })
          addAudit(data, user, 'AssignCase', report, now)
        } else if (action === 'refer') {
          const institutionId = Number(body.institutionId)
          if (!Number.isInteger(institutionId) || !getInstitution(data, institutionId)) throw Object.assign(new Error('Select a valid supporting institution.'), { status: 400 })
          if (institutionId === report.leadInstitutionId) throw Object.assign(new Error('A case cannot be referred to its current lead institution.'), { status: 400 })
          const reason = validateString(body.reason, 'Referral reason', 1000)
          const duplicate = data.referrals.some(item => item.reportId === report.reportId && item.toInstitutionId === institutionId && item.status !== 'Declined')
          if (duplicate) throw Object.assign(new Error('This institution is already participating in the case.'), { status: 409 })
          data.referrals.push({ referralId: randomUUID(), reportId: report.reportId, fromInstitutionId: report.leadInstitutionId || user.institutionId, toInstitutionId: institutionId, reason, referredBy: user.userId, referredAt: now, status: 'Pending' })
          data.notifications.push({ notificationId: randomUUID(), userId: report.submittedBy, reportId: report.reportId, message: `Your report ${report.referenceNumber} is being coordinated with a supporting institution.`, isRead: false, createdAt: now })
          addAudit(data, user, 'ReferCase', report, now)
        } else if (action === 'updates') {
          const text = validateString(body.text, 'Update', 2000)
          if (!['Citizen', 'Internal'].includes(body.visibility)) throw Object.assign(new Error('Choose a valid update visibility.'), { status: 400 })
          data.updates.push({ updateId: randomUUID(), reportId: report.reportId, createdBy: user.userId, institutionId: user.institutionId, text, visibility: body.visibility, createdAt: now })
          data.notifications.push({ notificationId: randomUUID(), userId: report.submittedBy, reportId: report.reportId, message: `There is a new update on report ${report.referenceNumber}.`, isRead: false, createdAt: now })
          addAudit(data, user, 'AddCaseUpdate', report, now)
        } else {
          if (user.institutionId !== report.leadInstitutionId) throw Object.assign(new Error('Only the lead institution can change the overall case status.'), { status: 403 })
          const nextStatus = body.status
          if (!statuses.includes(nextStatus)) throw Object.assign(new Error('Choose a valid case status.'), { status: 400 })
          if (!transitions[report.currentStatus].includes(nextStatus)) throw Object.assign(new Error(`A case cannot move from ${report.currentStatus} to ${nextStatus}.`), { status: 409 })
          const previousStatus = report.currentStatus
          const originalOutboxCount = data.telegram?.outbox.length
          report.currentStatus = nextStatus
          data.history.push({ historyId: randomUUID(), reportId: report.reportId, previousStatus, newStatus: nextStatus, changedBy: user.userId, reason: '', changedAt: now })
          data.notifications.push({ notificationId: randomUUID(), userId: report.submittedBy, reportId: report.reportId, message: `Your report status changed to ${nextStatus}.`, isRead: false, createdAt: now })
          queueTelegramNotification(report.submittedBy, `Your report ${report.referenceNumber} status changed to ${nextStatus}.`)
          addAudit(data, user, 'ChangeCaseStatus', report, now)
          try { persist() }
          catch (error) {
            report.currentStatus = previousStatus
            data.history.pop()
            data.notifications.pop()
            data.audits.pop()
            if (data.telegram) data.telegram.outbox.length = originalOutboxCount
            throw error
          }
          return send(response, 200, { updated: true })
        }
        persist()
        return send(response, 200, { updated: true })
      }

      return send(response, 404, { error: 'Route not found.' })
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 500
      if (status >= 500) console.error(error)
      return send(response, status, { error: status >= 500 && !error.expose ? 'The request could not be completed.' : error.message })
    }
  })
  let reminderTimer
  server.on('listening', () => {
    telegramBot?.start()
    const scanReminders = () => {
      try { notifyOverdueReports() }
      catch (error) { console.error('Unable to persist overdue report notifications; the scan will retry.', error) }
    }
    scanReminders()
    reminderTimer = setInterval(scanReminders, reminderIntervalMs)
    reminderTimer.unref()
  })
  server.on('close', () => { clearInterval(reminderTimer); telegramBot?.stop() })
  return server
}

const localDataPath = resolve(dirname(fileURLToPath(import.meta.url)), 'data', 'demo.json')
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const envResult = loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env'), quiet: true })
  if (envResult.error && envResult.error.code !== 'ENOENT') throw envResult.error
  const telegramAllowedUserIds = (process.env.TELEGRAM_ALLOWED_USER_IDS || '').split(',').map(value => value.trim()).filter(Boolean)
  if (telegramAllowedUserIds.some(id => !/^\d+$/.test(id))) throw new Error('TELEGRAM_ALLOWED_USER_IDS must contain comma-separated numeric Telegram user IDs.')
  if (process.env.TELEGRAM_BOT_TOKEN && !telegramAllowedUserIds.length) console.log('Telegram bot is disabled: set TELEGRAM_ALLOWED_USER_IDS to approved numeric user IDs.')
  const server = createServer({ dataPath: process.env.DEMO_DATA_PATH || localDataPath, telegramToken: process.env.TELEGRAM_BOT_TOKEN, telegramAllowedUserIds })
  server.listen(3001, '127.0.0.1', () => {
    console.log('ReaBona local demo API listening on http://127.0.0.1:3001')
    console.log('Demo mode only: x-demo-user is not production authentication.')
  })
}
