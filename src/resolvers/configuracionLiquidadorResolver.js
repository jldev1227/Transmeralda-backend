import { ConfiguracionLiquidador } from "../models/index.js"; // Asegúrate de que la ruta sea correcta

const configuracionLiquidadorResolver = {
  Query: {
    // Obtener todas las configuraciones
    configuracionesLiquidador: async () => {
      try {
        return await ConfiguracionLiquidador.findAll();
      } catch (error) {
        throw new Error("Error al obtener las configuraciones");
      }
    },
    // Obtener una configuración por ID
    configuracionLiquidador: async (_, { id }) => {
      try {
        const configuracion = await ConfiguracionLiquidador.findByPk(id);
        if (!configuracion) {
          throw new Error("Configuración no encontrada");
        }
        return configuracion;
      } catch (error) {
        throw new Error("Error al obtener la configuración");
      }
    },
  },

  Mutation: {
    // Registrar una nueva configuración
    crearConfiguracionLiquidador: async (_, { input }) => {
      try {
        const nuevaConfiguracion = await ConfiguracionLiquidador.create({
          nombre: input.nombre,
          valor: input.valor,
        });
        return nuevaConfiguracion;
      } catch (error) {
        throw new Error("Error al crear la configuración");
      }
    },

    // Actualizar una configuración existente
    actualizarConfiguracionesLiquidador: async (_, { id, input }) => {
      try {
        const configuracion = await ConfiguracionLiquidador.findByPk(id);
        if (!configuracion) {
          throw new Error('Configuración no encontrada');
        }

        await configuracion.update(input);
        return configuracion;
      } catch (error) {
        console.error("Error al actualizar la configuración:", error);
        throw new Error("Error al actualizar la configuración.");
      }
    }
  },
};

export default configuracionLiquidadorResolver;
