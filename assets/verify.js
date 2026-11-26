(() => {
  const cfg = window.APP_CONFIG;
  const form = document.getElementById('verify-form');
  if (!form || !cfg) return;

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const input = document.getElementById('cert-id');
  const out = document.getElementById('verify-result');
  const btn = form.querySelector('button');

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

  const line = (label, value) => {
    const p = document.createElement('p');
    if (label) {
      const b = document.createElement('strong');
      b.textContent = label + ': ';
      p.append(b);
    }
    p.append(document.createTextNode(value == null || value === '' ? '-' : String(value)));
    return p;
  };

  const show = (ok, nodes) => {
    if (!out) return;
    out.className = 'result ' + (ok ? 'ok' : 'bad');
    out.replaceChildren(...nodes);
    out.hidden = false;
  };

  async function verify(raw) {
    const id = String(raw || '').trim();
    if (!UUID.test(id)) {
      return show(false, [line('', 'Certificate ID ka format galat hai. Certificate par likha poora ID daalein.')]);
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Check ho raha hai…';
    }

    try {
      const res = await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/verify_certificate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ p_id: id })
      });

      if (!res.ok) throw new Error('http ' + res.status);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data ? [data] : []);

      if (!rows.length) {
        return show(false, [line('', 'Yeh Certificate ID hamare record me nahi mila. ID dobara check karein.')]);
      }

      const c = rows[0];
      const courseText = c.major ? `${c.course_branch || ''} (${c.major})` : (c.course_branch || '-');
      const internText = c.domain ? `${c.internship_title || ''} (${c.domain})` : (c.internship_title || '-');

      show(true, [
        line('', '✔ Certificate valid hai'),
        line('Certificate No', c.certificate_no || '-'),
        line('Naam', c.full_name || '-'),
        line('College', c.college_name || '-'),
        line('University', c.university_name || '-'),
        line('Session', c.session || '-'),
        line('Course', courseText),
        line('Internship', internText),
        line('Avadhi', `${fmt(c.start_date)} se ${fmt(c.end_date)}`),
        line('Hours / Mode', `${c.total_hours ?? '-'} hours, ${c.mode || '-'}`),
        line('Credits', String(c.credits ?? '-')),
        line('Marks', c.marks_percentage != null ? c.marks_percentage + '%' : '-'),
        line('Issue date', fmt(c.issued_at))
      ]);
    } catch (e) {
      show(false, [line('', 'Abhi verify nahi ho paya. Thodi der baad dobara try karein.')]);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Verify karein';
      }
    }
  }

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (input) verify(input.value);
    });
  }

  // QR link: /?id=<uuid> se seedha verify
  const q = new URLSearchParams(location.search).get('id');
  if (q && input) {
    input.value = q;
    verify(q);
    const box = document.getElementById('verify');
    if (box) box.scrollIntoView();
  }
})();
