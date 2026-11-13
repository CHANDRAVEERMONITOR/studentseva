(() => {
  const cfg = window.APP_CONFIG;
  if (!cfg || !window.supabase) return;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  window.sb = sb;

  const say = (id, text, ok) => {
    const n = document.getElementById(id);
    if (!n) return;
    n.textContent = text || '';
    n.className = 'result ' + (ok ? 'ok' : 'bad');
    n.hidden = !text;
  };
  const friendly = m => {
    m = (m || '').toLowerCase();
    if (m.includes('invalid login')) return 'Email ya password galat hai.';
    if (m.includes('already registered')) return 'Is email se account pehle se hai. Login karein.';
    if (m.includes('email not confirmed')) return 'Pehle apne email me aaya confirmation link kholein.';
    if (m.includes('rate limit')) return 'Kuch der baad dobara try karein.';
    if (m.includes('password')) return 'Password kam se kam 8 akshar ka rakhein.';
    return 'Kuch gadbad hui. Dobara try karein.';
  };
  const goDash = () => { location.href = 'dashboard.html'; };

  // ---- Login / Signup page ----
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  if (loginForm && signupForm) {
    sb.auth.getSession().then(({ data }) => { if (data.session) goDash(); });

    const toggle = signup => {
      loginForm.hidden = signup;
      signupForm.hidden = !signup;
      say('login-msg', ''); say('signup-msg', '');
    };
    document.getElementById('show-signup').addEventListener('click', () => toggle(true));
    document.getElementById('show-login').addEventListener('click', () => toggle(false));

    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type=submit]');
      btn.disabled = true;
      const { error } = await sb.auth.signInWithPassword({
        email: loginForm.email.value.trim(),
        password: loginForm.password.value
      });
      btn.disabled = false;
      if (error) return say('login-msg', friendly(error.message), false);
      goDash();
    });

    signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const pw = signupForm.password.value;
      if (pw.length < 8) return say('signup-msg', 'Password kam se kam 8 akshar ka rakhein.', false);
      if (pw !== signupForm.password2.value) return say('signup-msg', 'Dono password ek jaise nahi hain.', false);
      const btn = signupForm.querySelector('button[type=submit]');
      btn.disabled = true;
      const { data, error } = await sb.auth.signUp({
        email: signupForm.email.value.trim(),
        password: pw,
        options: { emailRedirectTo: new URL('dashboard.html', location.href).href }
      });
      btn.disabled = false;
      if (error) return say('signup-msg', friendly(error.message), false);
      if (data.session) return goDash();
      say('signup-msg', 'Account ban gaya. Apne email me aaya confirmation link kholein, phir login karein.', true);
    });
  }

  // ---- Dashboard page ----
  const dash = document.getElementById('dash');
  if (dash) {
    sb.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) { location.href = 'login.html'; return; }
      document.getElementById('user-email').textContent = session.user.email;
      const { data: s, error } = await sb.from('students')
        .select('full_name').eq('user_id', session.user.id).maybeSingle();
      document.getElementById('profile-status').textContent = error
        ? 'Profile ki sthiti abhi nahi mil payi.'
        : s ? 'Profile bhari hui hai: ' + s.full_name
            : 'निचे क्लिक करके फॉर्म भरक profile पूरा करें .';
    });
    document.getElementById('logout').addEventListener('click', async () => {
      await sb.auth.signOut();
      location.href = 'login.html';
    });
  }
})();
