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
    if (m.includes('already registered') || m.includes('user already exists')) return 'Is email se account pehle se hai. Login karein.';
    if (m.includes('email not confirmed')) return 'Pehle apne email ka OTP ya confirmation link verify karein.';
    if (m.includes('rate limit') || m.includes('429')) return 'Kuch der baad dobara try karein.';
    if (m.includes('token') || m.includes('otp') || m.includes('expired')) return 'OTP galat ya expire ho chuka hai. Dobara try karein.';
    if (m.includes('password')) return 'Password kam se kam 8 akshar ka rakhein.';
    return 'Kuch gadbad hui. Dobara try karein.';
  };

  const goDash = () => { location.href = 'dashboard.html'; };

  // ---- Login / Signup + Email OTP page ----
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const otpForm = document.getElementById('otp-form');
  const resendBtn = document.getElementById('resend-otp-btn');
  let pendingEmail = '';

  if (loginForm && signupForm) {
    sb.auth.getSession().then(({ data }) => {
      if (data.session) goDash();
    });

    const toggle = mode => {
      loginForm.hidden = mode !== 'login';
      signupForm.hidden = mode !== 'signup';
      if (otpForm) otpForm.hidden = mode !== 'otp';
      say('login-msg', '');
      say('signup-msg', '');
      say('otp-msg', '');
    };

    const showSignupBtn = document.getElementById('show-signup');
    const showLoginBtn = document.getElementById('show-login');
    if (showSignupBtn) showSignupBtn.addEventListener('click', () => toggle('signup'));
    if (showLoginBtn) showLoginBtn.addEventListener('click', () => toggle('login'));

    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type=submit]');
      if (btn) btn.disabled = true;
      say('login-msg', '');

      const { error } = await sb.auth.signInWithPassword({
        email: loginForm.email.value.trim(),
        password: loginForm.password.value
      });

      if (btn) btn.disabled = false;
      if (error) return say('login-msg', friendly(error.message), false);
      goDash();
    });

    signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = signupForm.email.value.trim();
      const pw = signupForm.password.value;
      if (pw.length < 8) return say('signup-msg', 'Password kam se kam 8 akshar ka rakhein.', false);
      if (signupForm.password2 && pw !== signupForm.password2.value) {
        return say('signup-msg', 'Dono password ek jaise nahi hain.', false);
      }

      const btn = signupForm.querySelector('button[type=submit]');
      if (btn) btn.disabled = true;
      say('signup-msg', '');

      const { data, error } = await sb.auth.signUp({
        email,
        password: pw,
        options: { emailRedirectTo: new URL('dashboard.html', location.href).href }
      });

      if (btn) btn.disabled = false;
      if (error) return say('signup-msg', friendly(error.message), false);

      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return say('signup-msg', 'Is email se account pehle se hai. Login karein.', false);
      }

      if (data?.session) return goDash();

      pendingEmail = email;
      if (otpForm) {
        toggle('otp');
        say('otp-msg', '6-digit OTP aapke email par bhej diya gaya hai. Inbox ya Spam check karein.', true);
      } else {
        say('signup-msg', 'Account ban gaya. Apne email me aaya 6-digit OTP ya link verify karein, phir login karein.', true);
      }
    });

    if (otpForm) {
      otpForm.addEventListener('submit', async e => {
        e.preventDefault();
        const code = (otpForm.otp?.value || document.getElementById('otp-code')?.value || '').trim();
        if (!pendingEmail) return say('otp-msg', 'Pehle signup form se email submit karein.', false);
        if (!/^\d{6}$/.test(code)) return say('otp-msg', 'Kripya 6-ank ka sahi OTP daalein.', false);

        const btn = otpForm.querySelector('button[type=submit]');
        if (btn) btn.disabled = true;
        say('otp-msg', '');

        const { data, error } = await sb.auth.verifyOtp({
          email: pendingEmail,
          token: code,
          type: 'signup'
        });

        if (btn) btn.disabled = false;
        if (error) return say('otp-msg', friendly(error.message), false);

        say('otp-msg', 'Email verify ho gaya! Dashboard par le ja rahe hain…', true);
        if (data?.session) {
          setTimeout(goDash, 600);
        } else {
          setTimeout(() => toggle('login'), 900);
        }
      });
    }

    if (resendBtn) {
      resendBtn.addEventListener('click', async () => {
        if (!pendingEmail) return say('otp-msg', 'Pehle email daal kar signup submit karein.', false);
        resendBtn.disabled = true;
        const { error } = await sb.auth.resend({
          type: 'signup',
          email: pendingEmail,
          options: { emailRedirectTo: new URL('dashboard.html', location.href).href }
        });
        resendBtn.disabled = false;

        if (error) return say('otp-msg', friendly(error.message), false);
        say('otp-msg', 'Naya OTP bhej diya gaya hai.', true);
      });
    }
  }

  // ---- Dashboard page ----
  const dash = document.getElementById('dash');
  if (dash) {
    sb.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) { location.href = 'login.html'; return; }

      const emailEl = document.getElementById('user-email');
      if (emailEl) emailEl.textContent = session.user.email || '';

      const { data: s, error } = await sb
        .from('students')
        .select('full_name')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const statusEl = document.getElementById('profile-status');
      if (statusEl) {
        statusEl.textContent = error
          ? 'Profile ki sthiti abhi nahi mil payi.'
          : s && s.full_name
            ? 'Profile bhari hui hai: ' + s.full_name
            : 'निचे क्लिक करके फॉर्म भरक profile पूरा करें .';
      }
    });

    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await sb.auth.signOut();
        location.href = 'login.html';
      });
    }
  }
})();
