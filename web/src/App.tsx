import { LanguagePicker } from './i18n'
import { useI18n } from './i18n-context'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import logo from '../../docs/ReaBona_Civic_Action_Logo_transparent.svg'
import { Assistant, type ChatMessage, type ReportDraft } from './Assistant'
import { OfficialAssistant } from './OfficialAssistant'
import { ReportForm } from './ReportForm'
import { CaseInsights, ManagerInsights } from './AIInsights'
import { emptyPhoto, readPhoto, type PhotoSelection } from './photo'
import { idleVoice, type VoiceStatus } from './voice'
import './App.css'

const ManagerHeatmap = lazy(() => import('./ManagerHeatmap').then(module => ({ default: module.ManagerHeatmap })))

type Role = 'Citizen' | 'Official' | 'Manager' | 'Administrator'
type User = { userId: string; fullName: string; email: string; role: Role; institutionId: number | null; institutionName: string | null }
type CaseStatus = 'Submitted' | 'Under review' | 'Assigned' | 'Referred' | 'In progress' | 'Awaiting information' | 'Resolved' | 'Closed'
type Category = { categoryId: number; categoryName: string }
type TimelineEntry = { kind: 'status' | 'update' | 'referral'; text: string; createdAt: string; actor: string; visibility?: string }
type Report = {
  reportId: string
  referenceNumber: string
  title: string
  description: string
  category: string
  location: string
  submittedAt: string
  currentStatus: CaseStatus
  resolutionConfirmed?: boolean
  leadInstitution: string | null
  leadInstitutionId?: number | null
  allowedNextStatuses?: CaseStatus[]
  latestCitizenUpdate?: string | null
  submittedBy?: string
  citizenVisibleUpdates?: string[]
  timeline?: TimelineEntry[]
  institutions?: string[]
  photo?: string | null
}
type Dashboard = { total: number; pending: number; inProgress: number; resolved: number; byCategory: { name: string; count: number }[]; byInstitution: { name: string; count: number }[]; averageResolutionHours: number | null; resolutionSampleSize: number; mapCells: { latitude: number; longitude: number; category: string; count: number }[]; typedLocations: { name: string; category: string; count: number }[]; unmapped: number }
type Notification = { notificationId: string; message: string; isRead: boolean; createdAt: string }

