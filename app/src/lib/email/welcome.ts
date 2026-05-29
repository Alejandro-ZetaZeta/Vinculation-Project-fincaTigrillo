/**
 * Welcome email HTML template for Finca Tigrillo / ULEAM Chone.
 * Sent to every new user after successful registration, regardless of role.
 */
export function buildWelcomeEmail(name: string): { subject: string; html: string } {
  const subject = '¡Bienvenido/a al Sistema de Gestión Pecuaria – Finca Tigrillo!'

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f3;font-family:'Segoe UI',Arial,sans-serif;color:#2d3a2e;">

  <!-- Wrapper -->
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

        <!-- Greeting -->
        <tr>
          <td style="padding:36px 40px 24px;">
            <h2 style="margin:0 0 12px;font-size:20px;color:#1b4332;">¡Hola, ${name}! 👋</h2>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#3d4f3e;">
              Tu cuenta ha sido creada exitosamente en el sistema de manejo ganadero de la Finca Tigrillo, proyecto de extensión de la <strong>ULEAM Chone</strong>. Esta plataforma centraliza el registro, seguimiento y análisis de los animales bajo manejo en la finca.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e8f0e9;margin:0;" /></td></tr>

        <!-- Animal types section -->
        <tr>
          <td style="padding:28px 40px 8px;">
            <h3 style="margin:0 0 16px;font-size:16px;color:#1b4332;">🐄 Especies registradas en el sistema</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
                  <div style="background:#f0f7f2;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:18px;">🐄</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#2d6a4f;">Bovinos</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#5a7060;">Registro de hembras y machos. Seguimiento reproductivo, gestación (≈283 días) y producción de leche.</p>
                  </div>
                </td>
                <td width="50%" style="padding:0 0 12px 8px;vertical-align:top;">
                  <div style="background:#f0f7f2;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:18px;">🐓</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#2d6a4f;">Aves de corral</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#5a7060;">Lotes de pollos de engorde <strong>Ross 308 AP</strong>. Proyección de consumo de alimento semanal automatizada.</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
                  <div style="background:#f0f7f2;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:18px;">🐷</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#2d6a4f;">Porcinos</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#5a7060;">Control de camadas, gestación (≈114 días) y eventos reproductivos por animal.</p>
                  </div>
                </td>
                <td width="50%" style="padding:0 0 12px 8px;vertical-align:top;">
                  <div style="background:#f0f7f2;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:18px;">🐐</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#2d6a4f;">Caprinos</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#5a7060;">Seguimiento individual con producción de leche y registro de eventos.</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:0 0 4px;">
                  <div style="background:#f0f7f2;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:18px;">🐴</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#2d6a4f;">Equinos</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#5a7060;">Registro y ficha individual de équidos en la finca.</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Ross 308 highlight -->
        <tr>
          <td style="padding:20px 40px;">
            <div style="background:#e9f5ee;border-left:4px solid #2d6a4f;border-radius:0 8px 8px 0;padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1b4332;">📊 Alimentación Ross 308 AP — cálculo automatizado</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#3d5240;">
                El sistema calcula automáticamente los bultos de 40 kg necesarios para la próxima semana según el número de aves vivas por lote, siguiendo la tabla diaria de consumo del manual Ross 308 AP (hasta el día 46). Cada viernes se genera una notificación de compra en el panel.
              </p>
            </div>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e8f0e9;margin:0;" /></td></tr>

        <!-- Features list -->
        <tr>
          <td style="padding:24px 40px 28px;">
            <h3 style="margin:0 0 14px;font-size:16px;color:#1b4332;">⚙️ ¿Qué puedes hacer en el sistema?</h3>
            <ul style="margin:0;padding-left:20px;font-size:14px;line-height:2;color:#3d4f3e;">
              <li>Consultar el inventario de animales por especie y estado</li>
              <li>Ver el historial de eventos reproductivos y producción de leche</li>
              <li>Revisar proyecciones de alimentación semanal para lotes de aves</li>
              <li>Acceder al inventario de herramientas e insumos de la finca</li>
              <li>Consultar reportes y estadísticas generales</li>
            </ul>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 36px;text-align:center;">
            <a href="https://fincatigrillo.vercel.app/login"
               style="display:inline-block;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.3px;">
              Ir al panel →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f0f7f2;padding:20px 40px;text-align:center;border-top:1px solid #d8eddf;">
            <p style="margin:0;font-size:12px;color:#7a9e82;line-height:1.6;">
              Este correo fue generado automáticamente al crear tu cuenta en el sistema de gestión pecuaria de <strong>Finca Tigrillo</strong>.<br/>
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
