import { isAdmin } from '../middlewares/authMiddleware.js';
import { Vehiculo } from '../models/index.js';

const vehiculoResolver = {
  Query: {
    obtenerVehiculos: isAdmin(async () => {
      return await Vehiculo.findAll();
    }),
    obtenerVehiculo: isAdmin(async (_, { id }) => {
      return await Vehiculo.findByPk(id);
    }),
  },
  Mutation: {
    crearVehiculo: isAdmin(async (_, { input }) => {
      return await Vehiculo.create(input);
    }),
    actualizarVehiculo: isAdmin(async (_, { id, input }) => {
      const vehiculo = await Vehiculo.findByPk(id);
      if (!vehiculo) {
        throw new Error('Vehículo no encontrado');
      }
      return await vehiculo.update(input);
    }),
    eliminarVehiculo: isAdmin(async (_, { id }) => {
      const vehiculo = await Vehiculo.findByPk(id);
      if (!vehiculo) {
        throw new Error('Vehículo no encontrado');
      }
      await vehiculo.destroy();
      return true;
    }),
  },
};

export default vehiculoResolver;
