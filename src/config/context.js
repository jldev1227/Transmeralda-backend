// src/config/context.js
import { authenticateUser } from '../middlewares/authMiddleware.js';

export const createContext = async ({ req }) => {
    console.log(req)
  try {
    const { user, rol } = await authenticateUser(req);
    return { user, rol };
  } catch (error) {
    console.error("Error en la autenticación:", error.message);
    return { user: null, rol: null };
  }
};
