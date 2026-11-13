'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAuditLog } from '@/lib/api';
import { IssueHistoryEntry } from '@/types/issue';

const statusLabels: Record<string, string> = {
  BACKLOG: 'Backlog',
  TRIAGEM: 'Triagem',
  EM_DESENVOLVIMENTO: 'Em desenvolvimento',
  CODE_REVIEW: 'Code review',
  QA: 'QA',
  PRONTO_PARA_DEPLOY: 'Pronto para deploy',
  CONCLUIDO: 'Concluído',
};

export default function AuditPage() {
  const [entries, setEntries] = useState<IssueHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getAuditLog()
      .then((items) => {
        if (active) setEntries([...items].reverse());
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar o registro global de auditoria.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Rastreabilidade do sistema</p>
          <h1>Auditoria</h1>
          <p className="muted">Registro cronológico e somente leitura das transições de todas as issues.</p>
        </div>
        <span className="badge">{entries.length} registros</span>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="card history-panel">
        {loading ? (
          <p className="muted">Carregando auditoria...</p>
        ) : entries.length === 0 ? (
          <p className="muted history-empty">Ainda não existem transições registradas.</p>
        ) : (
          <ol className="history-list">
            {entries.map((entry) => (
              <li className="history-entry" key={entry.id}>
                <div className="history-entry-head">
                  <strong>{entry.action}</strong>
                  <div className="actions">
                    <span className="badge">Issue #{entry.issueId}</span>
                    <span className="badge">Versão {entry.version}</span>
                  </div>
                </div>
                <p className="history-transition">
                  {statusLabels[entry.previousStatus] ?? entry.previousStatus}
                  {' → '}
                  {statusLabels[entry.newStatus] ?? entry.newStatus}
                </p>
                <p className="history-justification">{entry.justification}</p>
                <p className="history-meta">
                  {entry.actorId} · {entry.actorRole} · {new Date(entry.timestamp).toLocaleString('pt-BR')}
                </p>
                <Link className="text-link" href={`/issues/${entry.issueId}`}>
                  Abrir issue
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
