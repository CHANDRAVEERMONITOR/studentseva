(() => {
  const sb = window.sb;
  const form = document.getElementById('log-form');
  if (!sb || !form) return;

  const sel = document.getElementById('cert-select');
  const dateIn = document.getElementById('log_date');
  const act = document.getElementById('activity');
  const msg = document.getElementById('log-msg');
  const att = document.getElementById('attendance');
  const listBox = document.getElementById('log-list');
  const noCert = document.getElementById('no-cert');
  const btn = form.querySelector('button[type=submit]');

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const fmt = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const STATUS = { submitted: 'Jaanch baaki', approved: 'Manzoor', rejected: 'Asweekar' };
  let certs = [];

  const say = (t, ok) => { msg.textContent = t; msg.className = 'result ' + (ok ? 'ok' : 'bad'); msg.hidden = !t; };
  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    n.textContent = text;
    return n;
  };

  function setDateLimits() {
    const c = certs.find(x => x.id === sel.value);
    if (!c) return;
    if (c.start_date > today) {
      btn.disabled = true;
      say('Yeh batch abhi shuru nahi hui. Shuru hone par log likh sakenge.', false);
      return;
    }
    btn.disabled = false;
    say('', true);
    dateIn.min = c.start_date;
    dateIn.max = c.end_date < today ? c.end_date : today;
    if (!dateIn.value || dateIn.value < dateIn.min || dateIn.value > dateIn.max) dateIn.value = dateIn.max;
  }

  async function refresh() {
    const id = sel.value;
    const [l, a] = await Promise.all([
      sb.from('daily_logs').select('log_date,activity,status,remarks')
        .eq('certificate_id', id).order('log_date', { ascending: false }),
      sb.rpc('attendance_summary', { p_cert: id })
    ]);

    const s = a.data && a.data[0];
    att.textContent = s
      ? `Attendance: ${s.days_present} din manzoor / ${s.programme_days} din (${s.percent ?? 0}%). Certificate ke liye kam se kam 75% chahiye.`
      : '';

    if (l.error) { listBox.replaceChildren(el('p', 'Logs abhi load nahi ho paye.')); return; }
    if (!l.data.length) { listBox.replaceChildren(el('p', 'Abhi koi log nahi likha gaya.')); return; }
    listBox.replaceChildren(...l.data.map(r => {
      const card = document.createElement('article');
      card.className = 'card';
      const title = el('h3', fmt(r.log_date) + ' | ' + (STATUS[r.status] || r.status));
      card.append(title, el('p', r.activity));
      if (r.remarks) card.append(el('p', 'Mentor ki tippani: ' + r.remarks));
      return card;
    }));
  }

  async function init() {
    const { data } = await sb.auth.getSession();
    if (!data.session) { location.href = 'login.html'; return; }

    const { data: rows, error } = await sb.from('certificates')
      .select('id,start_date,end_date,internships(title)')
      .eq('payment_status', 'paid')
      .not('start_date', 'is', null).not('end_date', 'is', null);

    if (error || !rows.length) { form.hidden = true; noCert.hidden = false; return; }
    certs = rows;
    sel.replaceChildren(...rows.map(r => {
      const o = document.createElement('option');
      o.value = r.id;
      o.textContent = (r.internships && r.internships.title) || 'Internship';
      return o;
    }));
    sel.addEventListener('change', () => { setDateLimits(); refresh(); });
    setDateLimits();
    refresh();
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = act.value.trim();
    if (text.length < 10) return say('Kaam ka vivaran kam se kam 10 akshar ka likhein.', false);
    btn.disabled = true;
    const { error } = await sb.from('daily_logs').insert({
      certificate_id: sel.value, log_date: dateIn.value, activity: text
    });
    btn.disabled = false;
    if (error) {
      if (error.code === '23505') return say('Is tareekh ka log pehle se jama hai.', false);
      if (error.code === '42501') return say('Is tareekh ka log abhi nahi daal sakte.', false);
      return say('Log save nahi ho paya. Dobara try karein.', false);
    }
    act.value = '';
    say('Log jama ho gaya. Mentor ki manzoori ke baad attendance me judega.', true);
    refresh();
  });

  init();
})();
