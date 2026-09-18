import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const STATUS = [
  { value: 'open', label: 'פתוח' },
  { value: 'in_progress', label: 'בביצוע' },
  { value: 'done', label: 'הושלם' },
];

// Predefined people responsible for tasks; "אחר" lets the admin type a new name.
const OWNERS = [
  'ערן רביב',
  'אייל כהן',
  'עודד טהורי',
  'דן שקרק',
  'ענבר הרבסט',
  'דור לוי',
  'לי איתן ברק',
  'יעל',
  'מתן ניצן',
  'מיטל נועם',
];
const OTHER = '__other__';

const todayStr = () => new Date().toISOString().slice(0, 10);

function isOverdue(t) {
  return t.status !== 'done' && t.due_date && t.due_date.slice(0, 10) < todayStr();
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban'); // kanban | table
  const [ownerFilter, setOwnerFilter] = useState('');
  const [editing, setEditing] = useState(null); // task or {} for new
  const [toast, setToast] = useState('');

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2400);
  };

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/api/tasks');
      setTasks(res.tasks);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function setStatus(id, status) {
    await api.patch(`/api/tasks/${id}`, { status });
    load();
  }
  async function remove(id) {
    if (!window.confirm('למחוק את המשימה?')) return;
    await api.del(`/api/tasks/${id}`);
    showToast('נמחק');
    load();
  }

  // Distinct responsible people (owner is free text, may combine names).
  const owners = [...new Set(tasks.map((t) => t.owner).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'he')
  );
  const visibleTasks = ownerFilter ? tasks.filter((t) => t.owner === ownerFilter) : tasks;
  const overdueCount = visibleTasks.filter(isOverdue).length;

  return (
    <div>
      <h1>משימות</h1>
      <div className="toolbar">
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
          <option value="">כל האחראים</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {overdueCount > 0 && (
          <span className="overdue">⚠ {overdueCount} משימות באיחור</span>
        )}
        <span className="spacer" />
        <button
          className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setView('kanban')}
        >
          לוח
        </button>
        <button
          className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setView('table')}
        >
          טבלה
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => setEditing({})}>
          + משימה
        </button>
      </div>

      {loading ? (
        <div className="loading">טוען…</div>
      ) : view === 'kanban' ? (
        <div className="kanban">
          {STATUS.map((col) => (
            <div className="kanban-col" key={col.value}>
              <h3>
                {col.label} · {visibleTasks.filter((t) => t.status === col.value).length}
              </h3>
              {visibleTasks
                .filter((t) => t.status === col.value)
                .map((t) => (
                  <div className="kanban-card" key={t.id}>
                    <div className="owner">{t.owner}</div>
                    <div style={{ margin: '6px 0' }}>{t.title}</div>
                    <div className={`due ${isOverdue(t) ? 'overdue' : ''}`}>
                      {t.due_date_text || t.due_date || '—'}
                      {isOverdue(t) && ' ⚠'}
                    </div>
                    <div className="row" style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)}>
                        {STATUS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-sm btn-ghost" onClick={() => setEditing(t)}>
                        עריכה
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(t.id)}>
                        מחיקה
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>אחריות לביצוע</th>
                <th>משימה</th>
                <th>סטטוס</th>
                <th>מועד</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.owner}</td>
                  <td>{t.title}</td>
                  <td>
                    <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)}>
                      {STATUS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={isOverdue(t) ? 'overdue' : ''}>
                    {t.due_date_text || t.due_date || '—'}
                    {isOverdue(t) && ' ⚠'}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditing(t)}>
                      עריכה
                    </button>{' '}
                    <button className="btn btn-sm btn-danger" onClick={() => remove(t.id)}>
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <TaskModal
          task={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            showToast('נשמר');
            load();
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function TaskModal({ task, onClose, onSaved }) {
  const isNew = !task.id;
  const [form, setForm] = useState({
    title: task.title || '',
    status: task.status || 'open',
    due_date: task.due_date ? task.due_date.slice(0, 10) : '',
    due_date_text: task.due_date_text || '',
    notes: task.notes || '',
  });
  // Owner: a value from OWNERS, or OTHER with a free-text name.
  const ownerInList = task.owner && OWNERS.includes(task.owner);
  const [ownerSelect, setOwnerSelect] = useState(
    task.owner ? (ownerInList ? task.owner : OTHER) : ''
  );
  const [customOwner, setCustomOwner] = useState(ownerInList ? '' : task.owner || '');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    const owner = ownerSelect === OTHER ? customOwner.trim() : ownerSelect;
    if (!owner || !form.title.trim()) {
      setErr('יש למלא אחריות לביצוע ומשימה');
      return;
    }
    const payload = {
      owner,
      title: form.title,
      status: form.status,
      due_date: form.due_date || null,
      due_date_text: form.due_date_text || null,
      notes: form.notes || null,
    };
    try {
      if (isNew) await api.post('/api/tasks', payload);
      else await api.patch(`/api/tasks/${task.id}`, payload);
      onSaved();
    } catch {
      setErr('שגיאה בשמירה');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? 'משימה חדשה' : 'עריכת משימה'}</h3>
        {err && <div className="form-error">{err}</div>}
        <div className="field">
          <label>אחריות לביצוע *</label>
          <select value={ownerSelect} onChange={(e) => setOwnerSelect(e.target.value)}>
            <option value="">בחר/י אחראי/ת…</option>
            {OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            <option value={OTHER}>אחר…</option>
          </select>
          {ownerSelect === OTHER && (
            <input
              type="text"
              style={{ marginTop: 8 }}
              placeholder="שם האחראי/ת"
              value={customOwner}
              onChange={(e) => setCustomOwner(e.target.value)}
              autoFocus
            />
          )}
        </div>
        <div className="field">
          <label>משימה *</label>
          <textarea value={form.title} onChange={set('title')} />
        </div>
        <div className="field">
          <label>סטטוס</label>
          <select value={form.status} onChange={set('status')}>
            {STATUS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>מועד לביצוע (תאריך)</label>
          <input type="date" value={form.due_date} onChange={set('due_date')} />
        </div>
        <div className="field">
          <label>מועד — טקסט חופשי (אם אין תאריך מדויק)</label>
          <input type="text" value={form.due_date_text} onChange={set('due_date_text')} placeholder="למשל: עבור הכנס 20.10" />
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={save}>
            שמירה
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
