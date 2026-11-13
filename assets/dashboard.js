(() => {
  const sb = window.sb;
  const box = document.getElementById('profile-card');
  const list = document.getElementById('my-internships');
  if (!sb || !box || !list) return;

  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    n.textContent = text;
    return n;
  };
  const row = (k, v) => {
    const p = document.createElement('p');
    const b = document.createElement('strong');
    b.textContent = k + ': ';
    p.append(b, document.createTextNode(v == null || v === '' ? '-' : v));
    return p;
  };
  const fmt = d => d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-';

  const PAY = { pending: 'Bhugtan baaki', paid: 'Bhugtan ho gaya', failed: 'Bhugtan fail hua', refunded: 'Refund ho gaya' };
  const WORK = { applied: 'Dakhila hua', in_progress: 'Kaam chal raha hai', submitted: 'Kaam jama hua',
                 approved: 'Kaam manzoor', rejected: 'Kaam asweekar' };

  sb.auth.getSession().then(async ({ data }) => {
    if (!data.session) return;
    const uid = data.session.user.id;

    const [s, c] = await Promise.all([
      sb.from('students').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('certificates')
        .select('id,payment_status,work_status,start_date,end_date,created_at,internships(title,domain,duration_weeks)')
        .order('created_at', { ascending: false })
    ]);

    // ---- Profile ----
    if (s.error) {
      box.replaceChildren(el('p', 'Profile abhi load nahi ho payi. Page dobara kholein.'));
    } else if (!s.data) {
      box.replaceChildren(el('p', 'Aapki profile abhi nahi bhari gayi hai. Neeche ka button dabakar bharein.'));
    } else {
      const p = s.data;
      const w = document.getElementById('welcome');
      if (w) w.textContent = 'Namaste, ' + p.full_name;
      box.replaceChildren(
        row('Course', `${p.course_branch} (${p.major}), Semester ${p.semester}`),
        row('College', p.college_name),
        row('University', p.university_name),
        row('Session', p.session),
        row('Roll No', p.roll_no),
        row('Registration No', p.reg_no),
        row('Phone', p.phone),
        row('Email', p.email),
        row('Janm tithi', fmt(p.dob)),
        row('Pata', `${p.address}, ${p.district}, ${p.state}`)
      );
    }

    // ---- Meri internships ----
    if (c.error) {
      list.replaceChildren(el('p', 'Internships abhi load nahi ho payi.'));
    } else if (!c.data.length) {
      const p = el('p', 'Aapne abhi koi internship nahi li hai. ');
      const a = document.createElement('a');
      a.href = 'internships.html';
      a.textContent = 'Internships dekhein';
      p.append(a);
      list.replaceChildren(p);
    } else {
      list.replaceChildren(...c.data.map(r => {
        const card = document.createElement('article');
        card.className = 'card';
        const i = r.internships || {};
        card.append(
          el('h3', i.title || 'Internship'),
          row('Vishay', i.domain),
          row('Avadhi', `${fmt(r.start_date)} se ${fmt(r.end_date)}`),
          row('Bhugtan', PAY[r.payment_status] || r.payment_status),
          row('Kaam', WORK[r.work_status] || r.work_status)
        );
        return card;
      }));
    }
  });
})();
