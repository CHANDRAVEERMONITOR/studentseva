(() => {
  const cfg = window.APP_CONFIG;
  const form = document.getElementById('verify-form');
  if (!form || !cfg) return;

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const input = document.getElementById('cert-id');
  const out = document.getElementById('verify-result');
  const btn = form.querySelector('button');

  const fmt = d => d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-';

  const line = (label, value) => {
    const p = document.createElement('p');
    if (label) {
      const b = document.createElement('strong');
      b.textContent = label + ': ';
      p.append(b);
    }
    p.append(document.createTextNode(value));
    return p;
  };

  const show = (ok, nodes) => {
    out.className = 'result ' + (ok ? 'ok' : 'bad');
    out.replaceChildren(...nodes);
    out.hidden = false;
  };

  async function verify(raw) {
    const id = raw.trim();
    if (!UUID.test(id)) {
      return show(false, [line('', 'Certificate ID ka format galat hai. Certificate par likha poora ID daalein.')]);
    }
    btn.disabled = true;
    btn.textContent = 'Check ho raha hai…';
    try {
      const res = await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/verify_certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_ANON_KEY },
        body: JSON.stringify({ p_id: id })
      });
      if (!res.ok) throw new Error('http ' + res.status);
      const data = await res.json();
      if (!data.length) {
        return show(false, [line('', 'Yeh Certificate ID hamare record me nahi mila. ID dobara check karein.')]);
      }
      const c = data[0];
      show(true, [
        line('', '✔ Certificate valid hai'),
        line('Certificate No', c.certificate_no || '-'),
        line('Naam', c.full_name),
        line('College', c.college_name),
        line('University', c.university_name),
        line('Session', c.session),
        line('Course', `${c.course_branch} (${c.major})`),
        line('Internship', `${c.internship_title} (${c.domain})`),
        line('Avadhi', `${fmt(c.start_date)} se ${fmt(c.end_date)}`),
        line('Hours / Mode', `${c.total_hours ?? '-'} hours, ${c.mode}`),
        line('Credits', String(c.credits ?? '-')),
        line('Marks', c.marks_percentage != null ? c.marks_percentage + '%' : '-'),
        line('Issue date', fmt(c.issued_at))
      ]);
    } catch (e) {
      show(false, [line('', 'Abhi verify nahi ho paya. Thodi der baad dobara try karein.')]);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Verify karein';
    }
  }

  form.addEventListener('submit', e => { e.preventDefault(); verify(input.value); });

  // QR link: /?id=<uuid> se seedha verify
  const q = new URLSearchParams(location.search).get('id');
  if (q) {
    input.value = q;
    verify(q);
    const box = document.getElementById('verify');
    if (box) box.scrollIntoView();
  }
})();
