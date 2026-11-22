import { useI18n } from './i18n-context'
import { useRef, useState, type FormEvent } from 'react'
import logo from '../../docs/ReaBona_Civic_Action_Logo_transparent.svg'
import { ReportPhoto } from './ReportPhoto'
import { CameraButton } from './CameraButton'
import { emptyPhoto, type PhotoSelection } from './photo'
import { VoiceButton } from './VoiceButton'
import { VoiceLanguage } from './VoiceLanguage'
import { appendTranscript, idleVoice, type VoiceStatus } from './voice'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }
export type ReportDraft = { title: string | null; categoryId: number | null; location: string | null; description: string | null }
export type Category = { categoryId: number; categoryName: string }
type Chat = { id: number; messages: ChatMessage[]; draft: string; report: ReportDraft | null; photo: PhotoSelection; voice: VoiceStatus; busy: boolean; error: string; submissionError: string }

function newChat(id: number): Chat {
  return { id, messages: [], draft: '', report: null, photo: emptyPhoto, voice: idleVoice, busy: false, error: '', submissionError: '' }
}

export function Assistant({ active, name, categories, voiceLanguage, onVoiceLanguageChange, sendMessage, submitReport }: {
  active: boolean
  name: string
  categories: Category[]
  voiceLanguage: string
  onVoiceLanguageChange: (language: string) => void
  sendMessage: (messages: ChatMessage[], report: ReportDraft | null) => Promise<{ reply: string; report: ReportDraft | null }>
  submitReport: (report: ReportDraft, photo: File | null) => Promise<string>
}) {
  const { t } = useI18n()
  const [chats, setChats] = useState<Chat[]>([newChat(1)])
  const [currentId, setCurrentId] = useState(1)
  const nextId = useRef(2)
  const chat = chats.find(item => item.id === currentId)
  if (!chat) throw new Error('Current chat not found')

  const updateChat = (id: number, update: (current: Chat) => Chat) => {
    setChats(current => current.map(item => item.id === id ? update(item) : item))
  }

  const startNewChat = () => {
    const id = nextId.current++
    setChats(current => [newChat(id), ...current])
    setCurrentId(id)
  }

  const requestReply = async (id: number, messages: ChatMessage[], report: ReportDraft | null) => {
    try {
      const result = await sendMessage(messages.slice(-11), report)
      updateChat(id, current => ({ ...current, report: result.report, photo: current.report && !result.report ? emptyPhoto : current.photo, messages: [...current.messages, { role: 'assistant', content: result.reply }], busy: false }))
    } catch (requestError) {
      updateChat(id, current => ({
        ...current,
        busy: false,
        error: requestError instanceof Error ? requestError.message : 'Unable to reach the assistant.',
      }))
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = chat.draft.trim()
    if (!text || chat.busy || chat.voice.active) return
    const messages: ChatMessage[] = [...chat.messages, { role: 'user', content: text }]
    updateChat(chat.id, current => ({ ...current, messages, draft: '', busy: true, error: '' }))
    void requestReply(chat.id, messages, chat.report)
  }

  const retry = () => {
    if (chat.busy) return
    updateChat(chat.id, current => ({ ...current, busy: true, error: '' }))
    void requestReply(chat.id, chat.messages, chat.report)
  }

  const updateReport = (changes: Partial<ReportDraft>) => {
    updateChat(chat.id, current => current.report ? { ...current, report: { ...current.report, ...changes } } : current)
  }

  const confirmReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!chat.report || chat.busy || chat.voice.active || chat.submissionError || chat.photo.error || !chat.photo.ready) return
    const report = chat.report
    const id = chat.id
    updateChat(id, current => ({ ...current, busy: true, error: '' }))
    try {
      const referenceNumber = await submitReport(report, chat.photo.file)
      updateChat(id, current => ({
        ...current, report: null, photo: emptyPhoto, busy: false,
        messages: [...current.messages, { role: 'assistant', content: `Your report was submitted. Your reference number is ${referenceNumber}. You can follow it in My reports.` }],
      }))
    } catch (requestError) {
      const detail = requestError instanceof Error ? requestError.message : 'Unable to reach the server.'
      updateChat(id, current => ({ ...current, busy: false, submissionError: `Submission could not be confirmed: ${detail} Check My reports before trying again to avoid a duplicate.` }))
    }
  }

  return <section className="assistant-page" aria-label={t("ReaBona assistant")}>
    <aside className="assistant-sidebar">
      <div className="assistant-sidebar-title"><img className="assistant-emblem" src={logo} alt="" /><div><strong>{t("Ask ReaBona")}</strong><small>{t("Citizen assistant")}</small></div></div>
      <button className="assistant-new-chat" type="button" onClick={startNewChat}><span aria-hidden="true">＋</span> {t("New chat")}</button>
      <p className="assistant-sidebar-label">{t("YOUR CHATS")} <span>{t("THIS SESSION")}</span></p>
      <nav className="assistant-chat-list" aria-label={t("Chat conversations")}>
        {chats.map(item => {
          const title = item.messages.find(message => message.role === 'user')?.content || t('New conversation')
          return <button key={item.id} type="button" className={item.id === currentId ? 'chat-selected' : ''} aria-current={item.id === currentId ? 'true' : undefined} onClick={() => setCurrentId(item.id)}>
            <span className="chat-list-icon" aria-hidden="true">◌</span><span>{title}</span>{item.busy && <span className="chat-pending" aria-label={t("Awaiting reply")}>●</span>}
          </button>
        })}
      </nav>
      <div className="assistant-sidebar-note">{t("Chats stay in this browser session and are cleared when you reload or switch accounts.")}</div>
    </aside>
    <div className="assistant-content">
      <div className="assistant-content-top"><span><span className="assistant-online" /> {t("CITIZEN SUPPORT")}</span><span>{t("POWERED BY AZURE AI")}</span></div>
      <div className={`assistant-conversation ${chat.messages.length ? 'has-messages' : ''}`}>
        {chat.messages.length === 0 && <div className="assistant-welcome">
          <img className="assistant-welcome-mark" src={logo} alt="" />
          <p className="assistant-kicker">{t("HERE FOR YOUR COMMUNITY")}</p>
          <h1>{t("How can I help,")} {name}?</h1>
          <p>{t("Ask me to help you report an issue or follow its progress on ReaBona.")}</p>
        </div>}
        {chat.messages.length > 0 && <div className="assistant-messages" aria-live="polite">
          {chat.messages.map((message, index) => <div key={index} className={`assistant-message assistant-message-${message.role}`}>
            <span className="assistant-message-avatar" aria-hidden="true">{message.role === 'user' ? name.charAt(0) : <img src={logo} alt="" />}</span>
            <div><strong>{t(message.role === 'user' ? 'You' : 'ReaBona assistant')}</strong><p>{message.content}</p></div>
          </div>)}
          {chat.busy && <p className="assistant-thinking" role="status">{t("ReaBona is thinking")}<span>…</span></p>}
        </div>}
        <div className="assistant-compose">
          {chat.report && <form className="assistant-report" onSubmit={event => void confirmReport(event)}>
            <h2>{t("Review your report")}</h2>
            <p>{t("Complete or edit the details below. Nothing is submitted until you confirm.")}</p>
            <fieldset disabled={chat.busy}>
              <label>{t("Report title")}<input value={chat.report.title ?? ''} required maxLength={200} onChange={event => updateReport({ title: event.target.value })} /></label>
              <label>{t("Issue category")}<select value={chat.report.categoryId ?? ''} required onChange={event => updateReport({ categoryId: event.target.value ? Number(event.target.value) : null })}>
                <option value="">{t("Select a category")}</option>{categories.map(category => <option key={category.categoryId} value={category.categoryId}>{t(category.categoryName)}</option>)}
              </select></label>
              <label>{t("Where is it happening?")}<input value={chat.report.location ?? ''} required maxLength={300} onChange={event => updateReport({ location: event.target.value })} /></label>
              <label>{t("Describe the issue")}<textarea value={chat.report.description ?? ''} required maxLength={5000} rows={4} onChange={event => updateReport({ description: event.target.value })} /></label>
              <ReportPhoto key={chat.id} value={chat.photo} onChange={photo => updateChat(chat.id, current => ({ ...current, photo }))} />
              {chat.submissionError && <div className="assistant-error" role="alert"><span>{chat.submissionError}</span><button type="button" onClick={() => updateChat(chat.id, current => ({ ...current, submissionError: '' }))}>{t("I checked My reports")}</button></div>}
              <div className="assistant-report-actions">
                <button type="button" onClick={() => updateChat(chat.id, current => ({ ...current, report: null, photo: emptyPhoto, submissionError: '', messages: [...current.messages, { role: 'assistant', content: current.submissionError ? 'The draft was discarded. Check My reports to see whether the earlier submission succeeded.' : 'The report draft was discarded. No report was submitted.' }] }))}>{t("Discard draft")}</button>
                <button type="submit" disabled={Boolean(chat.submissionError || chat.photo.error) || !chat.photo.ready || chat.voice.active}>{t("Confirm and submit report")}</button>
              </div>
            </fieldset>
          </form>}
          {!chat.report && (chat.photo.file || chat.photo.error) && <div className="assistant-pending-photo"><p>{t("Photo for your report (not sent in chat).")}</p><ReportPhoto key={chat.id} value={chat.photo} onChange={photo => updateChat(chat.id, current => ({ ...current, photo }))} /></div>}
          {chat.error && <div className="assistant-error" role="alert"><span>{chat.error}</span><button type="button" onClick={retry}>{t("Try again")}</button></div>}
          <form className="assistant-form" onSubmit={submit}>
            <label className="visually-hidden" htmlFor="assistant-message">{t("Your message")}</label>
            <textarea id="assistant-message" value={chat.draft} onChange={event => updateChat(chat.id, current => ({ ...current, draft: event.target.value }))} maxLength={2000} rows={3} placeholder={t("How can I help you today?")} disabled={chat.busy} onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }} />
            <div className="assistant-form-bottom"><span>{t("ASK REABONA")} <span aria-hidden="true">·</span> {t("CITIZEN SUPPORT")}</span><div className="assistant-form-controls"><CameraButton key={`camera-${chat.id}`} compact disabled={chat.busy || chat.voice.active} onChange={photo => updateChat(chat.id, current => ({ ...current, photo }))} /><VoiceButton key={`voice-${chat.id}`} language={voiceLanguage} enabled={active} disabled={chat.busy} onStatus={voice => updateChat(chat.id, current => ({ ...current, voice }))} onText={text => {
              const next = appendTranscript(chat.draft, text, 2000)
              if (next === null) return 'Transcription exceeds the 2,000-character limit. Shorten the message and try again.'
              updateChat(chat.id, current => ({ ...current, draft: next }))
              return null
            }} /><button type="submit" className="assistant-send" aria-label={t("Send message")} disabled={chat.busy || chat.voice.active || !chat.draft.trim()}>{chat.busy ? '…' : '↑'}</button></div></div>
          </form>
          <VoiceLanguage value={voiceLanguage} onChange={onVoiceLanguageChange} disabled={chat.voice.active || chat.busy} />
          {chat.voice.message && <p className={`voice-status ${chat.voice.error ? 'voice-error' : ''}`} role={chat.voice.error ? 'alert' : 'status'}>{t(chat.voice.message)}</p>}
          <p className="assistant-privacy">{t("Messages and text report drafts are sent to the configured Azure AI service; photos are not. Do not share personal or sensitive information. Reports are submitted only after you confirm.")}</p>
        </div>
      </div>
    </div>
  </section>
}
