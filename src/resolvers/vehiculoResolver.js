import GraphQLUpload from "graphql-upload/GraphQLUpload.mjs";
import { uploadFileToAzure } from "../config/azureConnect.js";
import { isAdmin } from "../middlewares/authMiddleware.js";
import { Usuario, Vehiculo } from "../models/index.js";
import { createWriteStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Definir __dirname en un módulo ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const vehiculoResolver = {
  Upload: GraphQLUpload,
  Vehiculo: {
    conductor: async (parent) => {
      return await Usuario.findByPk(parent.conductorId);
    },
    propietario: async (parent) => {
      return await Usuario.findByPk(parent.propietarioId);
    },
  },
  Query: {
    obtenerVehiculos: isAdmin(async () => {
      return await Vehiculo.findAll({
        include: [
          { model: Usuario, as: "conductor" },
          { model: Usuario, as: "propietario" },
        ],
      });
    }),
    obtenerVehiculo: isAdmin(async (_, { id }) => {
      console.log("id", id);
      return await Vehiculo.findByPk(id);
    }),
  },
  Mutation: {
    crearVehiculo: isAdmin(async (_, { req }) => {
      await uploadFileToAzure(); // Suponiendo que aquí harás algo con el archivo
      return await Vehiculo.create(req);
    }),
    actualizarVehiculo: isAdmin(async (_, { id, req }) => {
      const vehiculo = await Vehiculo.findByPk(id);
      if (!vehiculo) {
        throw new Error("Vehículo no encontrado");
      }
      return await vehiculo.update(req);
    }),
    eliminarVehiculo: isAdmin(async (_, { id }) => {
      const vehiculo = await Vehiculo.findByPk(id);
      if (!vehiculo) {
        throw new Error("Vehículo no encontrado");
      }
      await vehiculo.destroy();
      return true;
    }),
    uploadFile: async (parent, { file, placa, name }) => {
      const { createReadStream, filename, mimetype, encoding } = await file;
    
      // Validar que la extensión del archivo sea .pdf
      if (mimetype !== 'application/pdf') {
        throw new Error('Only PDF files are allowed.');
      }
    
      // Crear el filename basado en placa y name
      const formattedName = name.replace(/\s+/g, '_').toUpperCase(); // Reemplaza espacios por guiones bajos y convierte a mayúsculas
      const finalFilename = `${placa}_${formattedName}.pdf`; // Concatenar la placa y el nombre formateado
    
      try {
        // Sube el archivo a Azure Blob Storage
        const stream = createReadStream();
        const blobUrl = await uploadFileToAzure(placa, stream, finalFilename);
    
        // Retorna la información del archivo subido incluyendo la URL
        return {
          filename: finalFilename,
          mimetype,
          encoding,
          url: blobUrl,  // Incluye la URL del archivo subido
        };
      } catch (error) {
        console.error('Error uploading file:', error);
        throw new Error('Error uploading file to Azure Blob Storage');
      }
    },
  },
};

export default vehiculoResolver;
