import generatJWT from "../helpers/generarJWT.js";
import { Usuario } from "../models/index.js"; // Asegúrate de que el modelo esté correctamente importado
import {
  enviarEmailCambioPassword,
  enviarEmailConfirmacion,
} from "../services/emailServices.js";
import { generarToken } from "../helpers/generarToken.js";
import { isAdmin } from "../middlewares/authMiddleware.js";
import bcrypt from "bcrypt";

const usuarioResolver = {
  Query: {
    obtenerUsuario: async (root, args, context) => {
      const { usuario } = context;
      return usuario;
    },
    obtenerUsuarios: isAdmin(async () => {
      // Obtén el token de la cabecera de autorización
      try {
        const usuarios = await Usuario.findAll({
          attributes: [
            "id",
            "nombre",
            "apellido",
            "correo",
            "rol",
            "imagen",
            "estadoAfiliacion",
            "genero",
            "cargo",
            "area",
            "sede",
          ],
        });
        return usuarios;
      } catch (error) {
        console.error("Error al consultar los usuarios:", error);
        throw error;
      }
    }),
    obtenerUsuarioPorId: async (root, { id }) => {
      try {
        const usuario = await Usuario.findByPk(id, {
          attributes: {
            exclude: ["password", "token"],
          },
        });

        if (!usuario) {
          throw new Error("Usuario no encontrado");
        }
        return usuario;
      } catch (error) {
        console.error("Error al consultar el usuario:", error);
        throw error;
      }
    },

    solicitarCambioPassword: async (root, { correo }) => {
      const usuario = await Usuario.findOne({
        where: { correo },
        attributes: {
          include: ["token", "nombre", "correo"],
        },
      });

      if (!usuario) {
        throw new Error("El correo no está registrado");
      }

      // Generar un token único y de un solo uso
      const token = generarToken();
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
    obtenerConductores: isAdmin(async ()=>{
      const conductores = await Usuario.findAll({
        where: { rol: "conductor" },
      });

      return conductores
    })
  },
  Mutation: {
    crearUsuario: isAdmin(async (root, { req }) => {
      const { correo } = req;

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
    autenticarUsuario: async (_, { req }, { res }) => {
      const { correo, password } = req;

      try {
        // Simulación de búsqueda de usuario en base de datos
        const usuario = await Usuario.findOne({ where: { correo } });

        if (!usuario) {
          throw new Error("El usuario no existe");
        }

        if (!usuario.confirmado) {
          throw new Error("Tu cuenta no ha sido confirmada");
        }

        const isPasswordCorrect = await usuario.comprobarPassword(password);
        if (!isPasswordCorrect) {
          throw new Error("La contraseña es incorrecta");
        }

        // Generar el token
        const token = generatJWT(usuario.id);

        return {
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            cc: usuario.cc,
            telefono: usuario.telefono,
            imagen: usuario.imagen,
            rol: usuario.rol,
          },
          token,
        };

      } catch (error) {
        console.error("Error en el resolver:", error.message); // Registrar el error en el servidor
        throw error; // Lanzar el error para que Apollo lo maneje
      }
    },
    actualizarUsuario: async (root, { id, req }) => {
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
    confirmarUsuario: async (root, { id }) => {
      try {
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
          throw new Error("Usuario no encontrado");
        }

        usuario.confirmado = true;
        await usuario.save();

        return "Usuario confirmado exitosamente";
      } catch (error) {
        console.error("Error al confirmar el usuario:", error);
        throw error;
      }
    },
    eliminarUsuario: isAdmin(async () => {
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
    cambiarPassword: async (root, { token, nuevaPassword }) => {
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
    }
  },
};

export default usuarioResolver;
