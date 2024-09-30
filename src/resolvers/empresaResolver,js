import { Empresa } from "../models/index.js";

const empresaResolvers = {
  Query: {
    obtenerEmpresas: async () => {
      try {
        return await Empresa.findAll();
      } catch (error) {
        throw new Error('Error al obtener empresas');
      }
    },
    obtenerEmpresa: async (_, { id }) => {
      try {
        const empresa = await Empresa.findByPk(id);
        if (!empresa) throw new Error('Empresa no encontrada');
        return empresa;
      } catch (error) {
        throw new Error('Error al obtener la empresa');
      }
    },
  },
  Mutation: {
    crearEmpresa: async (_, { input }) => {
      try {
        const nuevaEmpresa = await Empresa.create(input);
        return nuevaEmpresa;
      } catch (error) {
        throw new Error('Error al crear la empresa');
      }
    },
    actualizarEmpresa: async (_, { id, input }) => {
      try {
        const empresa = await Empresa.findByPk(id);
        if (!empresa) throw new Error('Empresa no encontrada');

        await empresa.update(input);
        return empresa;
      } catch (error) {
        throw new Error('Error al actualizar la empresa');
      }
    },
    eliminarEmpresa: async (_, { id }) => {
      try {
        const empresa = await Empresa.findByPk(id);
        if (!empresa) throw new Error('Empresa no encontrada');

        await empresa.destroy();
        return 'Empresa eliminada correctamente';
      } catch (error) {
        throw new Error('Error al eliminar la empresa');
      }
    },
  },
};

export default empresaResolvers;
