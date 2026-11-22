import { useState, type FormEvent } from 'react'
import { useI18n } from './i18n-context'
import logo from '../../docs/ReaBona_Civic_Action_Logo_transparent.svg'
import type { ChatMessage } from './Assistant'
import { PhotoAnalysis } from './PhotoAnalysis'

type Conversation = { id: number; messages: ChatMessage[]; draft: string; busy: boolean; error: string }

export function OfficialAssistant({ name, sendMessage, reports, loadPhoto }: {
  name: string
  sendMessage: (messages: ChatMessage[]) => Promise<{ reply: string }>
  reports: { referenceNumber: string; title: string }[]
  loadPhoto: (reference: string) => Promise<string | null>
}) {
  const { t } = useI18n()
  const [chats, setChats] = useState<Conversation[]>([{ id: 1, messages: [], draft: '', busy: false, error: '' }])
  const [selected, setSelected] = useState(1)
  const chat = chats.find(item => item.id === selected)
  if (!chat) throw new Error('Current chat not found')
  const update = (id: number, fn: (current: Conversation) => Conversation) =>
    setChats(items => items.map(item => item.id === id ? fn(item) : item))
  const send = async (id: number, messages: ChatMessage[]) => {
    try {
      const { reply } = await sendMessage(messages.slice(-11))
      update(id, current => ({ ...current, busy: false, messages: [...current.messages, { role: 'assistant', content: reply }] }))
    } catch (error) {
      update(id, current => ({ ...current, busy: false, error: error instanceof Error ? error.message : 'Unable to reach the assistant.' }))
    }
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!chat.draft.trim() || chat.busy) return
    const messages: ChatMessage[] = [...chat.messages, { role: 'user', content: chat.draft.trim() }]
    update(chat.id, current => ({ ...current, messages, draft: '', busy: true, error: '' }))
    void send(chat.id, messages)
  }
  return <section className="assistant-page" aria-label={t('Official assistant')}>
    <aside className="assistant-sidebar">
      <div className="assistant-sidebar-title"><img className="assistant-emblem" src={logo} alt="" /><div><strong>{t('Ask ReaBona')}</strong><small>{t('Official assistant')}</small></div></div>
      <button className="assistant-new-chat" type="button" onClick={() => {
        const id = Math.max(...chats.map(item => item.id)) + 1
        setChats(items => [{ id, messages: [], draft: '', busy: false, error: '' }, ...items])
        setSelected(id)
      }}><span aria-hidden="true">＋</span> {t('New chat')}</button>
      <p className="assistant-sidebar-label">{t('YOUR CHATS')} <span>{t('THIS SESSION')}</span></p>
      <nav className="assistant-chat-list" aria-label={t('Chat conversations')}>{chats.map(item => <button key={item.id} type="button" className={item.id === selected ? 'chat-selected' : ''} onClick={() => setSelected(item.id)}>
        <span className="chat-list-icon" aria-hidden="true">◌</span><span>{item.messages.find(message => message.role === 'user')?.content || t('New conversation')}</span>
      </button>)}</nav>
      <div className="assistant-sidebar-note">{t('Chats stay in this browser session and are cleared when you reload or switch accounts.')}</div>
    </aside>
    <div className="assistant-content"><div className="assistant-content-top"><span>{t('OFFICIAL SUPPORT')}</span><span>{t('POWERED BY AZURE AI')}</span></div>
      <div className={`assistant-conversation ${chat.messages.length ? 'has-messages' : ''}`}>
        {!chat.messages.length && <div className="assistant-welcome"><img className="assistant-welcome-mark" src={logo} alt="" /><h1>{t('How can I help,')} {name}?</h1><p>{t('Ask for general guidance on handling service reports.')}</p></div>}
        {!!chat.messages.length && <div className="assistant-messages" aria-live="polite">{chat.messages.map((message, index) => <div key={index} className={`assistant-message assistant-message-${message.role}`}><span className="assistant-message-avatar" aria-hidden="true">{message.role === 'user' ? name.charAt(0) : <img src={logo} alt="" />}</span><div><strong>{t(message.role === 'user' ? 'You' : 'ReaBona assistant')}</strong><p>{message.content}</p></div></div>)}{chat.busy && <p role="status">{t('ReaBona is thinking')}…</p>}</div>}
        <div className="assistant-compose">
          <details className="photo-analysis-toggle"><summary>{t('Photo analysis')}</summary><PhotoAnalysis reports={reports} loadPhoto={loadPhoto} /></details>
          {chat.error && <div className="assistant-error" role="alert">{chat.error} <button type="button" onClick={() => { update(chat.id, current => ({ ...current, busy: true, error: '' })); void send(chat.id, chat.messages) }}>{t('Try again')}</button></div>}
          <form className="assistant-form" onSubmit={submit}><label className="visually-hidden" htmlFor="official-message">{t('Your message')}</label><textarea id="official-message" value={chat.draft} maxLength={2000} rows={3} disabled={chat.busy} onChange={event => update(chat.id, current => ({ ...current, draft: event.target.value }))} placeholder={t('How can I help you today?')} /><div className="assistant-form-bottom"><span>{t('OFFICIAL SUPPORT')}</span><button className="assistant-send" type="submit" disabled={chat.busy || !chat.draft.trim()} aria-label={t('Send message')}>↑</button></div></form>
          <p className="assistant-privacy">{t('Messages are sent to Azure AI. Do not include report details, photos, personal or sensitive information. The assistant has no access to reports.')}</p>
        </div>
      </div>
    </div>
  </section>
}
