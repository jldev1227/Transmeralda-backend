// services/emailService.js
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'SSLv3'
  }
});

export const enviarEmailConfirmacion = async (email, nombre, token) => {

  console.log(email, nombre, token)
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
    console.log("Correo de confirmación enviado");
  } catch (error) {
    console.error("Error al enviar correo de confirmación:", error);
  }
};

export const enviarEmailCambioPassword = async (email, nombre, token) => {

  console.log(email, nombre, token)
  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: email,
    subject: "Transmeralda - Cambia tu contraseña",
    text: "Cambia la contraseña de tu cuenta en Transmeralda",
    html: `<p>Hola ${nombre}, Solicistaste un cambio de contraseña</p>
    <p>Para proceder con el cambio ingresa en el siguiente enlace:</p>
    <a href="http://192.168.20.191:4000/nuevo-password/${token}">Cambiar contraseña</a>
    <p>Si no solicistaste el cambio de contraseña, puedes ignorar este mensaje.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Correo de confirmación enviado");
  } catch (error) {
    console.error("Error al enviar correo de confirmación:", error);
  }
};