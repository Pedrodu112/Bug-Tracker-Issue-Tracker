'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getIssueNotifications } from '@/lib/api';
import { IssueNotification } from '@/types/issue';

const notificationLabels = {
  MENTION: 'Menção',
  STATUS_CHANGED: 'Mudança de status',
  ASSIGNED: 'Atribuição',
} as const;

export default function NotificationsPage() {
  const [recipientId, setRecipientId] = useState('ana');
  const [requestedRecipient, setRequestedRecipient] = useState('ana');
  const [notifications, setNotifications] = useState<IssueNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getIssueNotifications(requestedRecipient)
      .then((items) => {
        if (active) setNotifications(items);
      })
      .catch(() => {
        if (active) {
          setNotifications([]);
          setError('Não foi possível carregar as notificações deste usuário.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestedRecipient]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = recipientId.trim().toLowerCase();
    if (normalized) setRequestedRecipient(normalized);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Central de eventos</p>
          <h1>Notificações</h1>
          <p className="muted">Menções, atribuições e mudanças de status recebidas pelo usuário.</p>
        </div>
      </div>

      <form className="card filters" onSubmit={search}>
        <label className="full">
          Identificador do usuário
          <input
            value={recipientId}
            onChange={(event) => setRecipientId(event.target.value)}
            placeholder="Ex.: ana ou qa-tester"
            maxLength={40}
            pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,39}"
            required
          />
        </label>
        <button className="button" type="submit">Consultar</button>
      </form>

      {error && <p className="error">{error}</p>}
      <section className="card history-panel">
        <div className="workflow-heading">
          <div>
            <p className="eyebrow">Caixa de entrada</p>
            <h2>{requestedRecipient}</h2>
          </div>
          <span className="badge">{notifications.length} eventos</span>
        </div>

        {loading ? (
          <p className="muted">Carregando notificações...</p>
        ) : notifications.length === 0 ? (
          <p className="muted history-empty">Nenhuma notificação encontrada para este usuário.</p>
        ) : (
          <ol className="history-list">
            {notifications.map((notification) => (
              <li className="history-entry" key={notification.id}>
                <div className="history-entry-head">
                  <strong>{notificationLabels[notification.type]}</strong>
                  <span className="badge">Issue #{notification.issueId}</span>
                </div>
                <p>{notification.message}</p>
                <p className="history-meta">
                  {new Date(notification.createdAt).toLocaleString('pt-BR')}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
