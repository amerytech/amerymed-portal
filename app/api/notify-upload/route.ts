import { NextResponse } from 'next/server';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected email error';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      clinicName,
      category,
      patientReference,
      notes,
      fileName,
      uploadedBy,
      uploadedAt,
    } = body;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
    const FROM_EMAIL = process.env.FROM_EMAIL;

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 });
    }

    if (!TO_EMAIL) {
      return NextResponse.json({ error: 'Missing ADMIN_NOTIFICATION_EMAIL' }, { status: 500 });
    }

    if (!FROM_EMAIL) {
      return NextResponse.json({ error: 'Missing FROM_EMAIL' }, { status: 500 });
    }

    const emailHtml = `
      <h2>New File Uploaded</h2>
      <p><strong>Clinic:</strong> ${clinicName || 'N/A'}</p>
      <p><strong>Category:</strong> ${category || 'N/A'}</p>
      <p><strong>Patient Ref:</strong> ${patientReference || 'N/A'}</p>
      <p><strong>File:</strong> ${fileName || 'N/A'}</p>
      <p><strong>Uploaded By:</strong> ${uploadedBy || 'N/A'}</p>
      <p><strong>Time:</strong> ${uploadedAt || 'N/A'}</p>
      <p><strong>Notes:</strong> ${notes || 'N/A'}</p>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject: `New Upload from ${clinicName || 'AmeryMed'}`,
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const resendError =
        data?.error?.message ||
        data?.message ||
        JSON.stringify(data);

      return NextResponse.json(
        { error: resendError },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
