import { resend, FROM_EMAIL } from './client'

interface EmailData {
  to: string
  firstName: string
}

interface WelcomeEmailData extends EmailData {}

interface PaymentConfirmationData extends EmailData {
  planName: string
  amount: string
}

interface FamilyCodesEmailData extends EmailData {
  parentCode: string
  childrenCodes: { name: string; code: string }[]
}

// Welcome email template (HTML)
function getWelcomeEmailHtml(firstName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #191014; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 64px; height: 64px; background: linear-gradient(135deg, #090653, #dc7aa4); border-radius: 16px; margin: 0 auto 16px; }
        h1 { color: #191014; font-size: 24px; margin-bottom: 8px; }
        p { color: #8d586f; font-size: 16px; }
        .cta { display: inline-block; background: linear-gradient(90deg, #090653, #dc7aa4); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; }
        .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e4d3da; text-align: center; font-size: 14px; color: #8d586f; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo"></div>
          <h1>¡Bienvenido a Starbiz Academy!</h1>
        </div>
        <p>Hola ${firstName},</p>
        <p>Gracias por crear tu cuenta en Starbiz Academy. Estamos emocionados de tenerte como parte de nuestra comunidad de familias comprometidas con la educación.</p>
        <p>Para comenzar, elige el plan que mejor se adapte a las necesidades de tu familia:</p>
        <p style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/onboarding/plan" class="cta">Elegir mi plan</a>
        </p>
        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Starbiz Academy. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function getPaymentConfirmationHtml(firstName: string, planName: string, amount: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #191014; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .success-icon { width: 64px; height: 64px; background: #10b981; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; }
        h1 { color: #191014; font-size: 24px; margin-bottom: 8px; }
        p { color: #8d586f; font-size: 16px; }
        .details { background: #f8f6f7; border-radius: 12px; padding: 24px; margin: 24px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .cta { display: inline-block; background: linear-gradient(90deg, #090653, #dc7aa4); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; }
        .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e4d3da; text-align: center; font-size: 14px; color: #8d586f; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">✓</div>
          <h1>¡Pago confirmado!</h1>
        </div>
        <p>Hola ${firstName},</p>
        <p>Tu pago ha sido procesado exitosamente. Aquí están los detalles:</p>
        <div class="details">
          <div class="detail-row">
            <span>Plan:</span>
            <strong>${planName}</strong>
          </div>
          <div class="detail-row">
            <span>Total:</span>
            <strong>${amount} USD</strong>
          </div>
        </div>
        <p>Ahora puedes continuar configurando los perfiles de tus hijos.</p>
        <p style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/onboarding/hijos" class="cta">Configurar hijos</a>
        </p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Starbiz Academy. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function getFamilyCodesHtml(
  firstName: string,
  parentCode: string,
  childrenCodes: { name: string; code: string }[]
): string {
  const childrenHtml = childrenCodes
    .map(
      (c) => `
      <div style="background: #090653; padding: 16px; border-radius: 8px; margin-top: 12px; text-align: center;">
        <p style="color: #a5b4fc; font-size: 12px; margin-bottom: 4px;">${c.name}</p>
        <p style="color: white; font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 0;">${c.code}</p>
      </div>
    `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #191014; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        h1 { color: #191014; font-size: 24px; margin-bottom: 8px; }
        p { color: #8d586f; font-size: 16px; }
        .code-section { margin: 24px 0; }
        .code-section h3 { color: #191014; font-size: 16px; margin-bottom: 8px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 24px 0; }
        .warning p { color: #92400e; font-size: 14px; margin: 0; }
        .cta { display: inline-block; background: linear-gradient(90deg, #090653, #dc7aa4); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; }
        .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e4d3da; text-align: center; font-size: 14px; color: #8d586f; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Tus códigos de acceso familiar</h1>
        </div>
        <p>Hola ${firstName},</p>
        <p>¡Tu configuración está completa! Aquí están los códigos de acceso para tu familia.</p>

        <div class="code-section">
          <h3>Tu código (Padre)</h3>
          <div style="background: #090653; padding: 16px; border-radius: 8px; text-align: center;">
            <p style="color: white; font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 0;">${parentCode}</p>
          </div>
          <div class="warning">
            <p>⚠️ No compartas este código con tus hijos. Es solo para ti como administrador.</p>
          </div>
        </div>

        <div class="code-section">
          <h3>Códigos de tus hijos</h3>
          ${childrenHtml}
        </div>

        <p>Comparte estos códigos con tus hijos para que puedan iniciar sesión en la app CEO Junior.</p>

        <p style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/inicio" class="cta">Ir a mi panel</a>
        </p>

        <div class="footer">
          <p>© ${new Date().getFullYear()} Starbiz Academy. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Email sending functions
export async function sendWelcomeEmail(data: WelcomeEmailData) {
  if (!resend) {
    console.log('Skipping welcome email - Resend not configured')
    return
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: '¡Bienvenido a Starbiz Academy!',
      html: getWelcomeEmailHtml(data.firstName),
    })
  } catch (error) {
    console.error('Failed to send welcome email:', error)
  }
}

export async function sendPaymentConfirmationEmail(data: PaymentConfirmationData) {
  if (!resend) {
    console.log('Skipping payment confirmation email - Resend not configured')
    return
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: 'Confirmación de pago - Starbiz Academy',
      html: getPaymentConfirmationHtml(data.firstName, data.planName, data.amount),
    })
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error)
  }
}

export async function sendFamilyCodesEmail(data: FamilyCodesEmailData) {
  if (!resend) {
    console.log('Skipping family codes email - Resend not configured')
    return
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: 'Tus códigos de acceso familiar - Starbiz Academy',
      html: getFamilyCodesHtml(data.firstName, data.parentCode, data.childrenCodes),
    })
  } catch (error) {
    console.error('Failed to send family codes email:', error)
  }
}
