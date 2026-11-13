(() => {
  const sb = window.sb;
  const form = document.getElementById('profile-form');
  if (!sb || !form) return;

  const msg = document.getElementById('profile-msg');
  const say = (t, ok) => { msg.textContent = t; msg.className = 'result ' + (ok ? 'ok' : 'bad'); msg.hidden = !t; };
  const FIELDS = ['full_name','gender','phone','dob','university_name','college_name','course_branch',
                  'stream','major','session','semester','roll_no','reg_no','state','district','address'];
  let user = null, existing = null;

  sb.auth.getSession().then(async ({ data }) => {
    if (!data.session) { location.href = 'login.html'; return; }
    user = data.session.user;
    const { data: s, error } = await sb.from('students').select('*').eq('user_id', user.id).maybeSingle();
    if (error) { say('Profile load nahi ho payi. Page dobara kholein.', false); return; }
    if (s) {
      existing = s;
      FIELDS.forEach(k => { if (s[k] != null) form.elements[k].value = s[k]; });
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!user) return;
    const v = {};
    FIELDS.forEach(k => { v[k] = form.elements[k].value.trim(); });
    v.semester = parseInt(v.semester, 10);
    v.reg_no = v.reg_no || null;
    v.email = user.email;

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    const q = existing
      ? sb.from('students').update(v).eq('id', existing.id).select('id').single()
      : sb.from('students').insert({ ...v, user_id: user.id }).select('id').single();
    const { data, error } = await q;
    btn.disabled = false;

    if (error) {
      if (error.code === '23505') {
        return say((error.message || '').includes('reg_no')
          ? 'Yeh registration number pehle se kisi aur profile me hai.'
          : 'Aapki profile pehle se bani hui hai. Page refresh karke dobara kholein.', false);
      }
      if (error.code === '23514') {
        return say('Koi jankari sahi format me nahi hai. Phone 10 ank ka ho, session 2023-2027 jaisa ho.', false);
      }
      return say('Profile save nahi ho payi. Thodi der baad dobara try karein.', false);
    }
    existing = { ...(existing || {}), id: data.id };
    say('Profile save ho gayi. Dashboard par le ja rahe hain…', true);
    setTimeout(() => { location.href = 'dashboard.html'; }, 1200);
  });
})();
