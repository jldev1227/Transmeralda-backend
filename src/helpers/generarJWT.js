import jwt from 'jsonwebtoken'

const generatJWT = (usuario) => {
  return jwt.sign(
    {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      rol: usuario.rol,
      // Puedes incluir correo u otros datos que necesites
    },
    process.env.JWT_SECRET, // Asegúrate de tener tu secreto en variables de entorno
    { expiresIn: '30d' }     // Ajusta el tiempo de expiración que necesites
  );
};

export default generatJWT;