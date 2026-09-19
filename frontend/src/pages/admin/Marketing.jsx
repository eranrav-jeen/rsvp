import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';

const TYPE_LABEL = {
  image: 'תמונה',
  email_text: 'נוסח מייל',
  whatsapp_text: 'נוסח וואטסאפ',
  other: 'אחר',
};

export default function Marketing() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [editingText, setEditingText] = useState(null); // null | {} (new) | asset (edit)
  const imgRef = useRef();

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2400);
  };

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/api/marketing');
      setAssets(res.assets);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function uploadImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const title = window.prompt('כותרת לתמונה:', file.name);
    if (title === null) {
      if (imgRef.current) imgRef.current.value = '';
      return;
    }
    const fd = new FormData();
    fd.append('type', 'image');
    fd.append('title', title || file.name);
    fd.append('file', file);
    try {
      await api.postForm('/api/marketing', fd);
      showToast('התמונה הועלתה');
      load();
    } catch {
      showToast('שגיאה בהעלאה');
    } finally {
      if (imgRef.current) imgRef.current.value = '';
    }
  }

  async function remove(id) {
    if (!window.confirm('למחוק את הפריט?')) return;
    await api.del(`/api/marketing/${id}`);
    showToast('נמחק');
    load();
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('הועתק ללוח');
    } catch {
      showToast('לא ניתן להעתיק');
    }
  }

  const images = assets.filter((a) => a.type === 'image');
  const texts = assets.filter((a) => a.type !== 'image');

  return (
    <div>
      <h1>חומרי שיווק</h1>
      <div className="toolbar">
        <span className="spacer" />
        <button className="btn btn-sm btn-ghost" onClick={() => setEditingText({})}>
          + נוסח טקסט
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => imgRef.current?.click()}>
          + העלאת תמונה
        </button>
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={uploadImage}
        />
      </div>

      {loading ? (
        <div className="loading">טוען…</div>
      ) : (
        <>
          <div className="section-title">תמונות ({images.length})</div>
          {images.length === 0 ? (
            <p className="muted">עדיין לא הועלו תמונות.</p>
          ) : (
            <div className="card-grid">
              {images.map((a) => (
                <div className="asset-card" key={a.id}>
                  <img src={a.file_path} alt={a.title} />
                  <h4>{a.title}</h4>
                  <div className="row">
                    <a className="btn btn-sm btn-ghost" href={a.file_path} download target="_blank" rel="noreferrer">
                      הורדה
                    </a>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(a.id)}>
                      מחיקה
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="section-title">נוסחי טקסט ({texts.length})</div>
          {texts.length === 0 ? (
            <p className="muted">עדיין לא נוספו נוסחים.</p>
          ) : (
            <div className="card-grid">
              {texts.map((a) => (
                <div className="asset-card" key={a.id}>
                  <h4>
                    <span className={`badge ${a.type === 'email_text' ? 'done' : 'in_progress'}`}>
                      {TYPE_LABEL[a.type]}
                    </span>{' '}
                    {a.title}
                  </h4>
                  <pre>{a.body}</pre>
                  <div className="row">
                    <button className="btn btn-sm btn-primary" onClick={() => copy(a.body)}>
                      העתקה
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditingText(a)}>
                      עריכה
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(a.id)}>
                      מחיקה
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {editingText && (
        <TextTemplateModal
          asset={editingText}
          onClose={() => setEditingText(null)}
          onSaved={() => {
            setEditingText(null);
            showToast('נשמר');
            load();
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function TextTemplateModal({ asset, onClose, onSaved }) {
  const isNew = !asset || !asset.id;
  const [form, setForm] = useState({
    type: asset?.type || 'email_text',
    title: asset?.title || '',
    body: asset?.body || '',
  });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.title.trim() || !form.body.trim()) {
      setErr('יש למלא כותרת ותוכן');
      return;
    }
    try {
      if (isNew) await api.post('/api/marketing', form);
      else await api.patch(`/api/marketing/${asset.id}`, form);
      onSaved();
    } catch {
      setErr('שגיאה בשמירה');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? 'נוסח טקסט חדש' : 'עריכת נוסח טקסט'}</h3>
        {err && <div className="form-error">{err}</div>}
        <div className="field">
          <label>סוג</label>
          <select value={form.type} onChange={set('type')}>
            <option value="email_text">נוסח מייל</option>
            <option value="whatsapp_text">נוסח וואטסאפ</option>
            <option value="other">אחר</option>
          </select>
        </div>
        <div className="field">
          <label>כותרת</label>
          <input type="text" value={form.title} onChange={set('title')} placeholder="למשל: מייל — תזכורת" />
        </div>
        <div className="field">
          <label>תוכן</label>
          <textarea style={{ minHeight: 160 }} value={form.body} onChange={set('body')} />
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
