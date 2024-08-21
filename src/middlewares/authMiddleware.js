// src/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
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
    const user = await Usuario.findOne({ where: { id: decoded.id }, attributes: ["id", "rol"] });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Aquí regresamos el usuario para usarlo en el contexto
    return { user };
  } catch (error) {
    throw new Error("Hubo un error en la autenticación");
  }
};

export const isAdmin = (next) => (root, args, context, info) => {
  if (!context.user.rol || context.user.rol !== 'admin') {
    throw new Error("No autorizado, se requiere el rol de admin.");
  }
  return next(root, args, context, info);
};
