// src/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/index.js';
import dotenv from 'dotenv';

dotenv.config();

export const authenticateUser = async (req) => {
  const authHeader = req.headers.authorization || '';
  
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Token no proporcionado");
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    throw new Error("Token no válido");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findOne({
      where: { id: decoded.id },
      attributes: ['id', 'nombre', 'apellido', 'correo', 'cc', 'telefono', 'imagen', 'rol'], // Especificamos los campos que queremos obtener del usuario
    });

    if (!usuario) {
      throw new Error("Usuario no encontrado");
    }

    // Aquí regresamos el usuario para usarlo en el contexto
    return { usuario };
  } catch (error) {
    // Manejo del error
    console.error(error);
    throw new Error("Hubo un error en la autenticación");
  }
};

export const isAdmin = (next) => (root, args, context, info) => {
  if (!context.usuario.rol || context.usuario.rol !== 'admin') {
    throw new Error("No autorizado, se requiere el rol de admin.");
  }
  return next(root, args, context, info);
};
