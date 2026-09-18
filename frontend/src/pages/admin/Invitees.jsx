import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';

const STATUS_OPTIONS = [
  { value: 'not_invited', label: 'טרם הוזמן' },
  { value: 'invited', label: 'הוזמן' },
  { value: 'confirmed', label: 'אישר' },
  { value: 'maybe', label: 'אולי' },
  { value: 'waitlist', label: 'רשימת המתנה' },
  { value: 'declined', label: 'סירב' },
  { value: 'no_response', label: 'ללא מענה' },
];
export default function Invitees() {
  const [data, setData] = useState({ invitees: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef();

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2600);
  };

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    try {
      const res = await api.get(`/api/invitees?${params.toString()}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function updateInvitee(id, patch, opts = {}) {
    try {
      await api.patch(`/api/invitees/${id}`, patch);
      showToast('נשמר');
      load();
    } catch (err) {
      if (err.status === 409 && err.data?.error === 'over_capacity') {
        const ok = window.confirm(`${err.data.message}\n\nלהמשיך בכל זאת?`);
        if (ok) {
          await api.patch(`/api/invitees/${id}`, { ...patch, force: true });
          showToast('אושר (מעל המכסה)');
          load();
        }
      } else {
        showToast('שגיאה בשמירה');
      }
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.postForm('/api/invitees/import', fd);
      showToast(`יובאו ${res.imported} מוזמנים (${res.flagged} ללא מייל)`);
      load();
    } catch {
      showToast('שגיאה בייבוא');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const s = data.summary;

  return (
    <div>
      <h1>מוזמנים</h1>

      {s && (
        <div className="counters">
          <Counter cls="" num={s.total_invitees} lbl="סה״כ מוזמנים" />
          <Counter cls="" num={s.not_invited} lbl="טרם הוזמנו" />
          <Counter cls="" num={s.invited} lbl="הוזמנו" />
          <Counter cls="confirmed" num={s.confirmed} lbl="אישרו" />
          <Counter cls="" num={s.maybe} lbl="אולי" />
          <Counter cls="waitlist" num={s.waitlist} lbl="רשימת המתנה" />
          <Counter cls="declined" num={s.declined} lbl="סירבו" />
          <Counter cls="" num={s.no_response} lbl="ללא מענה" />
          <div className={`counter cap ${s.confirmed_seats >= s.max_attendees ? 'full' : ''}`}>
            <div className="num">
              {s.confirmed_seats} / {s.max_attendees}
            </div>
            <div className="lbl">משתתפים צפויים מול המכסה</div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <input
          type="text"
          placeholder="חיפוש לפי ארגון / שם / מייל / תפקיד"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 260 }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">כל הסטטוסים</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="spacer" />
        <button className="btn btn-sm btn-ghost" onClick={() => setShowAdd(true)}>
          + הוספת מוזמן
        </button>
        <button className="btn btn-sm btn-ghost" onClick={() => fileRef.current?.click()}>
          ייבוא CSV/XLSX
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
        <a className="btn btn-sm btn-primary" href="/api/invitees/export">
          ייצוא XLSX
        </a>
        <a className="btn btn-sm btn-ghost" href="/api/invitees/survey-export">
          ייצוא סקר
        </a>
      </div>

      {loading ? (
        <div className="loading">טוען…</div>
      ) : (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>ארגון</th>
                <th>שם</th>
                <th>תפקיד</th>
                <th>מייל</th>
                <th>טלפון</th>
                <th>סטטוס</th>
                <th>מלווים</th>
                <th>מקור</th>
                <th>הערות</th>
              </tr>
            </thead>
            <tbody>
              {data.invitees.map((inv) => (
                <InviteeRow key={inv.id} inv={inv} onUpdate={updateInvitee} />
              ))}
              {data.invitees.length === 0 && (
                <tr>
                  <td colSpan={9} className="center muted" style={{ padding: 30 }}>
                    לא נמצאו מוזמנים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddInviteeModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            showToast('מוזמן נוסף');
            load();
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Counter({ cls, num, lbl }) {
  return (
    <div className={`counter ${cls}`}>
      <div className="num">{num}</div>
      <div className="lbl">{lbl}</div>
    </div>
  );
}

function InviteeRow({ inv, onUpdate }) {
  const [notes, setNotes] = useState(inv.notes || '');
  const [plusOnes, setPlusOnes] = useState(inv.plus_ones);
  const needsEmail = !inv.email;

  return (
    <tr>
      <td>{inv.organization}</td>
      <td>{inv.full_name || <span className="muted">—</span>}</td>
      <td>{inv.role || <span className="muted">—</span>}</td>
      <td dir="ltr" style={{ textAlign: 'left' }}>
        {inv.email || <span className="flag">⚑ חסר מייל</span>}
      </td>
      <td dir="ltr" style={{ textAlign: 'left' }}>{inv.phone || ''}</td>
      <td>
        <select value={inv.status} onChange={(e) => onUpdate(inv.id, { status: e.target.value })}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="number"
          min="0"
          max="20"
          style={{ width: 56 }}
          value={plusOnes}
          onChange={(e) => setPlusOnes(e.target.value)}
          onBlur={() => {
            if (String(plusOnes) !== String(inv.plus_ones)) {
              onUpdate(inv.id, { plus_ones: Number(plusOnes) || 0 });
            }
          }}
        />
      </td>
      <td>
        <span className="muted" style={{ fontSize: 12 }}>{inv.source}</span>
      </td>
      <td>
        <input
          type="text"
          style={{ width: 160 }}
          value={notes}
          placeholder={needsEmail ? 'חסר מייל' : ''}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if ((notes || '') !== (inv.notes || '')) onUpdate(inv.id, { notes });
          }}
        />
      </td>
    </tr>
  );
}

function AddInviteeModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    organization: '',
    full_name: '',
    role: '',
    email: '',
    phone: '',
    status: 'invited',
    plus_ones: 0,
  });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.organization.trim()) {
      setErr('ארגון הוא שדה חובה');
      return;
    }
    try {
      await api.post('/api/invitees', { ...form, plus_ones: Number(form.plus_ones) || 0 });
      onSaved();
    } catch {
      setErr('שגיאה בשמירה');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>הוספת מוזמן</h3>
        {err && <div className="form-error">{err}</div>}
        <div className="field">
          <label>ארגון *</label>
          <input type="text" value={form.organization} onChange={set('organization')} />
        </div>
        <div className="field">
          <label>שם מלא</label>
          <input type="text" value={form.full_name} onChange={set('full_name')} />
        </div>
        <div className="field">
          <label>תפקיד</label>
          <input type="text" value={form.role} onChange={set('role')} />
        </div>
        <div className="field">
          <label>מייל</label>
          <input type="email" dir="ltr" value={form.email} onChange={set('email')} />
        </div>
        <div className="field">
          <label>טלפון</label>
          <input type="tel" dir="ltr" value={form.phone} onChange={set('phone')} />
        </div>
        <div className="field">
          <label>סטטוס</label>
          <select value={form.status} onChange={set('status')}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
