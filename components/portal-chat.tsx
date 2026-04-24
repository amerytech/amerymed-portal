'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import styles from '@/components/portal-chat.module.css';

type MessageRow = {
  id: string;
  client_id: string;
  sender_user_id: string | null;
  sender_role: string | null;
  sender_email: string | null;
  body: string;
  created_at: string;
};

type ClientDirectoryRow = {
  id: string;
  clinic_name: string | null;
  physician_name?: string | null;
  practice_name?: string | null;
  contact_email?: string | null;
};

const supabase = createBrowserSupabaseClient();

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function deriveClientLabel(client: ClientDirectoryRow | undefined) {
  if (!client) return 'Client conversation';
  return client.physician_name || client.practice_name || client.clinic_name || 'Client conversation';
}

function derivePracticeLabel(client: ClientDirectoryRow | undefined) {
  if (!client) return 'Linked client record';
  return client.practice_name || client.clinic_name || client.contact_email || 'Linked client record';
}

function sortMessagesAscending(a: MessageRow, b: MessageRow) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function useMessageSound(messages: MessageRow[], incomingRole: 'admin' | 'client') {
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasUnlockedAudioRef = useRef(false);
  const lastMessageIdRef = useRef('');

  const playTone = (fromHz: number, toHz: number, duration = 0.24, peak = 0.05) => {
    if (!hasUnlockedAudioRef.current) return;

    const context = audioContextRef.current;
    if (!context || context.state !== 'running') return;

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const startTime = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(fromHz, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(toHz, startTime + Math.max(duration - 0.06, 0.05));

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(peak, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unlockAudio = async () => {
      if (hasUnlockedAudioRef.current) return;

      const AudioContextCtor = window.AudioContext || (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

      if (!AudioContextCtor) return;

      const context = audioContextRef.current || new AudioContextCtor();
      audioContextRef.current = context;

      if (context.state === 'suspended') {
        await context.resume().catch(() => undefined);
      }

      hasUnlockedAudioRef.current = context.state === 'running';
    };

    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener('pointerdown', unlockAudio, options);
    window.addEventListener('keydown', unlockAudio, options);
    window.addEventListener('touchstart', unlockAudio, options);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    const previousMessageId = lastMessageIdRef.current;
    lastMessageIdRef.current = latestMessage.id;

    if (!previousMessageId) return;
    if (latestMessage.id === previousMessageId) return;
    if (latestMessage.sender_role !== incomingRole) return;
    if (!hasUnlockedAudioRef.current) return;

    playTone(880, 660, 0.22, 0.05);
  }, [incomingRole, messages]);

  return {
    playSentMessageSound() {
      playTone(660, 880, 0.16, 0.035);
    },
  };
}

export function ClientPortalChat({
  clientId,
  sessionEmail,
}: {
  clientId: string;
  sessionEmail: string;
}) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const { playSentMessageSound } = useMessageSound(messages, 'admin');

  const loadMessages = useEffectEvent(async () => {
    const { data, error: loadError } = await supabase
      .from('messages')
      .select('id, client_id, sender_user_id, sender_role, sender_email, body, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(150);

    if (loadError) {
      setError(`Chat unavailable: ${loadError.message}`);
      setMessages([]);
      setLoading(false);
      return;
    }

    setError('');
    setMessages((data || []).sort(sortMessagesAscending));
    setLoading(false);
  });

  useEffect(() => {
    if (!clientId) return;

    void loadMessages();

    const channel = supabase
      .channel(`client-messages:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          void loadMessages();
        }
      )
      .subscribe();

    const interval = window.setInterval(() => {
      void loadMessages();
    }, 30000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [clientId]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = chatText.trim();
    if (!trimmed) return;
    if (!clientId) {
      setError('Messaging is not linked to a client account yet. Please refresh after your profile finishes loading.');
      return;
    }

    setSending(true);
    setError('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSending(false);
      setError('Message failed: your client session could not be confirmed. Please refresh and try again.');
      return;
    }

    const { data: insertedRows, error: insertError } = await supabase
      .from('messages')
      .insert({
        client_id: clientId,
        sender_user_id: user.id,
        sender_role: 'client',
        sender_email: sessionEmail || user.email || null,
        body: trimmed,
      })
      .select('id, client_id, sender_user_id, sender_role, sender_email, body, created_at');

    setSending(false);

    if (insertError) {
      setError(`Message failed: ${insertError.message}`);
      return;
    }

    setChatText('');
    if (insertedRows && insertedRows[0]) {
      setMessages((prev) => [...prev, insertedRows[0]].sort(sortMessagesAscending));
    }
    playSentMessageSound();
  }

  return (
    <article className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Portal Messaging</div>
          <h2 className={styles.title}>Chat with AmeryMed operations</h2>
          <p className={styles.text}>
            Send questions to the admin team here and watch for live replies in the same thread.
          </p>
        </div>
        <div className={styles.statusPill}>Live support thread</div>
      </div>

      {error ? (
        <div className={styles.errorState}>{error}</div>
      ) : (
        <div className={styles.chatShell}>
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderTitle}>Current conversation</div>
            <div className={styles.chatHeaderMeta}>{sessionEmail || 'Client portal user'}</div>
          </div>

          <div className={styles.messages}>
            {loading ? (
              <div className={styles.emptyState}>Loading conversation...</div>
            ) : messages.length === 0 ? (
              <div className={styles.emptyState}>
                No messages yet. Start the thread and the admin team can respond here.
              </div>
            ) : (
              messages.map((message) => {
                const isClient = message.sender_role === 'client';

                return (
                  <div
                    key={message.id}
                    className={`${styles.messageRow} ${
                      isClient ? styles.messageRowClient : styles.messageRowAdmin
                    }`}
                  >
                    <div
                      className={`${styles.messageBubble} ${
                        isClient ? styles.messageBubbleClient : styles.messageBubbleAdmin
                      }`}
                    >
                      <div className={styles.messageSender}>
                        {isClient ? 'You' : message.sender_email || 'Admin team'}
                      </div>
                      <div className={styles.messageBody}>{message.body}</div>
                      <div className={styles.messageTime}>{formatTimestamp(message.created_at)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className={styles.composer}>
            <textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder={
                clientId
                  ? 'Ask the admin team a question about uploads, billing follow-up, or documentation.'
                  : 'Type your message here. Sending will be available after your client account finishes linking.'
              }
              className={styles.textarea}
              disabled={sending}
            />
            <div className={styles.composerFooter}>
              <div className={styles.hint}>
                {clientId
                  ? 'Messages stay connected to your client account.'
                  : 'Your portal is still waiting for a client link, so sending may pause until that finishes.'}
              </div>
              <button type="submit" className={styles.sendButton} disabled={sending || !chatText.trim()}>
                {sending ? 'Sending...' : 'Send message'}
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}

export function AdminPortalChat({ adminEmail }: { adminEmail: string }) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [clientDirectory, setClientDirectory] = useState<Record<string, ClientDirectoryRow>>({});
  const [selectedClientId, setSelectedClientId] = useState('');
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const { playSentMessageSound } = useMessageSound(messages, 'client');

  const loadMessages = useEffectEvent(async () => {
    const { data, error: loadError } = await supabase
      .from('messages')
      .select('id, client_id, sender_user_id, sender_role, sender_email, body, created_at')
      .order('created_at', { ascending: true })
      .limit(300);

    if (loadError) {
      setError(`Chat unavailable: ${loadError.message}`);
      setMessages([]);
      setLoading(false);
      return;
    }

    const allMessages = (data || []).sort(sortMessagesAscending);
    setMessages(allMessages);
    setError('');
    setLoading(false);

    const clientIds = Array.from(new Set(allMessages.map((message) => message.client_id).filter(Boolean)));

    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, clinic_name, physician_name, practice_name, contact_email')
        .in('id', clientIds);

      const nextDirectory: Record<string, ClientDirectoryRow> = {};
      (clients || []).forEach((client) => {
        nextDirectory[client.id] = client as ClientDirectoryRow;
      });
      setClientDirectory(nextDirectory);

      setSelectedClientId((current) => current || clientIds[0]);
    } else {
      setClientDirectory({});
      setSelectedClientId('');
    }
  });

  useEffect(() => {
    void loadMessages();

    const channel = supabase
      .channel('admin-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          void loadMessages();
        }
      )
      .subscribe();

    const interval = window.setInterval(() => {
      void loadMessages();
    }, 30000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, []);

  const threadSummaries = useMemo(() => {
    const map = new Map<string, MessageRow>();

    for (const message of messages) {
      if (!message.client_id) continue;
      map.set(message.client_id, message);
    }

    return Array.from(map.entries())
      .map(([clientId, latestMessage]) => ({ clientId, latestMessage }))
      .sort(
        (a, b) =>
          new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime()
      );
  }, [messages]);

  const selectedMessages = useMemo(() => {
    return messages.filter((message) => message.client_id === selectedClientId);
  }, [messages, selectedClientId]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = chatText.trim();
    if (!trimmed || !selectedClientId) return;

    setSending(true);
    setError('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSending(false);
      setError('Message failed: your admin session could not be confirmed. Please refresh and try again.');
      return;
    }

    const { data: insertedRows, error: insertError } = await supabase
      .from('messages')
      .insert({
        client_id: selectedClientId,
        sender_user_id: user.id,
        sender_role: 'admin',
        sender_email: adminEmail || user.email || null,
        body: trimmed,
      })
      .select('id, client_id, sender_user_id, sender_role, sender_email, body, created_at');

    setSending(false);

    if (insertError) {
      setError(`Message failed: ${insertError.message}`);
      return;
    }

    setChatText('');
    if (insertedRows && insertedRows[0]) {
      setMessages((prev) => [...prev, insertedRows[0]].sort(sortMessagesAscending));
    }
    playSentMessageSound();
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Client Messaging</div>
          <h2 className={styles.title}>Live client support inbox</h2>
          <p className={styles.text}>
            Watch incoming client questions and reply directly from the admin workspace.
          </p>
        </div>
        <div className={styles.statusPill}>Realtime + refresh fallback</div>
      </div>

      {error ? (
        <div className={styles.errorState}>{error}</div>
      ) : (
        <div className={styles.adminLayout}>
          <div className={styles.threadList}>
            {loading ? (
              <div className={styles.emptyState}>Loading client conversations...</div>
            ) : threadSummaries.length === 0 ? (
              <div className={styles.emptyState}>No client conversations yet.</div>
            ) : (
              threadSummaries.map(({ clientId, latestMessage }) => {
                const client = clientDirectory[clientId];
                const isActive = clientId === selectedClientId;

                return (
                  <button
                    key={clientId}
                    type="button"
                    onClick={() => setSelectedClientId(clientId)}
                    className={`${styles.threadButton} ${
                      isActive ? styles.threadButtonActive : ''
                    }`}
                  >
                    <div className={styles.threadTitle}>{deriveClientLabel(client)}</div>
                    <div className={styles.threadMeta}>{derivePracticeLabel(client)}</div>
                    <div className={styles.threadPreview}>{latestMessage.body}</div>
                  </button>
                );
              })
            )}
          </div>

          <div className={styles.chatShell}>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderTitle}>
                {selectedClientId ? deriveClientLabel(clientDirectory[selectedClientId]) : 'Select a conversation'}
              </div>
              <div className={styles.chatHeaderMeta}>
                {selectedClientId
                  ? derivePracticeLabel(clientDirectory[selectedClientId])
                  : 'Choose a client thread from the inbox'}
              </div>
            </div>

            <div className={styles.messages}>
              {!selectedClientId ? (
                <div className={styles.emptyState}>Choose a client thread to begin responding.</div>
              ) : selectedMessages.length === 0 ? (
                <div className={styles.emptyState}>No messages in this conversation yet.</div>
              ) : (
                selectedMessages.map((message) => {
                  const isAdmin = message.sender_role === 'admin';

                  return (
                    <div
                      key={message.id}
                      className={`${styles.messageRow} ${
                        isAdmin ? styles.messageRowAdmin : styles.messageRowClient
                      }`}
                    >
                      <div
                        className={`${styles.messageBubble} ${
                          isAdmin ? styles.messageBubbleAdmin : styles.messageBubbleClient
                        }`}
                      >
                        <div className={styles.messageSender}>
                          {isAdmin ? 'Admin' : message.sender_email || 'Client'}
                        </div>
                        <div className={styles.messageBody}>{message.body}</div>
                        <div className={styles.messageTime}>{formatTimestamp(message.created_at)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className={styles.composer}>
              <textarea
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Reply to the client here."
                className={styles.textarea}
                disabled={sending || !selectedClientId}
              />
              <div className={styles.composerFooter}>
                <div className={styles.hint}>Replies post directly into the selected client thread.</div>
                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={sending || !selectedClientId || !chatText.trim()}
                >
                  {sending ? 'Sending...' : 'Send reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
