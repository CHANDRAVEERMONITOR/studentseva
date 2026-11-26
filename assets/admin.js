(() => {
  const sb = window.sb;
  const box = document.getElementById('pending');
  if (!sb || !box) return;

  const gate = document.getElementById('gate');
  const panel = document.getElementById('panel');
  const count = document.getElementById('count');
  const LOGIN_URL = 'login.html';

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

  const updateCount = () => {
    const remaining = box.querySelectorAll('article.card').length;
    if (count) count.textContent = String(remaining);
    if (!remaining) {
      box.replaceChildren(el('p', 'Koi log jaanch ke liye baaki nahi hai.'));
    }
  };

  async function review(card, id, status) {
    const ta = card.querySelector('textarea');
    const note = card.querySelector('.note');
    const remarks = ta ? ta.value.trim() : '';

    if (status === 'rejected' && remarks.length < 3) {
      if (note) note.textContent = 'Asweekar karne ka karan likhna zaroori hai.';
      return;
    }

    if (note) note.textContent = '';
    card.querySelectorAll('button').forEach(b => { b.disabled = true; });

    const { error } = await sb.rpc('review_log', {
      p_log: id,
      p_status: status,
      p_remarks: remarks || null
    });

    if (error) {
      if (note) note.textContent = 'Save nahi hua. Dobara try karein.';
      card.querySelectorAll('button').forEach(b => { b.disabled = false; });
      return;
    }

    card.remove();
    updateCount();
  }

  function makeCard(r) {
    const card = document.createElement('article');
    card.className = 'card';

    const c = r.certificates || {};
    const s = c.students || {};
    const i = c.internships || {};

    card.append(
      el('h3', `${s.full_name || '-'} | ${fmt(r.log_date)}`),
      el('p', `Roll No: ${s.roll_no || '-'} | College: ${s.college_name || '-'}`),
      el('p', `Internship: ${i.title || '-'}`),
      el('p', r.activity || '-')
    );

    const ta = document.createElement('textarea');
    ta.rows = 2;
    ta.maxLength = 300;
    ta.placeholder = 'Tippani (asweekar karne par zaroori)';
    ta.style.cssText = 'width:100%;margin-top:.6rem;padding:.6rem;border:2px solid var(--line);border-radius:8px;font:inherit';

    const row = document.createElement('div');
    row.className = 'row';
    row.style.marginTop = '.6rem';

    const ok = el('button', 'Manzoor karein', 'btn');
    const no = el('button', 'Asweekar karein', 'btn');
    no.style.background = '#b42318';
    ok.type = no.type = 'button';

    ok.addEventListener('click', () => review(card, r.id, 'approved'));
    no.addEventListener('click', () => review(card, r.id, 'rejected'));

    const note = el('p', '', 'note');
    row.append(ok, no);
    card.append(ta, row, note);
    return card;
  }

  async function load() {
    const { data, error } = await sb
      .from('daily_logs')
      .select('id,log_date,activity,certificates(students(full_name,roll_no,college_name),internships(title))')
      .eq('status', 'submitted')
      .order('log_date', { ascending: true })
      .limit(100);

    if (error) {
      box.replaceChildren(el('p', 'Logs load nahi ho paye.'));
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    if (count) count.textContent = String(rows.length);
    box.replaceChildren(...(rows.length ? rows.map(makeCard) : [el('p', 'Koi log jaanch ke liye baaki nahi hai.')]));
  }

  async function init() {
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      location.href = LOGIN_URL;
      return;
    }

    // Yeh sirf dikhane ke liye hai. Asli suraksha database ke RLS aur review_log function me hai.
    const { data: a, error } = await sb
      .from('admins')
      .select('user_id')
      .eq('user_id', data.session.user.id)
      .maybeSingle();

    if (error || !a) {
      if (gate) gate.hidden = false;
      return;
    }

    if (panel) panel.hidden = false;
    load();
  }

  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      location.href = LOGIN_URL;
    });
  }

  init();
})();
