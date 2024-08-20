import generatJWT from "../helpers/generarJWT.js";
import Usuario from "../models/Usuario.js"; // Asegúrate de que el modelo esté correctamente importado
import jwt from 'jsonwebtoken';

const usuarioResolver = {
  Query: {
    obtenerUsuario: async (_, __, ctx) => {

      // Obtén el token de la cabecera de autorización
      if (!ctx.headers.authorization || !ctx.headers.authorization.startsWith('Bearer')) {
        throw new Error("Token no proporcionado");
      }

      const token = ctx.headers.authorization.split(" ")[1]; // Esto asume que el token se envía como "Bearer <token>"
      
      if (!token) {
        throw new Error("Token no válido");
      }

      console.log(process.env.JWT_SECRET)

      try {
        // Verifica el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(decoded)
        // Busca el usuario en la base de datos usando Sequelize
        const usuario = await Usuario.findOne({
          where: { id: decoded.id },
          attributes: { exclude: ['password', 'confirmado', 'token', 'createdAt', 'updatedAt'] },
        });

        console.log(usuario)

        if (!usuario) {
          throw new Error("Usuario no encontrado");
        }

        return usuario;
      } catch (error) {
        throw new Error("Hubo un error en la autenticación");
      }
    },
    obtenerUsuarios: async (_, __, ctx) => {
      // Obtén el token de la cabecera de autorización
      try {
        const usuarios = await Usuario.findAll({
          attributes: { exclude: ['password', 'confirmado', 'token', 'createdAt', 'updatedAt'] },
        });
        return usuarios;
      } catch (error) {
        console.error('Error al consultar los usuarios:', error);
        throw error;
      }r
    }
  },
  Mutation: {
    nuevoUsuario: async (_, { req }) => {
      const { correo } = req;

      // Consultar usuario
      const existeUsuario = await Usuario.findOne({ where: { correo } });
      if (existeUsuario) {
        throw new Error("El usuario ya está registrado");
      }

      try {
        // Crear y guardar en la base de datos
        const usuario = await Usuario.create(req);
        return usuario;
      } catch (error) {
        console.log(error);
        throw new Error("Hubo un error al crear el usuario");
      }
    },
    autenticarUsuario: async (_, { req }) => {
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
            rol: usuario.rol,
          },
          token: generatJWT(usuario.id),
        };
      } else {
        throw new Error("La contraseña es incorrecta");
      }
    },
    actualizarUsuario: async (_, { id, req }) => {
      try {
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
          throw new Error("Usuario no encontrado");
        }

        // Actualizar los datos del usuario
        await usuario.update(req);
        return usuario;
      } catch (error) {
        console.error('Error al actualizar el usuario:', error);
        throw error;
      }
    },
    confirmarUsuario: async (_, { id }) => {
      try {
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
          throw new Error("Usuario no encontrado");
        }

        usuario.confirmado = true;
        await usuario.save();

        return usuario;
      } catch (error) {
        console.error('Error al confirmar el usuario:', error);
        throw error;
      }
    },
    eliminarUsuario: async (_, { id }) => {
      try {
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
          throw new Error("Usuario no encontrado");
        }

        await usuario.destroy();

        return "Usuario eliminado correctamente";
      } catch (error) {
        console.error('Error al eliminar el usuario:', error);
        throw error;
      }
    },
  },
};

export default usuarioResolver;
