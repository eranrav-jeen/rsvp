import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';
import OwnerSelect from '../../components/OwnerSelect.jsx';
import ByOrgSection from '../../components/ByOrgSection.jsx';

const STATUS_OPTIONS = [
  { value: 'not_invited', label: 'טרם הוזמן' },
  { value: 'invited', label: 'הוזמן' },
  { value: 'pending', label: 'ממתין לאישור' },
  { value: 'confirmed', label: 'אושר' },
  { value: 'speaker', label: 'מרצה/ת' },
  { value: 'maybe', label: 'אולי' },
  { value: 'waitlist', label: 'רשימת המתנה' },
  { value: 'declined', label: 'לא יגיע' },
  { value: 'no_response', label: 'ללא מענה' },
];

const FILE_IMPORT_HELP =
  'מבנה נדרש: קובץ CSV/XLSX עם עמודות "משרד" ו-"כתובת מייל" (אופציונלי: שם, תפקיד, טלפון). שורה עם שם במקום מייל תיובא עם מייל ריק ותסומן להשלמה.';
const MAILLIST_IMPORT_HELP =
  'הדביקו רשימת תפוצה מהמייל בפורמט: "שם" <email>; "שם" <email> (מופרד בפסיק־נקודה, פסיק או שורות). הארגון יזוהה אוטומטית מהדומיין (למשל digital.gov.il → digital).';
const VCARD_IMPORT_HELP =
  'בחרו קובץ vCard (.vcf) ששותף בוואטסאפ (שיתוף איש קשר → שמירה/שיתוף כקובץ), או הדביקו את תוכנו. ניתן לבחור כמה קבצים יחד. שם, ארגון, מייל וטלפון יזוהו אוטומטית; כפילויות (לפי מייל/טלפון) ידולגו.';