const demoAccounts = [
  { id: 'citizen', label: 'Citizen · A resident' },
  { id: 'municipal-official', label: 'Official · Demo Municipality' },
  { id: 'education-official', label: 'Official · Demo Education' },
  { id: 'manager', label: 'Manager · Demo Municipality' },
]

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('X-Demo-User', localStorage.getItem('reabona-demo-user') || 'citizen')
  const response = await fetch(`/api${path}`, { ...init, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    if (body?.error) throw new Error(body.error)
    if (response.status === 502) {
      throw new Error('The local API is unavailable. Restart the app with npm run dev from the web folder.')
    }
    throw new Error(body?.error || `Request failed (${response.status})`)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function StatusPill({ status }: { status: CaseStatus }) {
  const { t } = useI18n()
  return <span className={`status-pill status-${status.toLowerCase().replaceAll(' ', '-')}`}>{t(status)}</span>
}

function App() {
  const { t, language } = useI18n()
  const [user, setUser] = useState<User | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [selected, setSelected] = useState<Report | null>(null)
  const [page, setPage] = useState<'home' | 'report' | 'cases' | 'dashboard' | 'assistant'>('home')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [photo, setPhoto] = useState<PhotoSelection>(emptyPhoto)
  const [description, setDescription] = useState('')
  const [reportLocation, setReportLocation] = useState('')
  const [reportSession, setReportSession] = useState(0)
  const [voice, setVoice] = useState<VoiceStatus>(idleVoice)
  const [voiceLanguage, setVoiceLanguage] = useState('en')
  const isStaff = user?.role === 'Official' || user?.role === 'Manager'

  const loadPageData = useCallback(async (currentUser: User) => {
    try {
      setError('')
      if (currentUser.role === 'Citizen') {
        setReports(await api<Report[]>('/reports/mine'))
      } else if (currentUser.role === 'Official') {
        setReports(await api<Report[]>('/cases'))
      } else if (currentUser.role === 'Manager') {
        const [summary, cases] = await Promise.all([api<Dashboard>('/dashboard/summary'), api<Report[]>('/cases')])
        setDashboard(summary)
        setReports(cases)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load the application data.')
    }
  }, [])

  const loadIdentity = useCallback(async () => {
    try {
      const [currentUser, availableCategories] = await Promise.all([
        api<User>('/me'),
        api<Category[]>('/categories'),
      ])
      setUser(currentUser)
      setCategories(availableCategories)
      const [inbox] = await Promise.all([
        api<Notification[]>('/notifications'),
        loadPageData(currentUser),
      ])
      setNotifications(inbox)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to connect to the demo API.')
    }
  }, [loadPageData])

  // oxlint-disable-next-line react/set-state-in-effect -- fetch the signed-in demo identity on mount.
  useEffect(() => { void loadIdentity() }, [loadIdentity])

  useEffect(() => {
    if (!user) return
    const account = localStorage.getItem('reabona-demo-user') || 'citizen'
    let active = true
    const timer = setInterval(() => {
      void api<Notification[]>('/notifications').then(inbox => {
        if (active && (localStorage.getItem('reabona-demo-user') || 'citizen') === account) setNotifications(inbox)
      }).catch(() => {
        if (active) setError('Notifications could not be refreshed.')
      })
    }, 15_000)
    return () => { active = false; clearInterval(timer) }
  }, [user])

  const refresh = async () => {
    if (user) await loadPageData(user)
    setNotifications(await api<Notification[]>('/notifications'))
    if (selected) {
      try { setSelected(await api<Report>(`/reports/${encodeURIComponent(selected.referenceNumber)}`)) }
      catch { setSelected(null) }
    }
  }

  const changeAccount = async (id: string) => {
    localStorage.setItem('reabona-demo-user', id)
    setUser(null)
    setSelected(null)
    setPage('home')
    setNotice('')
    setError('')
    setPhoto(emptyPhoto)
    setDescription('')
    setReportLocation('')
    setVoice(idleVoice)
    await loadIdentity()
  }

  const openReport = async (report: Report) => {
    try {
      setError('')
      setSelected(await api<Report>(`/reports/${encodeURIComponent(report.referenceNumber)}`))
      setPage('cases')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to open the report.')
    }
  }

  const handleCreateReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (photo.error || !photo.ready || voice.active) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const payload = {
      title: String(form.get('title') || '').trim(),
      categoryId: Number(form.get('categoryId')),
      description: String(form.get('description') || '').trim(),
      location: reportLocation.trim(),
    }
    setBusy(true)
    setError('')
    try {
      const result = await api<{ referenceNumber: string }>('/reports', { method: 'POST', body: JSON.stringify({ ...payload, photo: await readPhoto(photo.file) }) })
      setNotice(`Report submitted. Your reference number is ${result.referenceNumber}.`)
      setPage('home')
      setPhoto(emptyPhoto)
      setDescription('')
      setReportLocation('')
      formElement.reset()
      void refresh().catch(() => setError('The report was submitted, but the report list could not be refreshed.'))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The report could not be submitted.')
    } finally {
      setBusy(false)
    }
  }

  const mutateCase = async (action: string, payload: Record<string, unknown>) => {
    if (!selected) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api(`/cases/${encodeURIComponent(selected.referenceNumber)}/${action}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setNotice('Case updated successfully.')
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The case could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  const caseCountLabel = `${reports.length} ${t(reports.length === 1 ? 'report' : 'reports')}`

  const startReport = (categoryId = '') => {
    setSelectedCategoryId(categoryId)
    setReportSession(value => value + 1)
    setPhoto(emptyPhoto)
    setDescription('')
    setReportLocation('')
    setSelected(null)
    setPage('report')
  }

  if (!user) return <main className="loading-screen"><LanguagePicker /><img className="loading-logo" src={logo} alt={t("ReaBona")} />{error ? <><p>{t(error)}</p><button className="button button-outline" onClick={() => { setError(''); void loadIdentity() }}>{t("Retry")}</button></> : <p>{t("Loading ReaBona…")}</p>}</main>

  return (
    <div className="app-shell">
      <div className="demo-banner">
        <span><strong>{t("DEMO ENVIRONMENT")}</strong> {t("· Fictional accounts and case data · Not for production use")}</span>
        <LanguagePicker />
        <label className="account-picker">{t("Preview as")}
          <select aria-label={t("Choose demo account")} value={localStorage.getItem('reabona-demo-user') || 'citizen'} onChange={event => void changeAccount(event.target.value)}>
            {demoAccounts.map(account => <option value={account.id} key={account.id}>{t(account.label)}</option>)}
          </select>
        </label>
      </div>
      <header className="topbar">
        <button className="brand" onClick={() => { setPage('home'); setSelected(null) }} aria-label={t("ReaBona home")}>
          <img src={logo} alt="" />
        </button>
        <nav className="main-nav" aria-label={t("Main navigation")}>
          {(user.role === 'Citizen' || user.role === 'Official') && <button className={page === 'assistant' ? 'nav-active' : ''} aria-current={page === 'assistant' ? 'page' : undefined} onClick={() => { setPage('assistant'); setSelected(null) }}>{t("Ask ReaBona")}</button>}
          <button className={page === 'home' || page === 'cases' ? 'nav-active' : ''} onClick={() => { setPage('home'); setSelected(null) }}>{t(user?.role === 'Citizen' ? 'My reports' : 'Case overview')}</button>
          {user?.role === 'Citizen' && <button className={page === 'report' ? 'nav-active' : ''} onClick={() => startReport()}>{t("Report an issue")}</button>}
          {user?.role === 'Manager' && <button className={page === 'dashboard' ? 'nav-active' : ''} onClick={() => setPage('dashboard')}>{t("Insights")}</button>}
        </nav>
        <NotificationMenu notifications={notifications} />
        <div className="user-chip"><span className="avatar">{user?.fullName.charAt(0) || 'R'}</span><span><b>{user?.fullName}</b><small>{t(user.role)}{user?.institutionName ? ` · ${user.institutionName}` : ''}</small></span></div>
      </header>

      <main className={page === 'assistant' ? 'assistant-page-wrap' : 'page-wrap'}>
        {error && <div className="alert alert-error" role="alert"><span>{t(error)}</span><button onClick={() => setError('')} aria-label={t("Dismiss error")}>×</button></div>}
        {notice && <div className="alert alert-success" role="status"><span>{t(notice)}</span><button onClick={() => setNotice('')} aria-label={t("Dismiss message")}>×</button></div>}

        {user.role === 'Citizen' && <div hidden={page !== 'assistant'}><Assistant key={user.userId} active={page === 'assistant'} name={user.fullName.split(' ')[0]} categories={categories} voiceLanguage={voiceLanguage} onVoiceLanguageChange={setVoiceLanguage} sendMessage={async (messages: ChatMessage[], report: ReportDraft | null) =>
          api<{ reply: string; report: ReportDraft | null }>('/assistant', { method: 'POST', body: JSON.stringify({ messages, report, language }) })
        } submitReport={async (report: ReportDraft, photoFile: File | null) => {
          const result = await api<{ referenceNumber: string }>('/reports', { method: 'POST', body: JSON.stringify({ ...report, photo: await readPhoto(photoFile) }) })
          if ((localStorage.getItem('reabona-demo-user') || 'citizen') === 'citizen') {
            void refresh().catch(() => setError('The report was submitted, but the report list could not be refreshed.'))
          }
          return result.referenceNumber
        }} /></div>}
        {user.role === 'Official' && <div hidden={page !== 'assistant'}><OfficialAssistant key={user.userId} name={user.fullName.split(' ')[0]} reports={reports} loadPhoto={async reference => (await api<Report>(`/reports/${encodeURIComponent(reference)}`)).photo || null} sendMessage={messages =>
          api<{ reply: string }>('/official-assistant', { method: 'POST', body: JSON.stringify({ messages, language }) })
        } /></div>}

        {page === 'report' && user?.role === 'Citizen' && (
          <section className="form-page">
            <button className="back-link" onClick={() => setPage('home')}>{t("← Back to my reports")}</button>
            <div className="page-heading"><p className="eyebrow">{t("CITIZEN REPORTING")}</p><h1>{t("Tell us what’s happening.")}</h1><p>{t("Your report will be shared with the responsible public institution. You can follow every update here.")}</p></div>
            <ReportForm key={reportSession} categories={categories} initialCategoryId={selectedCategoryId}
              photo={photo} onPhotoChange={setPhoto} description={description} onDescriptionChange={setDescription}
              location={reportLocation} onLocationChange={setReportLocation} voice={voice} onVoiceStatus={setVoice}
              voiceLanguage={voiceLanguage} onVoiceLanguageChange={setVoiceLanguage} busy={busy}
              onSubmit={event => void handleCreateReport(event)}
              suggest={(input, signal) => api('/report-suggestions', { method: 'POST', body: JSON.stringify(input), signal })} />
          </section>
        )}

        {page === 'home' && user?.role === 'Citizen' && (
          <>
            <section className="welcome-panel">
              <div className="welcome-copy"><p className="eyebrow">{t("YOUR COMMUNITY. YOUR VOICE.")}</p><h1>{t("Together, we can make")}<br />{t("our communities better.")}</h1><p>{t("Report a service issue, follow its progress and help turn concerns into action.")}</p><button className="button button-light" onClick={() => startReport()}>{t("＋ Report an issue")} <span aria-hidden="true">→</span></button></div>
              <div className="welcome-identity"><img src={logo} alt="" /><span>{t("ONE REPORT. SHARED RESPONSIBILITY.")}</span></div>
            </section>
            <section className="services-section" aria-labelledby="services-heading">
              <div className="section-title"><div><p className="eyebrow">{t("HOW CAN WE HELP?")}</p><h2 id="services-heading">{t("Report a service issue")}</h2><p className="subtle">{t("Choose a category to get started.")}</p></div></div>
              <div className="services-grid">
                {([
                  { name: 'Water and sanitation', label: 'Water', icon: 'water' },
                  { name: 'Roads and infrastructure', label: 'Roads', icon: 'roads' },
                  { name: 'Electricity', label: 'Electricity', icon: 'power' },
                  { name: 'Waste management', label: 'Waste', icon: 'waste' },
                ] as const).map(service => {
                  const category = categories.find(item => item.categoryName === service.name)
                  return category && <button key={service.icon} className={`service-card service-${service.icon}`} onClick={() => startReport(String(category.categoryId))}>
                    <span className="service-icon"><ServiceIcon kind={service.icon} /></span><span><b>{t(service.label)}</b><small>{t("Report an issue")}</small></span><span className="service-arrow" aria-hidden="true">→</span>
                  </button>
                })}
              </div>
            </section>
            <div className="section-title"><div><p className="eyebrow">{t("YOUR ACTIVITY")}</p><h2>{t("My reports")} <span className="count-badge">{reports.length}</span></h2></div><button className="button button-outline" onClick={() => startReport()}>{t("＋ New report")}</button></div>
            <ReportsTable reports={reports} onOpen={report => void openReport(report)} emptyTitle="No reports yet" emptyText="When you submit a report, you’ll find its progress here." />
          </>
        )}

        {page === 'home' && isStaff && (
          <>
            <section className="staff-welcome"><div><p className="eyebrow">{t("CASE MANAGEMENT")}</p><h1>{t(user?.role === 'Manager' ? 'Good morning, ' : 'Welcome, ')}{user?.fullName.split(' ')[0]}.</h1><p>{t("Coordinate action and keep every update visible to the community.")}</p></div><div className="staff-welcome-icon" aria-hidden="true">↗</div></section>
            {user?.role === 'Official' && <div className="metric-row"><Metric label="Assigned to your institution" value={reports.length} tone="violet" /><Metric label="Awaiting review" value={reports.filter(report => ['Submitted', 'Under review'].includes(report.currentStatus)).length} tone="amber" /><Metric label="In progress" value={reports.filter(report => report.currentStatus === 'In progress').length} tone="blue" /><Metric label="Resolved" value={reports.filter(report => report.currentStatus === 'Resolved').length} tone="green" /></div>}
            <div className="section-title"><div><p className="eyebrow">{user?.institutionName?.toUpperCase()}</p><h2>{t("Cases requiring attention")}</h2><p className="subtle">{caseCountLabel} {t("visible to your account")}</p></div><button className="button button-outline" onClick={() => void refresh()}>{t("↻ Refresh")}</button></div>
            <ReportsTable reports={reports} onOpen={report => void openReport(report)} emptyTitle="No cases in your queue" emptyText="Cases assigned or referred to your institution will appear here." />
          </>
        )}

        {page === 'dashboard' && user?.role === 'Manager' && (
          <ManagerDashboard dashboard={dashboard} reports={reports} onOpen={report => void openReport(report)} />
        )}

        {page === 'cases' && selected && (
          <CaseDetails key={selected.reportId} report={selected} user={user} busy={busy} onBack={() => setPage('home')} onMutate={mutateCase} onFeedback={async (confirmed, text) => {
            setBusy(true)
            try { await api(`/reports/${encodeURIComponent(selected.referenceNumber)}/feedback`, { method: 'POST', body: JSON.stringify({ resolutionConfirmed: confirmed, feedbackText: text }) }); if (confirmed) setSelected(current => current ? { ...current, resolutionConfirmed: true } : current); setNotice('Thank you. Your feedback has been recorded.'); await refresh() }
            catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Feedback could not be saved.') }
            finally { setBusy(false) }
          }} />
        )}
      </main>
      <footer className="footer"><span>{t("ReaBona")} <b>·</b> {t("Turning public concerns into public action")}</span><span>{t("Prototype · Demonstration data only")}</span></footer>
    </div>
  )
}

function ServiceIcon({ kind }: { kind: 'water' | 'roads' | 'power' | 'waste' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'water' && <path d="M12 3C10 6 6 10 6 14a6 6 0 0 0 12 0c0-4-4-8-6-11Zm-3 12a3 3 0 0 0 3 3" />}
    {kind === 'roads' && <><path d="M8 3 4 21M16 3l4 18M12 3v3m0 4v3m0 4v4" /></>}
    {kind === 'power' && <path d="m13 2-8 12h6l-1 8 9-12h-6z" />}
    {kind === 'waste' && <><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 3v7m4-7v7" /></>}
  </svg>
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  const { t } = useI18n()
  return <article className={`metric-card metric-${tone}`}><span className="metric-icon">{tone === 'green' ? '✓' : tone === 'amber' ? '◷' : tone === 'blue' ? '↗' : '▤'}</span><div><strong>{value}</strong><span>{t(label)}</span></div></article>
}

function NotificationMenu({ notifications }: { notifications: Notification[] }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const unreadCount = notifications.filter(notification => !notification.isRead).length
  return <div className="notification-menu">
    <button className="notification-button" aria-label={`${t('Notifications')}, ${unreadCount} ${t('unread')}`} aria-expanded={open} onClick={() => setOpen(value => !value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{unreadCount > 0 && <span>{unreadCount}</span>}</button>
    {open && <div className="notification-popover"><div className="notification-heading"><b>{t("Notifications")}</b><small>{unreadCount} {t("unread")}</small></div>
      {notifications.length ? notifications.map(notification => <div className={`notification-item ${notification.isRead ? '' : 'notification-unread'}`} key={notification.notificationId}><span className="notification-dot" /><div><p>{notification.message}</p><small>{formatDate(notification.createdAt)}</small></div></div>) : <p className="notification-empty">{t("You’re all caught up.")}</p>}
    </div>}
  </div>
}

function ReportsTable({ reports, onOpen, emptyTitle, emptyText }: { reports: Report[]; onOpen: (report: Report) => void; emptyTitle: string; emptyText: string }) {
  const { t } = useI18n()
  if (reports.length === 0) return <div className="panel empty-state"><span className="empty-icon">◎</span><h3>{t(emptyTitle)}</h3><p>{t(emptyText)}</p></div>
  return <div className="panel table-panel"><table><thead><tr><th>{t("Report")}</th><th>{t("Category")}</th><th>{t("Location")}</th><th>{t("Submitted")}</th><th>{t("Latest update")}</th><th>{t("Status")}</th><th><span className="visually-hidden">{t("Open")}</span></th></tr></thead><tbody>
    {reports.map(report => <tr key={report.reportId} onClick={() => onOpen(report)}><td data-label={t("Report")}><b>{report.title}</b><small>{report.referenceNumber}</small></td><td data-label={t("Category")}>{t(report.category)}</td><td data-label={t("Location")}>{report.location}</td><td data-label={t("Submitted")}>{formatDate(report.submittedAt)}</td><td data-label={t("Latest update")}>{report.latestCitizenUpdate || '—'}</td><td data-label={t("Status")}><StatusPill status={report.currentStatus} /></td><td><button className="row-action" aria-label={`${t('Open')} ${report.referenceNumber}`} onClick={event => { event.stopPropagation(); onOpen(report) }}>→</button></td></tr>)}
  </tbody></table></div>
}

function ManagerDashboard({ dashboard, reports, onOpen }: { dashboard: Dashboard | null; reports: Report[]; onOpen: (report: Report) => void }) {
  const { t } = useI18n()
  const [category, setCategory] = useState('')
  const cells = useMemo(() => (dashboard?.mapCells || []).filter(cell => !category || cell.category === category), [dashboard, category])
  const typedLocations = useMemo(() => (dashboard?.typedLocations || []).filter(item => !category || item.category === category), [dashboard, category])
  return <section className="dashboard-page"><div className="page-heading"><p className="eyebrow">{t("DEPARTMENT OVERVIEW")}</p><h1>{t("Service delivery, in focus.")}</h1><p>{t("Aggregated view of cases visible to your institution. Resolution status is not independent citizen verification.")}</p></div>
    <div className="metric-row">{[['Total reports', dashboard?.total ?? 0, 'violet'], ['Awaiting action', dashboard?.pending ?? 0, 'amber'], ['In progress', dashboard?.inProgress ?? 0, 'blue'], ['Marked resolved', dashboard?.resolved ?? 0, 'green']].map(([label, value, tone]) => <Metric key={String(label)} label={String(label)} value={Number(value)} tone={String(tone)} />)}</div>
    <div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">{t("REPORT MIX")}</p><h2>{t("By category")}</h2></div></div>{dashboard?.byCategory.length ? dashboard.byCategory.map(item => <BarRow key={item.name} name={item.name} value={item.count} max={Math.max(...dashboard.byCategory.map(row => row.count))} />) : <p className="subtle">{t("No category data yet.")}</p>}</section>
      <section className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">{t("INSTITUTIONAL WORKLOAD")}</p><h2>{t("By institution")}</h2></div></div>{dashboard?.byInstitution.length ? dashboard.byInstitution.map(item => <BarRow key={item.name} name={item.name} value={item.count} max={Math.max(...dashboard.byInstitution.map(row => row.count))} />) : <p className="subtle">{t("No institution data yet.")}</p>}</section></div>
    <div className="metric-row"><Metric label="Average time to first resolution (hours)" value={dashboard?.averageResolutionHours == null ? '—' : dashboard.averageResolutionHours.toFixed(1)} tone="blue" /><p className="subtle">{t('Based on reports with a recorded resolution.')} {dashboard?.resolutionSampleSize ?? 0}</p></div>
    <section className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">{t('REPORT LOCATIONS')}</p><h2>{t('Report density by category')}</h2></div></div>
      <label className="field">{t('Issue category')}<select value={category} onChange={event => setCategory(event.target.value)}><option value="">{t('All categories')}</option>{dashboard?.byCategory.map(item => <option key={item.name} value={item.name}>{t(item.name)}</option>)}</select></label>
      <p className="subtle">{t('GPS reports are grouped into approximate 0.1-degree cells. Typed locations are listed separately; wards are not inferred.')}</p>
      <Suspense fallback={<p role="status">{t('Loading the location picker…')}</p>}><ManagerHeatmap cells={cells} /></Suspense>
      {!cells.length && <p className="subtle">{t('No mapped reports for this selection.')}</p>}
      {!!dashboard?.unmapped && <p className="subtle">{t('Some GPS locations are outside the map or invalid.')} {dashboard.unmapped}</p>}
      <h3>{t('Typed locations')}</h3>{typedLocations.length ? typedLocations.map(item => <div key={`${item.name}-${item.category}`} className="location-summary"><span>{item.name} · {t(item.category)}</span><b>{item.count}</b></div>) : <p className="subtle">{t('No typed locations.')}</p>}
    </section>
    <div className="section-title"><div><p className="eyebrow">{t("CASE OVERSIGHT")}</p><h2>{t("Recent cases")}</h2></div></div><ReportsTable reports={reports} onOpen={onOpen} emptyTitle="No cases yet" emptyText="Reports connected to your institution will appear here." />
    <ManagerInsights send={(language, signal) => api('/dashboard/insights', { method: 'POST', body: JSON.stringify({ language }), signal })} />
  </section>
}

function BarRow({ name, value, max }: { name: string; value: number; max: number }) {
  const { t } = useI18n()
  return <div className="bar-row"><div><span>{t(name)}</span><b>{value}</b></div><div className="bar-track"><span style={{ width: `${Math.max(4, value / max * 100)}%` }} /></div></div>
}

function CaseDetails({ report, user, busy, onBack, onMutate, onFeedback }: { report: Report; user: User | null; busy: boolean; onBack: () => void; onMutate: (action: string, payload: Record<string, unknown>) => Promise<void>; onFeedback: (confirmed: boolean, text: string) => Promise<void> }) {
  const { t } = useI18n()
  const [updateText, setUpdateText] = useState('')
  const [updateVisibility, setUpdateVisibility] = useState<'Citizen' | 'Internal'>('Citizen')
  const [feedbackText, setFeedbackText] = useState('')
  const [referralInstitution, setReferralInstitution] = useState(String(report.leadInstitutionId === 2 ? 1 : 2))
  const isStaff = user?.role === 'Official' || user?.role === 'Manager'
  const isCitizen = user?.role === 'Citizen'
  const referralOptions = [
    { id: 1, name: 'Demo Local Municipality' },
    { id: 2, name: 'Department of Education (demo)' },
    { id: 3, name: 'Department of Health (demo)' },
    { id: 4, name: 'Department of Public Works and Roads (demo)' },
  ].filter(institution => institution.id !== report.leadInstitutionId)
  return <section className="case-page">
    <button className="back-link" onClick={onBack}>{t("← Back to case list")}</button>
    <div className="case-header"><div><p className="eyebrow">{report.referenceNumber} · {t(report.category).toUpperCase()}</p><h1>{report.title}</h1><p className="case-location">⌖ {report.location} <span>·</span> {t("Submitted")} {formatDate(report.submittedAt)}</p></div><StatusPill status={report.currentStatus} /></div>
    <div className="case-layout"><div className="case-main">
      <article className="panel detail-panel"><div className="panel-heading"><div><p className="eyebrow">{t("REPORT DETAILS")}</p><h2>{t("What’s happening")}</h2></div></div><p className="description">{report.description}</p>{report.photo && <div className="case-photo"><h3>{t("Report photo")}</h3><img src={report.photo} alt={t("Photo attached to this report")} /></div>}<div className="detail-meta"><div><span>{t("Lead institution")}</span><b>{report.leadInstitution || 'Not yet assigned'}</b></div><div><span>{t("Participating institutions")}</span><b>{report.institutions?.join(', ') || report.leadInstitution || 'Awaiting assignment'}</b></div></div></article>
      <article className="panel timeline-panel"><div className="panel-heading"><div><p className="eyebrow">{t("CASE HISTORY")}</p><h2>{t("Updates & activity")}</h2></div></div>
        {report.timeline?.length ? <ol className="timeline">{report.timeline.map((item, index) => <li key={`${item.createdAt}-${index}`}><span className={`timeline-dot timeline-${item.kind}`}><span>{item.kind === 'status' ? '↗' : item.kind === 'referral' ? '⇢' : '•'}</span></span><div><div className="timeline-title"><b>{item.text}</b>{item.visibility === 'Internal' && <span className="internal-tag">{t("INTERNAL")}</span>}</div><p>{item.actor} · {formatDate(item.createdAt)}</p></div></li>)}</ol> : <p className="subtle">{t("No updates have been recorded.")}</p>}
      </article>
      {isStaff && <article className="panel action-panel"><div className="panel-heading"><div><p className="eyebrow">{t("OFFICIAL ACTIONS")}</p><h2>{t("Move the case forward")}</h2></div></div>
        <div className="action-grid"><label className="field">{t("Update status")}<select value={report.currentStatus} onChange={event => void onMutate('status', { status: event.target.value })} disabled={busy || !report.allowedNextStatuses?.length}><option value={report.currentStatus}>{t(report.currentStatus)}</option>{report.allowedNextStatuses?.map(status => <option value={status} key={status}>{t(status)}</option>)}</select></label>
          <label className="field">{t("Refer to supporting institution")}<select value={referralInstitution} onChange={event => setReferralInstitution(event.target.value)}>{referralOptions.map(institution => <option value={institution.id} key={institution.id}>{institution.name}</option>)}</select></label></div>
        <div className="assign-row"><span>{t("Lead:")} <b>{report.leadInstitution || 'Not assigned'}</b></span><button className="button button-outline" disabled={busy || !user?.institutionId} onClick={() => void onMutate('assign', { institutionId: user?.institutionId, responsibility: 'Case ownership confirmed' })}>{t("Assign to my institution")}</button></div>
        <div className="referral-row"><input aria-label={t("Referral reason")} id="referral-reason" placeholder={t("Why is this institution needed?")} /><button className="button button-outline" disabled={busy} onClick={() => { const reason = (document.getElementById('referral-reason') as HTMLInputElement).value; void onMutate('refer', { institutionId: Number(referralInstitution), reason }) }}>{t("Refer case")}</button></div>
        <label className="field update-label">{t("Add a case update")}<textarea rows={3} value={updateText} onChange={event => setUpdateText(event.target.value)} placeholder={t("Record the action taken or what needs to happen next.")} /></label>
        <div className="update-footer"><label className="visibility-select">{t("Visible to")} <select value={updateVisibility} onChange={event => setUpdateVisibility(event.target.value as 'Citizen' | 'Internal')}><option value="Citizen">{t("Citizen")}</option><option value="Internal">{t("Officials only")}</option></select></label><button className="button button-primary" disabled={busy || !updateText.trim()} onClick={async () => { await onMutate('updates', { text: updateText.trim(), visibility: updateVisibility }); setUpdateText('') }}>{t("Post update")}</button></div>
      </article>}
      {isCitizen && report.currentStatus === 'Resolved' && !report.resolutionConfirmed && <article className="panel feedback-panel"><div className="panel-heading"><div><p className="eyebrow">{t("CITIZEN FEEDBACK")}</p><h2>{t("Has the issue been addressed?")}</h2></div></div><p className="subtle">{t("Your feedback is recorded separately from the institution’s resolution status.")}</p><textarea value={feedbackText} onChange={event => setFeedbackText(event.target.value)} rows={3} placeholder={t("Share an optional comment")} /><div className="feedback-actions"><button className="button button-outline" disabled={busy} onClick={() => void onFeedback(false, feedbackText)}>{t("Not yet resolved")}</button><button className="button button-primary" disabled={busy} onClick={() => void onFeedback(true, feedbackText)}>{t("Yes, resolved")}</button></div></article>}
    </div><aside className="case-aside"><div className="panel aside-panel"><p className="eyebrow">{t("AT A GLANCE")}</p><div className="aside-row"><span>{t("Reference")}</span><b>{report.referenceNumber}</b></div><div className="aside-row"><span>{t("Current status")}</span><StatusPill status={report.currentStatus} /></div><div className="aside-row"><span>{t("Lead institution")}</span><b>{report.leadInstitution || t('Unassigned')}</b></div>{isStaff && <div className="aside-note"><span>ⓘ</span><p>{t("A referral adds a supporting institution; it does not automatically transfer lead responsibility.")}</p></div>}</div><div className="panel aside-panel"><p className="eyebrow">{t("NEXT STEP")}</p><p className="subtle">{t(isCitizen ? 'Follow updates here. If more information is required, the case team will post a citizen-visible update.' : 'Record clear actions and choose citizen-visible updates whenever appropriate.')}</p>{isStaff && <CaseInsights title={report.title} description={report.description} photo={report.photo || null} send={(input, signal) => api(`/cases/${encodeURIComponent(report.referenceNumber)}/insights`, { method: 'POST', body: JSON.stringify(input), signal })} />}</div></aside></div>
  </section>
}

export default App
