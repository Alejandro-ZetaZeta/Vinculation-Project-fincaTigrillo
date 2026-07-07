/**
 * Welcome email HTML template for Finca Tigrillo / ULEAM Chone.
 * Sent to every new user after successful registration, regardless of role.
 */
export function buildWelcomeEmail(name: string): { subject: string; html: string } {
  const subject = 'Bienvenido al Sistema de Gestión Pecuaria — Finca Tigrillo'

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
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">Finca Tigrillo</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#b7e4c7;">Sistema de Gestión Pecuaria</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:36px 40px 24px;">
            <h2 style="margin:0 0 12px;font-size:20px;color:#1b4332;">Estimado/a ${name},</h2>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#3d4f3e;">
              Le damos la más cordial bienvenida al <strong>Sistema de Gestión Pecuaria de la Finca Tigrillo</strong>, una plataforma institucional de la <strong>ULEAM Chone</strong> diseñada para centralizar el registro, seguimiento y análisis operativo de los animales, el inventario de vacunas y los procesos productivos de la finca.
            </p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#3d4f3e;">
              Su cuenta ha sido creada exitosamente. A continuación, le presentamos una breve descripción de los módulos y herramientas que tendrá a su disposición.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e8f0e9;margin:0;" /></td></tr>

        <!-- Animal types section -->
        <tr>
          <td style="padding:28px 40px 8px;">
            <h3 style="margin:0 0 16px;font-size:16px;color:#1b4332;">Especies y procesos registrados</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
                  <div style="background:#f0f7f2;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:18px;">🐄</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#2d6a4f;">Bovinos — Ganado mayor</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#5a7060;">Registro individual de hembras y machos. Control de producción lechera, peso, condición corporal y trazabilidad por arete.</p>
                  </div>
                </td>
                <td width="50%" style="padding:0 0 12px 8px;vertical-align:top;">
                  <div style="background:#f0f7f2;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:18px;">🐓</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#2d6a4f;">Aves de corral</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#5a7060;">Lotes de pollos de engorde <strong>Ross 308 AP</strong>, gallinas de postura y patos. Control de mortalidad, peso y consumo.</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
                  <div style="background:#f0f7f2;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:18px;">🐷</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#2d6a4f;">Porcinos — Ganado menor</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#5a7060;">Manejo de camadas, control de hembras y verracos, registro de eventos productivos y sanitarios por animal.</p>
                  </div>
                </td>
                <td width="50%" style="padding:0 0 12px 8px;vertical-align:top;">
                  <div style="background:#f0f7f2;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:18px;">🐐</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#2d6a4f;">Caprinos — Ganado menor</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#5a7060;">Seguimiento individual con registro de producción de leche, peso, eventos sanitarios y reproductivos.</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:0 0 4px;">
                  <div style="background:#f0f7f2;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:18px;">🐴</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#2d6a4f;">Equinos</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#5a7060;">Ficha individual de équidos de trabajo y reproductores, con registro de herrajes, desparasitación y atención veterinaria.</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Vaccine profile + reminders -->
        <tr>
          <td style="padding:20px 40px 4px;">
            <div style="background:#e9f5ee;border-left:4px solid #2d6a4f;border-radius:0 8px 8px 0;padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1b4332;">Perfiles de vacunación y recordatorios automatizados</p>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#3d5240;">
                Cada animal cuenta con un <strong>perfil sanitario</strong> que registra el historial completo de vacunas aplicadas, dosis administradas, intervalos entre dosis y próximas fechas estimadas.
              </p>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#3d5240;">
                El sistema genera <strong>recordatorios automáticos</strong> cuando se aproxima la fecha de la siguiente dosis según el calendario sanitario configurado para cada especie (bovinos, porcinos, caprinos, equinos y aves de corral). Dichos avisos se publican en el panel principal para que el personal responsable pueda preparar el producto y coordinar la jornada de aplicación con antelación.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#3d5240;">
                El inventario de vacunas mantiene el stock en dosis, alerta sobre existencias agotadas o por debajo del umbral mínimo, y descuenta automáticamente las dosis aplicadas para mantener la coherencia entre el catálogo y las fichas individuales.
              </p>
            </div>
          </td>
        </tr>

        <!-- Ross 308 highlight -->
        <tr>
          <td style="padding:16px 40px 0;">
            <div style="background:#e9f5ee;border-left:4px solid #2d6a4f;border-radius:0 8px 8px 0;padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1b4332;">Cálculo automatizado de alimentación — Ross 308 AP</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#3d5240;">
                El sistema calcula los bultos de 40 kg necesarios para la próxima semana a partir del número de aves vivas por lote, siguiendo la tabla diaria de consumo del manual Ross 308 AP (hasta el día 46). Cada viernes se genera una notificación de compra en el panel.
              </p>
            </div>
          </td>
        </tr>

        <!-- TigrIA -->
        <tr>
          <td style="padding:20px 40px 4px;">
            <div style="background:#f3eefc;border-left:4px solid #6d4ed4;border-radius:0 8px 8px 0;padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#3b2a85;">TigrIA — Asistente inteligente integrado</p>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#3d3458;">
                <strong>TigrIA</strong> es el módulo de inteligencia artificial integrado en la plataforma, disponible para <strong>docentes y administradores</strong>. Permite realizar consultas en lenguaje natural sobre el estado del hato, los perfiles sanitarios, el inventario de vacunas, las estadísticas reproductivas y la productividad de la finca, ofreciendo respuestas contextualizadas con la información registrada en la base de datos.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#3d3458;">
                TigrIA también genera <strong>resúmenes operativos con IA</strong> sobre los informes de la finca, apoyando la toma de decisiones del personal docente y administrativo. Por motivos de integridad académica y de datos, el acceso a TigrIA se encuentra restringido a los roles de docente y administrador; los estudiantes mantienen acceso al resto de módulos del sistema.
              </p>
            </div>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e8f0e9;margin:0;" /></td></tr>

        <!-- Features list -->
        <tr>
          <td style="padding:24px 40px 28px;">
            <h3 style="margin:0 0 14px;font-size:16px;color:#1b4332;">Funcionalidades disponibles</h3>
            <ul style="margin:0;padding-left:20px;font-size:14px;line-height:2;color:#3d4f3e;">
              <li>Consulta del inventario de animales por especie, sexo, edad y estado productivo.</li>
              <li>Gestión de perfiles sanitarios individuales con historial de vacunación y recordatorios automáticos de próximas dosis.</li>
              <li>Proyecciones semanales de alimentación para lotes de aves de engorde Ross 308 AP.</li>
              <li>Administración del inventario de herramientas, insumos y vacunas de la finca.</li>
              <li>Generación de reportes operativos en formato imprimible y PDF.</li>
              <li>Acceso a TigrIA para consultas inteligentes y resúmenes analíticos (exclusivo para docentes y administradores).</li>
            </ul>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 36px;text-align:center;">
            <a href="https://fincatigrillo.vercel.app/login"
               style="display:inline-block;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.3px;">
              Acceder al sistema
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f0f7f2;padding:20px 40px;text-align:center;border-top:1px solid #d8eddf;">
            <p style="margin:0;font-size:12px;color:#7a9e82;line-height:1.6;">
              Este correo fue generado automáticamente al crear su cuenta en el Sistema de Gestión Pecuaria de la <strong>Finca Tigrillo</strong>.<br/>
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
