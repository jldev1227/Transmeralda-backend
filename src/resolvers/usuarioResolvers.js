import generatJWT from "../helpers/generarJWT.js";
import Usuario from "../models/Usuario.js"; // Asegúrate de que el modelo esté correctamente importado
import jwt from "jsonwebtoken";
import { enviarEmailCambioPassword, enviarEmailConfirmacion } from "../services/emailServices.js";
import { generarToken } from "../helpers/generarToken.js";
import { isAdmin } from "../middlewares/authMiddleware.js";
import bcrypt from 'bcrypt'

const usuarioResolver = {
  Query: {
    obtenerUsuario: async (_, __, ctx) => {
      // Obtén el token de la cabecera de autorización
      if (
        !ctx.headers.authorization ||
        !ctx.headers.authorization.startsWith("Bearer")
      ) {
        throw new Error("Token no proporcionado");
      }
      
      const token = ctx.headers.authorization.split(" ")[1];
      
      if (!token) {
        throw new Error("Token no válido");
      }
      
      try {
        // Verifica el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
        // Busca el usuario en la base de datos usando Sequelize
        const usuario = await Usuario.findOne({
          where: { id: decoded.id },
          attributes: {
            exclude: [
              "password",
              "confirmado",
              "token",
              "createdAt",
              "updatedAt",
            ],
          },
        });
      
        if (!usuario) {
          console.log('no hay usuario')
          throw new Error("Usuario no encontrado");
        }
      
        return usuario;
      } catch (error) {
        if (error.message === "jwt expired") {
          throw new Error("El token ha expirado");
        } else if (error.message === "jwt malformed") {
          throw new Error("Token malformado");
        } else if (error.message === "invalid token") {
          throw new Error("Token inválido");
        } else {
          throw new Error("Hubo un error en la autenticación");
        }
      }      
    },
    obtenerUsuarios: isAdmin(async (root, args, context) => {
      // Obtén el token de la cabecera de autorización
      try {
        const usuarios = await Usuario.findAll({
          attributes: {
            exclude: ["password", "token", "createdAt", "updatedAt"],
          },
        });
        return usuarios;
      } catch (error) {
        console.error("Error al consultar los usuarios:", error);
        throw error;
      }
      r;
    }),
    solicitarCambioPassword: async (_, { correo }) => {
      const usuario = await Usuario.findOne({ where: { correo }, attributes: {
        include: ["token", "nombre", "correo"]
      } });

      if (!usuario) {
        throw new Error("El correo no está registrado");
      }

      // Generar un token único y de un solo uso
      const token = generarToken()
      usuario.token = token;
      await usuario.save();

      // Enviar el correo electrónico
      await enviarEmailCambioPassword(
        usuario.correo,
        usuario.nombre,
        usuario.token
      );

      return "Se ha enviado un correo con las instrucciones para cambiar la contraseña.";
    },
  },
  Mutation: {
    nuevoUsuario: isAdmin(async (_, { req }, context ) => {
      const { correo } = req

      // Consultar usuario
      const existeUsuario = await Usuario.findOne({ where: { correo } });
      if (existeUsuario) {
        throw new Error("El usuario ya está registrado");
      }

      try {
        
        // Crear y guardar en la base de datos
        const usuario = await Usuario.create(req);

        // Enviar correo de confirmación de cuenta
        await enviarEmailConfirmacion(req.correo, req.nombre, usuario.token);
        return usuario;
      } catch (error) {
        console.log(error);
        throw new Error("Hubo un error al crear el usuario");
      }
    }),
    autenticarUsuario: async (_, { req }, context) => {
      const { correo, password } = req;

      // Buscar el usuario por correo
      const usuario = await Usuario.findOne({ where: { correo } });

      if (!usuario) {
        throw new Error("El usuario no existe");
      }

      if (!usuario.confirmado) {
        throw new Error("Tu cuenta no ha sido confirmada");
      }

      // Comparar la contraseña
      const isPasswordCorrect = await usuario.comprobarPassword(password); // Necesitas una función en el modelo para comparar contraseñas

      if (isPasswordCorrect) {
        return {
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            telefono: usuario.telefono,
            imagen: usuario.imagen,
            rol: usuario.rol,
          },
          token: generatJWT(usuario.id),
        };
      } else {
        throw new Error("La contraseña es incorrecta");
      }
    },
    actualizarUsuario: async (_, { id, req }, context) => {
      try {
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
          throw new Error("Usuario no encontrado");
        }

        // Actualizar los datos del usuario
        await usuario.update(req);
        return usuario;
      } catch (error) {
        console.error("Error al actualizar el usuario:", error);
        throw error;
      }
    },
    confirmarUsuario: async (_, { id }, context) => {
      try {
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
          throw new Error("Usuario no encontrado");
        }

        usuario.confirmado = true;
        await usuario.save();

        return 'Usuario confirmado exitosamente';
      } catch (error) {
        console.error("Error al confirmar el usuario:", error);
        throw error;
      }
    },
    eliminarUsuario: isAdmin(async (root, args, context) => {
      console.log(args)
      try {
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
          throw new Error("Usuario no encontrado");
        }

        await usuario.destroy();

        return "Usuario eliminado correctamente";
      } catch (error) {
        console.error("Error al eliminar el usuario:", error);
        throw error;
      }
    }),
    cambiarPassword: async (_, { token, nuevaPassword }) => {
      const usuario = await Usuario.findOne({ where: { token } });

      if (!usuario) {
        throw new Error("Token inválido o ha expirado");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

      // Cambiar la contraseña del usuario
      usuario.password = hashedPassword;
      usuario.token = null; // Limpiar el token después de usarlo
      await usuario.save();

      return "Tu contraseña ha sido cambiada con éxito";
    },
  },
};

export default usuarioResolver;
