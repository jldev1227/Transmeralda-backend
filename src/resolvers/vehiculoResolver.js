import { isAdmin } from '../middlewares/authMiddleware.js';
import { Usuario, Vehiculo } from '../models/index.js';

const vehiculoResolver = {
  Vehiculo: {
    conductor: async (parent) => {
      return await Usuario.findByPk(parent.conductorId);
    },
    propietario: async (parent) => {
      return await Usuario.findByPk(parent.propietarioId);
    }
  },
  Query: {
    obtenerVehiculos: isAdmin(async () => {
      return await Vehiculo.findAll({
        include: [
          { model: Usuario, as: 'conductor' },
          { model: Usuario, as: 'propietario' }
        ]
      });
    }),
    obtenerVehiculo: isAdmin(async (_, { id }) => {
      return await Vehiculo.findByPk(id);
    }),
  },
  Mutation: {
    crearVehiculo: isAdmin(async (_, { req }) => {
      return await Vehiculo.create(req);
    }),
    actualizarVehiculo: isAdmin(async (_, { id, req }) => {
      const vehiculo = await Vehiculo.findByPk(id);
      if (!vehiculo) {
        throw new Error('Vehículo no encontrado');
      }
      return await vehiculo.update(req);
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
