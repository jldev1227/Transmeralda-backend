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

export const enviarEmailCambioPassword = async (email, nombre, codigo) => {
  // Dividir el código en sus dígitos y crear un bloque HTML para cada uno
  const codigoHTML = codigo
    .split("") // separa cada dígito
    .map(
      (digit) => `
      <div 
        style="
          display: inline-block;
          width: 40px; 
          height: 40px; 
          line-height: 35px;
          text-align: center; 
          margin-right: 5px; 
          border: 1px solid #ccc; 
          border-radius: 4px;
          font-size: 18px;
          font-weight: bold;
          background-color: #f8f8f8;
        "
      >
        ${digit}
      </div>
    `
    )
    .join("");

  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: email,
    subject: "Transmeralda - Restablece tu contraseña",
    text: "Restablece tu contraseña en Transmeralda",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #2c6e49;">Restablece tu contraseña</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Para restablecer tu contraseña, introduce el siguiente código en la app:</p>
        <div style="margin: 20px 0;">
          ${codigoHTML}
        </div>
        <p style="margin-top: 20px;">
          Si no solicitaste este cambio, puedes ignorar este mensaje.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error al enviar correo de confirmación:", error);
  }
};
