import sequelize from "../config/db.js";
import { Campo, Formulario, RespuestaDetalle, RespuestaFormulario } from "../models/index.js";

const respuestaFormularioResolver = {
  Query: {
    obtenerRespuestas: async (_, { formularioId }) => {
      return RespuestaFormulario.findAll({
        where: { formularioId },
        include: [
          { model: RespuestaDetalle, as: "detalles" },
          { model: Formulario, as: "formulario", attributes: ["FormularioId", "Nombre", "Descripcion", "Imagen"] }
        ],
      });
    },

    obtenerRespuestaPorId: async (_, { formularioId }) => {
      return RespuestaFormulario.findByPk(formularioId, {
        include: [
          { model: RespuestaDetalle, as: "detalles" },
          { model: Formulario, as: "formulario", attributes: ["FormularioId", "Nombre", "Descripcion", "Imagen"] }
        ],
      });
    },

    obtenerRespuestasPorUsuario: async (_, { UsuarioId }) => {
      console.log(UsuarioId)
      return RespuestaFormulario.findAll({
        where: { UsuarioId },
        include: [
          {
            model: RespuestaDetalle,
            as: "detalles",
            // Incluir también la relación con la tabla Campo:
            include: [
              {
                model: Campo,
                as: "campo",
                // Selecciona las columnas que quieres de la tabla Campo:
                attributes: ["CampoId", "Nombre"],
              },
            ],
          },
          {
            model: Formulario,
            as: "formulario",
            attributes: ["FormularioId", "Nombre", "Descripcion", "Imagen"],
          },
        ],
      });
    },
    

    obtenerRespuestasPorFormularioYUsuario: async (_, { formularioId, usuarioId }) => {
      try {
        const respuestas = await RespuestaFormulario.findAll({
          where: {
            FormularioId: formularioId,
            UsuarioId: usuarioId,
          },
          include: [
            { model: RespuestaDetalle, as: "detalles" },
            { model: Formulario, as: "formulario", attributes: ["FormularioId", "Nombre", "Descripcion", "Imagen"] }
          ],
        });

        return respuestas;
      } catch (error) {
        console.error("Error al obtener respuestas:", error);
        throw new Error("No se pudieron obtener las respuestas.");
      }
    },
  },

  Mutation: {
    registrarRespuesta: async (_, { input }) => {
      const transaction = await sequelize.transaction();
      try {
        const { FormularioId, UsuarioId, detalles } = input;

        // Crear el registro de la tabla RespuestaFormulario
        const respuestaFormulario = await RespuestaFormulario.create(
          {
            FormularioId,
            UsuarioId,
          },
          { transaction }
        );

        const respuestaFormularioId = respuestaFormulario.RespuestaFormularioId;

        // Crear registros para RespuestaDetalles
        const detallesToInsert = detalles.map((detalle) => ({
          CampoId: detalle.CampoId,
          Valor: detalle.valor,
          RespuestaFormularioId: respuestaFormularioId,
        }));

        await RespuestaDetalle.bulkCreate(detallesToInsert, { transaction });

        // Confirmar transacción
        await transaction.commit();

        return respuestaFormulario;
      } catch (error) {
        await transaction.rollback();
        console.error("Error al registrar respuesta:", error);
        throw new Error("No se pudo registrar la respuesta.");
      }
    },

    editarRespuesta: async (_, { id, input }) => {
      const { detalles } = input;

      await RespuestaDetalle.destroy({
        where: { RespuestaFormularioId: id },
      });

      const detallesToInsert = detalles.map((detalle) => ({
        ...detalle,
        RespuestaFormularioId: id,
      }));

      await RespuestaDetalle.bulkCreate(detallesToInsert);

      return RespuestaFormulario.findByPk(id, {
        include: [{ model: RespuestaDetalle }],
      });
    },
  },
};

export default respuestaFormularioResolver;
