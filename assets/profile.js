(() => {
  const sb = window.sb;
  const form = document.getElementById('profile-form');
  if (!sb || !form) return;

  const msg = document.getElementById('profile-msg');
  const say = (t, ok) => {
    if (!msg) return;
    msg.textContent = t;
    msg.className = 'result ' + (ok ? 'ok' : 'bad');
    msg.hidden = !t;
  };

  const FIELDS = [
    'full_name', 'gender', 'phone', 'dob', 'university_name',
    'college_name', 'course_branch', 'stream', 'major', 'session',
    'semester', 'roll_no', 'reg_no', 'state', 'district', 'address'
  ];

  let user = null;
  let existing = null;

  sb.auth.getSession().then(async ({ data }) => {
    if (!data.session) {
      location.href = 'login.html';
      return;
    }

    user = data.session.user;
    const { data: s, error } = await sb
      .from('students')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      say('Profile load nahi ho payi. Page dobara kholein.', false);
      return;
    }

    if (s) {
      existing = s;
      FIELDS.forEach((k) => {
        if (s[k] != null && form.elements[k]) {
          form.elements[k].value = s[k];
        }
      });
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!user) {
      location.href = 'login.html';
      return;
    }

    const v = {};
    FIELDS.forEach((k) => {
      const el = form.elements[k];
      v[k] = el ? el.value.trim() : '';
    });

    const semNum = parseInt(v.semester, 10);
    if (!Number.isInteger(semNum) || semNum < 1 || semNum > 10) {
      return say('Kripya sahi Semester (1 se 8/10 ke beech) chunein.', false);
    }

    if (!/^[6-9]\d{9}$/.test(v.phone)) {
      return say('Kripya sahi 10-ank ka mobile number daalein.', false);
    }

    v.semester = semNum;
    v.dob = v.dob || null;
    v.reg_no = v.reg_no || null;
    v.email = user.email;

    const btn = form.querySelector('button[type=submit]');
    if (btn) btn.disabled = true;

    const payload = existing ? v : { ...v, user_id: user.id };
    const query = existing
      ? sb.from('students').update(payload).eq('id', existing.id).select('*').single()
      : sb.from('students').insert(payload).select('*').single();

    const { data, error } = await query;
    if (btn) btn.disabled = false;

    if (error) {
      const errText = `${error.message || ''} ${error.details || ''}`.toLowerCase();

      if (error.code === '23505') {
        if (errText.includes('reg_no')) {
          return say('Yeh registration number pehle se kisi aur profile me hai.', false);
        }
        return say('Aapki profile pehle se bani hui hai. Page refresh karke dobara kholein.', false);
      }

      if (error.code === '23514') {
        return say('Koi jankari sahi format me nahi hai. Phone 10 ank ka ho, session 2024-2028 jaisa ho.', false);
      }

      return say('Profile save nahi ho payi. Thodi der baad dobara try karein.', false);
    }

    existing = data || { ...(existing || {}), ...payload };
    say('Profile save ho gayi. Dashboard par le ja rahe hain…', true);
    setTimeout(() => {
      location.href = 'dashboard.html';
    }, 1000);
  });
})();