export default function Invitees() {
  const [data, setData] = useState({ invitees: [], summary: null });
  const [byOrg, setByOrg] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [excludeJeen, setExcludeJeen] = useState(false);
  const [excludeSpeakers, setExcludeSpeakers] = useState(false);
  const [toast, setToast] = useState('');
  const [editInvitee, setEditInvitee] = useState(null); // null | {} (new) | invitee (edit)
  const [showMaillist, setShowMaillist] = useState(false);
  const [showVcard, setShowVcard] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const fileRef = useRef();

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2800);
  };

  function openBcc() {
    if (!data.invitees.some((r) => (r.email || '').trim())) {
      showToast('אין כתובות מייל ברשימה הנוכחית');
      return;
    }
    setShowBcc(true);
  }

  // Mark a batch of invitees as emailed (outreach_email = true), update the rows
  // in place and refresh the dashboard counters. Returns how many were updated.
  async function markEmailed(ids) {
    if (!ids || ids.length === 0) return 0;
    try {
      const res = await api.post('/api/invitees/mark-outreach', { ids, channel: 'email' });
      const idSet = new Set(ids);
      setData((d) => ({
        ...d,
        invitees: d.invitees.map((r) =>
          idSet.has(r.id)
            ? { ...r, outreach_email: true, status: r.status === 'not_invited' ? 'invited' : r.status }
            : r
        ),
      }));
      refreshStats();
      return res.updated ?? ids.length;
    } catch {
      showToast('שגיאה בסימון הנמענים');
      return 0;
    }
  }

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    if (excludeJeen) params.set('exclude_jeen', '1');
    if (excludeSpeakers) params.set('exclude_speakers', '1');
    try {
      const [res, stats, evt] = await Promise.all([
        api.get(`/api/invitees?${params.toString()}`),
        api.get('/api/invitees/stats/by-org'),
        api.get('/api/event-settings'),
      ]);
      setData(res);
      setByOrg(stats.orgs || []);
      setSettings(evt);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, excludeJeen, excludeSpeakers]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Replace one row in place (keeps scroll position / no spinner).
  function applyRow(invitee) {
    setData((d) => ({ ...d, invitees: d.invitees.map((r) => (r.id === invitee.id ? invitee : r)) }));
  }

  // Silently refresh the summary counters + org chart without reloading the list.
  async function refreshStats() {
    try {
      const params = new URLSearchParams();
      if (excludeJeen) params.set('exclude_jeen', '1');
      if (excludeSpeakers) params.set('exclude_speakers', '1');
      const [inv, stats] = await Promise.all([
        api.get(`/api/invitees?${params.toString()}`),
        api.get('/api/invitees/stats/by-org'),
      ]);
      setData((d) => ({ ...d, summary: inv.summary }));
      setByOrg(stats.orgs || []);
    } catch {
      /* leave existing stats */
    }
  }

  async function updateInvitee(id, patch) {
    // Whether this change can move the dashboard numbers.
    const affectsCounts = 'status' in patch || 'plus_ones' in patch;
    try {
      const res = await api.patch(`/api/invitees/${id}`, patch);
      if (res && res.invitee) applyRow(res.invitee);
      if (affectsCounts) refreshStats();
      showToast('נשמר');
    } catch (err) {
      if (err.status === 409 && err.data?.error === 'over_capacity') {
        const ok = window.confirm(`${err.data.message}\n\nלהמשיך בכל זאת?`);
        if (ok) {
          const res = await api.patch(`/api/invitees/${id}`, { ...patch, force: true });
          if (res && res.invitee) applyRow(res.invitee);
          refreshStats();
          showToast('אושר (מעל המכסה)');
        }
      } else {
        showToast('שגיאה בשמירה');
      }
    }
  }

  async function deleteInvitee(inv) {
    const who = inv.full_name || inv.email || inv.organization || 'המוזמן/ת';
    if (!window.confirm(`למחוק את "${who}" לצמיתות?\n\nלא ניתן לשחזר פעולה זו.`)) return;
    try {
      await api.del(`/api/invitees/${inv.id}`);
      setData((d) => ({ ...d, invitees: d.invitees.filter((r) => r.id !== inv.id) }));
      refreshStats();
      showToast('נמחק');
    } catch {
      showToast('שגיאה במחיקה');
    }
  }

  async function toggleApproval(val) {
    try {
      const res = await api.patch('/api/event-settings', { approval_required: val });
      setSettings((s) => ({ ...(s || {}), ...res }));
      showToast(val ? 'הרשמות ידרשו אישור מנהל' : 'הרשמות יאושרו אוטומטית');
    } catch {
      showToast('שגיאה בעדכון ההגדרה');
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
      <h1>ניהול הזמנות</h1>

      {s && (
        <div className="counters">
          <Counter cls="" num={s.total_invitees} lbl="מספר מוזמנים פוטנציאלי" />
          <Counter cls="" num={s.not_invited} lbl="טרם הוזמנו" />
          <Counter cls="" num={s.invited} lbl="הוזמנו" />
          <Counter cls="pending" num={s.pending} lbl="ממתינים לאישור" />
          <Counter cls="confirmed" num={s.confirmed} lbl="אושרה השתתפות" />
          <Counter cls="confirmed" num={s.speaker} lbl="מרצים/ות" />
          <Counter cls="" num={s.maybe} lbl="אולי" />
          <Counter cls="waitlist" num={s.waitlist} lbl="רשימת המתנה" />
          <Counter cls="declined" num={s.declined} lbl="סימנו שלא יגיעו" />
          <Counter cls="" num={s.no_response} lbl="ללא מענה" />
          <div className={`counter cap ${s.confirmed_seats >= s.max_attendees ? 'full' : ''}`}>
            <div className="num">
              {s.confirmed_seats} / {s.max_attendees}
            </div>
            <div className="lbl">משתתפים צפויים מול המכסה</div>
          </div>
        </div>
      )}

      {s && (
        <div className="outreach-stats">
          <div className="outreach-stats-head">
            פניות שבוצעו
            <span className="muted"> · ניתן לפנות ביותר מערוץ אחד, ולכן הסכום עשוי לעלות על מספר המוזמנים</span>
          </div>
          <div className="outreach-cards">
            <div className="ostat">
              <span className="ostat-ico">📧</span>
              <span className="ostat-num">{s.outreach_email}</span>
              <span className="ostat-lbl">הוזמנו במייל</span>
            </div>
            <div className="ostat">
              <span className="ostat-ico">💬</span>
              <span className="ostat-num">{s.outreach_whatsapp}</span>
              <span className="ostat-lbl">הוזמנו בוואטסאפ</span>
            </div>
            <div className="ostat">
              <span className="ostat-ico">📞</span>
              <span className="ostat-num">{s.outreach_call}</span>
              <span className="ostat-lbl">הוזמנו בשיחה טלפונית</span>
            </div>
          </div>
        </div>
      )}

      <div className="exclude-bar">
        <span className="exclude-label">אל תכלול בספירה:</span>
        <label className="exclude-opt">
          <input
            type="checkbox"
            checked={excludeJeen}
            onChange={(e) => setExcludeJeen(e.target.checked)}
          />
          <span>עובדי Jeen</span>
        </label>
        <label className="exclude-opt">
          <input
            type="checkbox"
            checked={excludeSpeakers}
            onChange={(e) => setExcludeSpeakers(e.target.checked)}
          />
          <span>מרצים/ות</span>
        </label>
      </div>

      {settings && (
        <div className="settings-bar">
          <label className="switch-row">
            <input
              type="checkbox"
              checked={!!settings.approval_required}
              onChange={(e) => toggleApproval(e.target.checked)}
            />
            <span>הרשמות דורשות אישור מנהל</span>
          </label>
          <span className="muted" style={{ fontSize: 13 }}>
            {settings.approval_required
              ? 'הרשמה "כן" נכנסת כ"ממתין לאישור" עד לאישורכם.'
              : 'הרשמה "כן" מאושרת אוטומטית (עד למכסה).'}
          </span>
        </div>
      )}

      <div className="toolbar">
        <input
          type="text"
          placeholder="חיפוש לפי ארגון / שם / מייל / תפקיד"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 240 }}
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
        <button className="btn btn-sm btn-ghost" onClick={() => setEditInvitee({})}>
          + הוספת מוזמן
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => setShowMaillist(true)}
          title={MAILLIST_IMPORT_HELP}
        >
          ייבוא מרשימת תפוצה
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => setShowVcard(true)}
          title={VCARD_IMPORT_HELP}
        >
          ייבוא איש קשר (WhatsApp)
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => fileRef.current?.click()}
          title={FILE_IMPORT_HELP}
        >
          ייבוא CSV/XLSX
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
        <button
          className="btn btn-sm btn-ghost"
          onClick={openBcc}
          title="העתקת כל כתובות המייל ברשימה הנוכחית, מופרדות בפסיקים, להדבקה בשדה Bcc"
        >
          מיילים ל-Bcc
        </button>
        <a className="btn btn-sm btn-primary" href="/api/invitees/export">
          ייצוא XLSX
        </a>
        <a className="btn btn-sm btn-ghost" href="/api/invitees/survey-export">
          ייצוא סקר
        </a>
      </div>

      <ByOrgSection orgs={byOrg} />

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
                <th>אחראי/ת הזמנה</th>
                <th>פניות</th>
                <th>מקור</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.invitees.map((inv) => (
                <InviteeRow
                  key={inv.id}
                  inv={inv}
                  onUpdate={updateInvitee}
                  onEdit={(row) => setEditInvitee(row)}
                  onDelete={deleteInvitee}
                />
              ))}
              {data.invitees.length === 0 && (
                <tr>
                  <td colSpan={10} className="center muted" style={{ padding: 30 }}>
                    לא נמצאו מוזמנים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editInvitee && (
        <InviteeModal
          invitee={editInvitee}
          onClose={() => setEditInvitee(null)}
          onSaved={(msg) => {
            setEditInvitee(null);
            showToast(msg);
            load();
          }}
        />
      )}
      {showMaillist && (
        <MaillistModal
          helpText={MAILLIST_IMPORT_HELP}
          onClose={() => setShowMaillist(false)}
          onImported={(res) => {
            setShowMaillist(false);
            showToast(`יובאו ${res.imported} · דילוג ${res.skipped} כפולים · ${res.invalid} לא תקינים`);
            load();
          }}
        />
      )}
      {showVcard && (
        <VcardModal
          helpText={VCARD_IMPORT_HELP}
          onClose={() => setShowVcard(false)}
          onImported={(res) => {
            setShowVcard(false);
            showToast(`יובאו ${res.imported} מתוך ${res.found} · דילוג ${res.skipped} כפולים`);
            load();
          }}
        />
      )}
      {showBcc && (
        <BccModal
          invitees={data.invitees}
          onClose={() => setShowBcc(false)}
          onCopied={showToast}
          markEmailed={markEmailed}
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

function InviteeRow({ inv, onUpdate, onEdit, onDelete }) {
  const [phone, setPhone] = useState(inv.phone || '');

  return (
    <tr>
      <td className="col-org" title={inv.organization}>{inv.organization}</td>
      <td className="col-name" title={inv.full_name || ''}>
        {inv.full_name || <span className="muted">—</span>}
      </td>
      <td className="col-role" title={inv.role || ''}>
        {inv.role || <span className="muted">—</span>}
      </td>
      <td className="col-email" dir="ltr" style={{ textAlign: 'left' }} title={inv.email || ''}>
        {inv.email || <span className="flag">⚑ חסר מייל</span>}
      </td>
      <td dir="ltr" style={{ textAlign: 'left' }}>
        <div className="phone-edit">
          <input
            type="tel"
            dir="ltr"
            className="phone-cell"
            placeholder="—"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (phone || '') !== (inv.phone || '')) {
                onUpdate(inv.id, { phone });
              }
            }}
          />
          {(phone || '') !== (inv.phone || '') && (
            <button
              type="button"
              className="phone-ok"
              title="שמירת הטלפון"
              onClick={() => onUpdate(inv.id, { phone })}
            >
              ✓
            </button>
          )}
        </div>
      </td>
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
        <OwnerSelect
          value={inv.invited_by}
          onChange={(invited_by) => onUpdate(inv.id, { invited_by })}
          placeholder="—"
        />
      </td>
      <td>
        <div className="outreach">
          <button
            type="button"
            className={`ob ${inv.outreach_email ? 'on' : ''}`}
            title="פנייה במייל"
            onClick={() => onUpdate(inv.id, { outreach_email: !inv.outreach_email })}
          >
            📧
          </button>
          <button
            type="button"
            className={`ob ${inv.outreach_whatsapp ? 'on' : ''}`}
            title="פנייה בוואטסאפ"
            onClick={() => onUpdate(inv.id, { outreach_whatsapp: !inv.outreach_whatsapp })}
          >
            💬
          </button>
          <button
            type="button"
            className={`ob ${inv.outreach_call ? 'on' : ''}`}
            title="פנייה בטלפון"
            onClick={() => onUpdate(inv.id, { outreach_call: !inv.outreach_call })}
          >
            📞
          </button>
        </div>
      </td>
      <td>
        <span className="muted" style={{ fontSize: 12 }}>{inv.source}</span>
      </td>
      <td>
        <div className="row-actions">
          {inv.status === 'pending' && (
            <>
              <button
                className="btn btn-sm btn-primary"
                title="אישור הבקשה"
                onClick={() => onUpdate(inv.id, { status: 'confirmed' })}
              >
                אשר
              </button>
              <button
                className="btn btn-sm btn-danger"
                title="דחיית הבקשה"
                onClick={() => onUpdate(inv.id, { status: 'declined' })}
              >
                דחה
              </button>
            </>
          )}
          <button className="btn btn-sm btn-ghost" onClick={() => onEdit(inv)}>
            עריכה
          </button>
          <button
            type="button"
            className="row-del"
            title="מחיקת המוזמן/ת"
            aria-label="מחיקה"
            onClick={() => onDelete(inv)}
          >
            🗑
          </button>
        </div>
      </td>
    </tr>
  );
}

