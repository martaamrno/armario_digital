import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
import logging

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, html_content: str):
    """
    Sends an HTML email using the SMTP settings configured in the app.
    """
    if not settings.smtp_password:
        logger.warning(f"SMTP_PASSWORD not configured. Skipping email to {to_email}")
        print(f"DEBUG: HTML Email to {to_email} would be sent if SMTP_PASSWORD was set.")
        print(f"Subject: {subject}")
        return

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = f"OutfitLab <{settings.smtp_user}>"
        msg['To'] = to_email
        msg['Subject'] = subject

        # Create the HTML part
        part = MIMEText(html_content, 'html')
        msg.attach(part)

        server = smtplib.SMTP(settings.smtp_server, settings.smtp_port)
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        text = msg.as_string()
        server.sendmail(settings.smtp_user, to_email, text)
        server.quit()
        logger.info(f"HTML Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        print(f"ERROR sending email: {e}")

def get_base_template(content: str):
    return f"""
    <html>
    <head>
        <style>
            .container {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            }}
            .header {{
                background: linear-gradient(135deg, #5D2E46 0%, #E27396 100%);
                padding: 40px 20px;
                text-align: center;
                color: white;
            }}
            .body {{
                padding: 40px;
                color: #2D3142;
                line-height: 1.6;
            }}
            .footer {{
                background-color: #F8F9FA;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #6C757D;
            }}
            .button {{
                display: inline-block;
                padding: 14px 28px;
                background-color: #E27396;
                color: white;
                text-decoration: none;
                border-radius: 30px;
                font-weight: bold;
                margin-top: 20px;
            }}
            .logo {{
                font-size: 28px;
                font-weight: bold;
                letter-spacing: 1px;
                margin-bottom: 10px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">OutfitLab</div>
                <div>Tu asistente de estilo inteligente</div>
            </div>
            <div class="body">
                {content}
            </div>
            <div class="footer">
                &copy; 2026 OutfitLab. Todos los derechos reservados.<br>
                Hecho con &hearts; para amantes de la moda.
            </div>
        </div>
    </body>
    </html>
    """

def send_welcome_email_real(to_email: str, nombre: str):
    subject = f"¡Bienvenida a OutfitLab, {nombre}! ✨"
    content = f"""
        <h2 style="color: #5D2E46;">¡Hola {nombre}!</h2>
        <p>Estamos encantados de tenerte en <strong>OutfitLab</strong>. Gracias por registrarte y confiar en nosotros para organizar tu armario.</p>
        <p>A partir de ahora, podrás:</p>
        <ul>
            <li>Digitalizar todas tus prendas con un clic.</li>
            <li>Generar combinaciones automáticas con IA.</li>
            <li>Crear tu propio avatar de estilo.</li>
        </ul>
        <a href="http://localhost:5173" class="button">Entrar a mi Armario</a>
        <p style="margin-top: 30px;">¡Esperamos que disfrutes la experiencia!</p>
    """
    send_email(to_email, subject, get_base_template(content))

def send_subscription_email_real(to_email: str, monto: float):
    subject = "¡Ya eres Premium en OutfitLab! 💎"
    content = f"""
        <h2 style="color: #5D2E46;">¡Felicidades por tu suscripción!</h2>
        <p>Tu cuenta ha sido actualizada a <strong>Premium</strong> correctamente. Ya tienes acceso ilimitado a todas nuestras herramientas avanzadas.</p>
        <div style="background-color: #F8F9FA; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Detalles del pago:</strong></p>
            <p style="margin: 5px 0;">Monto: {monto}€</p>
            <p style="margin: 5px 0;">Plan: Suscripción Premium Ilimitada</p>
        </div>
        <p>Gracias por apoyar el desarrollo de <strong>OutfitLab</strong>. ¡Sácale el máximo partido a tu estilo!</p>
        <a href="http://localhost:5173" class="button">Explorar Ventajas Premium</a>
    """
    send_email(to_email, subject, get_base_template(content))
