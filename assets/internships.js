(() => {
  const cfg = window.APP_CONFIG;
  const box = document.getElementById('list');
  if (!cfg || !box) return;

  const rupees = p => {
    const num = Number(p);
    if (!Number.isFinite(num)) return '-';
    if (num === 0) return 'Free';
    return '₹' + (num / 100).toLocaleString('en-IN');
  };

  const fmt = d => {
    if (!d) return '-';
    const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00+05:30` : d;
    return new Date(safeDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  };

  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    n.textContent = text;
    return n;
  };

  const card = r => {
    const a = document.createElement('article');
    a.className = 'card';

    const batchText = r.expiry_date
      ? `${fmt(r.issue_date)} se ${fmt(r.expiry_date)}`
      : `${fmt(r.issue_date)} se aage tak`;

    a.append(
      el('h3', r.title || 'Internship'),
      el('p', `Vishay: ${r.domain || '-'}`),
      el('p', `Avadhi: ${r.duration_weeks ?? '-'} hafte (${r.total_hours ?? '-'} ghante)`),
      el('p', `Mode: ${r.mode || '-'}`),
      el('p', `Credits: ${r.credits ?? '-'}`),
      el('p', `Batch: ${batchText}`),
      el('p', `Fee: ${rupees(r.fee_paise)}`)
    );

    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = `contact.html?internship=${encodeURIComponent(r.id || '')}`;
    link.textContent = 'Jankari ke liye sampark karein';
    p.append(link);
    a.append(p);
    return a;
  };

  async function load() {
    try {
      const url = `${cfg.SUPABASE_URL}/rest/v1/internships`
        + '?select=id,title,domain,duration_weeks,total_hours,credits,mode,fee_paise,issue_date,expiry_date'
        + '&is_active=eq.true&order=issue_date.asc';

      const res = await fetch(url, {
        headers: {
          apikey: cfg.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`
        }
      });

      if (!res.ok) throw new Error('http ' + res.status);
      const rows = await res.json();

      if (!Array.isArray(rows) || !rows.length) {
        box.replaceChildren(el('p', 'Abhi koi internship khuli nahi hai. Nayi batch jald aayegi.'));
        return;
      }

      box.replaceChildren(...rows.map(card));
    } catch (e) {
      box.replaceChildren(el('p', 'Internships abhi load nahi ho payi. Thodi der baad dobara try karein.'));
    }
  }

  load();
})();