function InviteeModal({ invitee, onClose, onSaved }) {
  const isNew = !invitee || !invitee.id;
  const [form, setForm] = useState({
    organization: invitee?.organization || '',
    full_name: invitee?.full_name || '',
    role: invitee?.role || '',
    email: invitee?.email || '',
    phone: invitee?.phone || '',
    status: invitee?.status || 'not_invited',
    plus_ones: invitee?.plus_ones ?? 0,
    invited_by: invitee?.invited_by || '',
    notes: invitee?.notes || '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.organization.trim()) {
      setErr('ארגון הוא שדה חובה');
      return;
    }
    const payload = { ...form, plus_ones: Number(form.plus_ones) || 0 };
    setBusy(true);
    try {
      if (isNew) {
        await api.post('/api/invitees', payload);
        onSaved('מוזמן נוסף');
      } else {
        try {
          await api.patch(`/api/invitees/${invitee.id}`, payload);
          onSaved('נשמר');
        } catch (e) {
          if (e.status === 409 && e.data?.error === 'over_capacity') {
            if (window.confirm(`${e.data.message}\n\nלהמשיך בכל זאת?`)) {
              await api.patch(`/api/invitees/${invitee.id}`, { ...payload, force: true });
              onSaved('נשמר (מעל המכסה)');
            }
          } else {
            throw e;
          }
        }
      }
    } catch {
      setErr('שגיאה בשמירה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? 'הוספת מוזמן' : 'עריכת מוזמן'}</h3>
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
        <div className="field">
          <label>מלווים</label>
          <input type="number" min="0" max="20" value={form.plus_ones} onChange={set('plus_ones')} />
        </div>
        <div className="field">
          <label>אחראי/ת הזמנה</label>
          <OwnerSelect
            value={form.invited_by}
            onChange={(v) => setForm((f) => ({ ...f, invited_by: v }))}
            placeholder="בחר/י…"
          />
        </div>
        <div className="field">
          <label>הערות</label>
          <textarea value={form.notes} onChange={set('notes')} />
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'שומר…' : 'שמירה'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

function BccModal({ invitees, onClose, onCopied, markEmailed }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [onlyNew, setOnlyNew] = useState(false); // exclude already-emailed
  const [doMark, setDoMark] = useState(true); // mark as emailed on copy
  const [sep, setSep] = useState(';'); // ';' for Outlook, ',' for Gmail etc.
  const [busy, setBusy] = useState(false);
  const areaRef = useRef();

  const fromTs = from ? new Date(from).getTime() : null;
  const toTs = to ? new Date(to).getTime() : null;

  // Filter by last-update time (updated_at >= created_at), so records that were
  // added earlier but changed later (e.g. an email filled in) fall into the
  // window too.
  function inRange(r) {
    const stamp = r.updated_at || r.created_at;
    const t = stamp ? new Date(stamp).getTime() : null;
    if (fromTs != null && (t == null || t < fromTs)) return false;
    if (toTs != null && (t == null || t > toTs)) return false;
    return true;
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const rangeRows = invitees.filter(inRange);
  const withEmail = rangeRows.filter(
    (r) => (r.email || '').trim() && (!onlyNew || !r.outreach_email)
  );
  // Only genuine, well-formed addresses (skips e.g. a phone number typed into
  // the email column).
  const matched = withEmail.filter((r) => EMAIL_RE.test(r.email.trim()));
  const seen = new Set();
  const uniqueRows = matched.filter((r) => {
    const e = r.email.trim().toLowerCase();
    if (seen.has(e)) return false;
    seen.add(e);
    return true;
  });
  const emails = uniqueRows.map((r) => r.email.trim().toLowerCase());
  const text = emails.join(`${sep} `);
  const ids = matched.map((r) => r.id); // mark every matched row (incl. dup emails)
  const noEmail = rangeRows.filter((r) => !(r.email || '').trim()).length;
  const invalidCount = withEmail.length - matched.length; // non-email junk
  const dupCount = matched.length - emails.length; // rows sharing an address

  async function copy() {
    if (emails.length === 0) return;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      if (areaRef.current) {
        areaRef.current.focus();
        areaRef.current.select();
      }
    }
    let markMsg = '';
    if (doMark) {
      const n = await markEmailed(ids);
      markMsg = ` · סומנו ${n} כהוזמנו במייל`;
    }
    setBusy(false);
    onCopied(`הועתקו ${emails.length} כתובות${markMsg}`);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>מיילים ל-Bcc · {emails.length} כתובות</h3>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          כתובות המייל ברשימה הנוכחית, מופרדות בפסיקים, להדבקה בשדה ה-Bcc. אפשר לצמצם
          לטווח תאריכים (לפי מועד <b>עדכון</b> הרשומה — כולל רשומות שנוספו קודם ועודכנו
          מאוחר יותר) כדי לשלוח ולעקוב אחר מנה מסוימת.
        </p>

        <div className="bcc-range">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>מתאריך/שעה</label>
            <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>עד תאריך/שעה</label>
            <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <label className="bcc-check">
          <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
          <span>רק מי שעדיין לא סומן כ"הוזמן במייל"</span>
        </label>
        <label className="bcc-check">
          <input type="checkbox" checked={doMark} onChange={(e) => setDoMark(e.target.checked)} />
          <span>לסמן את הנמענים כ"הוזמנו במייל" (ולעדכן סטטוס ל"הוזמן")</span>
        </label>

        <div className="bcc-sep">
          <span className="muted" style={{ fontSize: 13 }}>מפריד:</span>
          <label className="bcc-check" style={{ margin: 0 }}>
            <input type="radio" name="bcc-sep" checked={sep === ';'} onChange={() => setSep(';')} />
            <span>נקודה-פסיק ; (Outlook)</span>
          </label>
          <label className="bcc-check" style={{ margin: 0 }}>
            <input type="radio" name="bcc-sep" checked={sep === ','} onChange={() => setSep(',')} />
            <span>פסיק , (Gmail וכו׳)</span>
          </label>
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <textarea
            ref={areaRef}
            dir="ltr"
            readOnly
            style={{ minHeight: 130, textAlign: 'left', fontSize: 13 }}
            value={text}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
          <b>{emails.length}</b> כתובות ייחודיות
          {dupCount > 0 && <> · {dupCount} כפולות אוחדו</>}
          {invalidCount > 0 && <> · {invalidCount} לא תקינות דולגו</>}
          {noEmail > 0 && <> · {noEmail} ללא כתובת מייל</>}
        </p>

        <div className="actions">
          <button className="btn btn-primary" onClick={copy} disabled={busy || emails.length === 0}>
            {busy ? 'מעתיק…' : doMark ? 'העתקה וסימון' : 'העתקה ללוח'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}

function VcardModal({ onClose, onImported, helpText }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fileNames, setFileNames] = useState([]);
  const vcfRef = useRef();

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setErr('');
    try {
      const texts = await Promise.all(files.map((f) => f.text()));
      const combined = texts.join('\n');
      // Append to whatever is already in the box (so multiple picks accumulate).
      setText((t) => (t.trim() ? `${t}\n${combined}` : combined));
      setFileNames((n) => [...n, ...files.map((f) => f.name)]);
    } catch {
      setErr('לא ניתן לקרוא את הקובץ');
    } finally {
      if (vcfRef.current) vcfRef.current.value = '';
    }
  }

  async function submit() {
    if (!/BEGIN:VCARD/i.test(text)) {
      setErr('נא לבחור קובץ vCard (.vcf) או להדביק כרטיס קשר שמתחיל ב-BEGIN:VCARD');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/api/invitees/import-vcard', { text });
      onImported(res);
    } catch {
      setErr('שגיאה בייבוא');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>ייבוא איש קשר מוואטסאפ</h3>
        {err && <div className="form-error">{err}</div>}
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>{helpText}</p>

        <div className="field">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => vcfRef.current?.click()}
            style={{ width: '100%' }}
          >
            📇 בחירת קובץ vCard (.vcf)
          </button>
          <input
            ref={vcfRef}
            type="file"
            accept=".vcf,text/vcard,text/x-vcard"
            multiple
            style={{ display: 'none' }}
            onChange={handleFiles}
          />
          {fileNames.length > 0 && (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              נבחרו: {fileNames.join(', ')}
            </p>
          )}
        </div>

        <p className="muted" style={{ fontSize: 12, margin: '4px 0' }}>
          או הדביקו את תוכן הכרטיס ידנית:
        </p>
        <div className="field">
          <textarea
            dir="ltr"
            style={{ minHeight: 140, textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}
            placeholder={'BEGIN:VCARD\nVERSION:3.0\nFN:משה ליבוביץ\nORG:נתיבי ישראל\nitem1.TEL;waid=972504400485:+972 50-440-0485\nitem2.EMAIL:moshel@iroads.co.il\nEND:VCARD'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'מייבא…' : 'ייבוא'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

function MaillistModal({ onClose, onImported, helpText }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!text.trim()) {
      setErr('נא להדביק רשימת תפוצה');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/api/invitees/import-maillist', { text });
      onImported(res);
    } catch {
      setErr('שגיאה בייבוא');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>ייבוא מרשימת תפוצה</h3>
        {err && <div className="form-error">{err}</div>}
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>{helpText}</p>
        <div className="field">
          <textarea
            dir="ltr"
            style={{ minHeight: 150, textAlign: 'left' }}
            placeholder={'"Yaron Klaiman" <YaronK@digital.gov.il>; "Dana Magnezi" <dana@jeen.ai>; ...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'מייבא…' : 'ייבוא'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
