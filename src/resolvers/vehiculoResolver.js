import DocumentoVehiculo from '../models/DocumentoVehiculo';
import Usuario from '../models/Usuario.js';
import Vehiculo from '../models/Vehiculo.js'

const vehiculoResolver = {
  Mutation: {
    crearVehiculo: async (_, { input }) => {
      const { placa, tipo, modelo, propietarioId, conductorId, documentos } = input;

      try {
        // Buscar el propietario y el conductor en la base de datos
        const propietario = await Usuario.findByPk(propietarioId);
        const conductor = await Usuario.findByPk(conductorId);

        if (!propietario || !conductor) {
          throw new Error('Propietario o Conductor no encontrados');
        }

        // Crear el vehículo
        const vehiculo = await Vehiculo.create({
          placa,
          tipo,
          modelo,
          propietarioId: propietario.id,
          conductorId: conductor.id
        });

        // Crear los documentos y asociarlos al vehículo
        const documentosCreacion = documentos.map(doc => ({
          tipo: doc.tipo,
          url: doc.url,
          vehiculoId: vehiculo.id
        }));
        
        const documentosRegistrados = await Documento.bulkCreate(documentosCreacion);

        // Asociar los documentos al vehículo
        await vehiculo.setDocumentos(documentosRegistrados);

        return vehiculo;
      } catch (error) {
        throw new Error('Error al crear el vehículo: ' + error.message);
      }
    },

    agregarDocumentoVehiculo: async (_, { vehiculoId, documento }) => {
      try {
        // Buscar el vehículo
        const vehiculo = await Vehiculo.findByPk(vehiculoId);

        if (!vehiculo) {
          throw new Error('Vehículo no encontrado');
        }

        // Crear el documento y asociarlo al vehículo
        const nuevoDocumento = await Documento.create({
          tipo: documento.tipo,
          url: documento.url,
          vehiculoId: vehiculo.id
        });

        return vehiculo;
      } catch (error) {
        throw new Error('Error al agregar el documento: ' + error.message);
      }
    }
  }
};

module.exports = vehiculoResolver;
