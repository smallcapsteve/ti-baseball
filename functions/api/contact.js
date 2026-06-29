// Cloudflare Pages Function — handles contact form submissions
// POST /api/contact — receives form data, validates, sends email via Resend
//
// Required environment variable (set in Cloudflare Pages dashboard):
//   RESEND_API_KEY  — Resend API key for sending email
//
// Optional:
//   CONTACT_TO_EMAIL — recipient address (default: Crosbyathletics321@gmail.com)

export async function onRequestPost(context) {
  const { request, env } = context;
  const TO_EMAIL = env.CONTACT_TO_EMAIL || 'Crosbyathletics321@gmail.com';
  const FROM_EMAIL = 'TI Baseball Website <noreply@tibaseball.com>';

  try {
    const formData = await request.formData();

    // Honeypot — bots will fill this hidden field
    if (formData.get('bot-field')) {
      // Silently redirect them to the thanks page (don't tip them off)
      return Response.redirect(new URL('/contact-thanks.html', request.url), 303);
    }

    const data = {
      name:     (formData.get('name')     || '').toString().trim(),
      email:    (formData.get('email')    || '').toString().trim(),
      phone:    (formData.get('phone')    || '').toString().trim(),
      dob:      (formData.get('dob')      || '').toString().trim(),
      level:    (formData.get('level')    || '').toString().trim(),
      interest: (formData.get('interest') || '').toString().trim(),
      message:  (formData.get('message')  || '').toString().trim(),
    };

    if (!data.name || !data.email) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Compute approximate age from DOB if provided (so Coach sees both at a glance)
    let dobLine = '(not provided)';
    if (data.dob) {
      const dob = new Date(data.dob);
      if (!isNaN(dob.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        dobLine = `${data.dob} (${age} yrs)`;
      } else {
        dobLine = data.dob;
      }
    }

    const text = [
      'New TI Baseball inquiry from tibaseball.com:',
      '',
      `Name:                ${data.name}`,
      `Email:               ${data.email}`,
      `Phone:               ${data.phone || '(not provided)'}`,
      `Athlete DOB:         ${dobLine}`,
      `Level of Play:       ${data.level || '(not provided)'}`,
      `Interest:            ${data.interest || '(not provided)'}`,
      '',
      'Message:',
      data.message || '(no message)',
    ].join('\n');

    // Send via Resend
    if (!env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set');
      return new Response('Email service not configured', { status: 500 });
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: data.email,
        subject: `New TI Baseball inquiry: ${data.name}`,
        text,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      console.error('Resend error:', err);
      return new Response('Failed to send', { status: 502 });
    }

    return Response.redirect(new URL('/contact-thanks.html', request.url), 303);
  } catch (err) {
    console.error('Contact form error:', err);
    return new Response('Internal error', { status: 500 });
  }
}

// Reject anything that isn't POST
export async function onRequest(context) {
  return new Response('Method not allowed', { status: 405 });
}
