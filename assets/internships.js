(() => {
  const cfg = window.APP_CONFIG;
  const box = document.getElementById('list');
  if (!cfg || !box) return;

  const rupees = p => '₹' + (p / 100).toLocaleString('en-IN');
  const fmt = d => d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-';

  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    n.textContent = text;
    return n;
  };

  const card = r => {
    const a = document.createElement('article');
    a.className = 'card';
    a.append(
      el('h3', r.title),
      el('p', `Vishay: ${r.domain}`),
      el('p', `Avadhi: ${r.duration_weeks} hafte (${r.total_hours ?? '-'} ghante)`),
      el('p', `Mode: ${r.mode}`),
      el('p', `Credits: ${r.credits ?? '-'}`),
      el('p', `Batch: ${fmt(r.issue_date)} se ${fmt(r.expiry_date)}`),
      el('p', `Fee: ${rupees(r.fee_paise)}`)
    );
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = 'contact.html';
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
      const res = await fetch(url, { headers: { apikey: cfg.SUPABASE_ANON_KEY } });
      if (!res.ok) throw new Error('http ' + res.status);
      const rows = await res.json();
      if (!rows.length) {
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
