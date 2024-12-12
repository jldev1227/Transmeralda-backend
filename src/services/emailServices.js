// services/emailService.js
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Host correcto para Gmail
  port: 587, // Puerto SMTP seguro
  secure: false, // Usar STARTTLS
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS,
  },
});

export const enviarEmailConfirmacion = async (email, nombre, token) => {
  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: email,
    subject: "Transmeralda - Comprueba tu cuenta",
    text: "Comprueba tu cuenta en Transmeralda",
    html: `<p>Hola ${nombre}, comprueba tu cuenta en Transmeralda</p>
    <p>Tu cuenta ya está casi lista, solo debes comprobarla en el siguiente enlace:</p>
    <p><a href="http://192.168.20.191:4000/deeplink-confirm/${token}" style="color: blue; text-decoration: underline;">Comprobar Cuenta</a></p>
    <p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error al enviar correo de confirmación:", error);
  }
};

export const enviarEmailCambioPassword = async (email, nombre, token) => {
  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: email,
    subject: "Transmeralda - Restablece tu contraseña",
    text: "Restablece tu contraseña en Transmeralda",
    html: `<p>Hola ${nombre},</p>
      <p>Puedes restablecer tu contraseña en el siguiente enlace:</p>
      <p><a href="transmeralda://NuevoPassword/${token}" style="color: blue; text-decoration: underline;">Restablecer Contraseña</a></p>
      <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>`,
  };
  
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error al enviar correo de confirmación:", error);
  }
};