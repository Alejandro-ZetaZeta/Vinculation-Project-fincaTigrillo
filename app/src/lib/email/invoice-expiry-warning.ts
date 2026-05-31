type InvoiceRow = { id: string; title: string; created_at: string }

export function buildInvoiceExpiryWarningEmail(
  invoices: InvoiceRow[]
): { subject: string; html: string } {
  const subject = `⚠️ ${invoices.length} factura(s) serán eliminadas mañana – Finca Tigrillo`

  const rows = invoices
    .map(inv => {
      const date = new Date(inv.created_at).toLocaleDateString('es-EC', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
      return `
        <tr>
          <td style="padding:10px 16px;font-size:14px;color:#2d3a2e;border-bottom:1px solid #e8f0e9;">${inv.title}</td>
          <td style="padding:10px 16px;font-size:14px;color:#5a7060;border-bottom:1px solid #e8f0e9;white-space:nowrap;">${date}</td>
        </tr>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f3;font-family:'Segoe UI',Arial,sans-serif;color:#2d3a2e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f3;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#2d6a4f;padding:36px 40px 28px;text-align:center;">
            <p style="margin:0 0 8px;font-size:13px;color:#95d5b2;letter-spacing:1.5px;text-transform:uppercase;">Universidad Laica Eloy Alfaro de Manabí · Extensión Chone</p>
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">🌿 Finca Tigrillo</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#b7e4c7;">Sistema de Gestión Pecuaria</p>
          </td>
        </tr>

        <!-- Alert banner -->
        <tr>
          <td style="padding:28px 40px 0;">
            <div style="background:#fff3cd;border-left:4px solid #e6a817;border-radius:0 8px 8px 0;padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#7d4e00;">⚠️ Aviso de eliminación automática</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#7d4e00;">
                Las siguientes <strong>${invoices.length} factura(s)</strong> han cumplido 59 días de antigüedad y serán <strong>eliminadas automáticamente mañana</strong> del sistema.
              </p>
            </div>
          </td>
        </tr>

        <!-- Table -->
        <tr>
          <td style="padding:24px 40px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8f0e9;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#f0f7f2;">
                  <th style="padding:10px 16px;font-size:13px;color:#1b4332;text-align:left;font-weight:600;">Título</th>
                  <th style="padding:10px 16px;font-size:13px;color:#1b4332;text-align:left;font-weight:600;white-space:nowrap;">Fecha de subida</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </td>
        </tr>

        <!-- Note -->
        <tr>
          <td style="padding:20px 40px 36px;">
            <p style="margin:0;font-size:13px;color:#5a7060;line-height:1.6;">
              Si necesitas conservar alguna de estas facturas, descárgala desde el panel antes de que sea eliminada. La eliminación es permanente.
            </p>
            <div style="margin-top:20px;text-align:center;">
              <a href="https://fincatigrillo.vercel.app/dashboard/events"
                 style="display:inline-block;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.3px;">
                Ver facturas →
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f0f7f2;padding:20px 40px;text-align:center;border-top:1px solid #d8eddf;">
            <p style="margin:0;font-size:12px;color:#7a9e82;line-height:1.6;">
              Este correo fue generado automáticamente por el sistema de gestión pecuaria de <strong>Finca Tigrillo</strong>.<br/>
              Universidad Laica Eloy Alfaro de Manabí · Extensión Chone
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html }
}
