import GraphQLUpload from "graphql-upload/GraphQLUpload.mjs";
import axios from "axios";
import { uploadFileToAzure } from "../config/azureConnect.js";
import { isAdmin } from "../middlewares/authMiddleware.js";
import { Usuario, Vehiculo } from "../models/index.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
// import { extractDataFromOCR } from "../utils/ocr.js"; // Función que procesa la respuesta OCR para obtener datos del vehículo
import FormData from "form-data"; // Necesitarás instalar esto si no lo tienes: npm install form-data

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
      return await Vehiculo.findByPk(id);
    }),
  },
  Mutation: {
    uploadFile: async (parent, { file, placa, name }) => {
      const { createReadStream, filename, mimetype } = await file;

      if (mimetype !== "application/pdf") {
        throw new Error("Only PDF files are allowed.");
      }

      try {
        // Crear un FormData para enviar el archivo
        const form = new FormData();
        form.append("file", createReadStream(), {
          filename,
          contentType: mimetype,
        });

        // URL de Azure Computer Vision
        const visionEndpoint =
          "https://transmeraldacomputervision.cognitiveservices.azure.com/vision/v3.2/read/analyze";
        const subscriptionKey = process.env.AZURE_VISION_KEY; // Asegúrate de tener esta variable de entorno definida

        // Hacer la solicitud POST a Azure Computer Vision
        const response = await axios.post(visionEndpoint, form, {
          headers: {
            "Ocp-Apim-Subscription-Key": subscriptionKey,
            ...form.getHeaders(), // Incluye los headers correctos de FormData
          },
        });

        // Obtener la URL del Operation-Location de la respuesta
        const operationLocation = response.headers["operation-location"];

        if (!operationLocation) {
          throw new Error(
            "No se pudo obtener la ubicación de la operación de OCR."
          );
        }

        let status = "running";
        let ocrData;

        // Repetir la petición hasta que el estado cambie a "succeeded"
        while (status === "running") {
          // Esperar 2 segundos antes de la siguiente consulta
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Realizar la petición GET para obtener el estado del análisis
          const ocrResponse = await axios.get(operationLocation, {
            headers: {
              "Ocp-Apim-Subscription-Key": subscriptionKey,
            },
          });

          // Extraer el estado actual y los datos
          status = ocrResponse.data.status;
          ocrData = ocrResponse.data;

          console.log(`Estado del OCR: ${status}`);
        }

        // if (status === "succeeded") {
        //   const vehiculoORC = extractDataFromOCR(ocrData);
        //   console.log(vehiculoORC)
        //   // Crear el vehículo en la base de datos con los datos extraídos
        //   const nuevoVehiculo = await Vehiculo.create(vehiculoORC);

        //   const formattedName = name.replace(/\s+/g, '_').toUpperCase(); // Reemplaza espacios por guiones bajos y convierte a mayúsculas
        //   const finalFilename = `${placa}_${formattedName}.pdf`; // Concatenar la placa y el nombre formateado

        //   // Retornar el vehículo creado o cualquier dato relevante
        //   const stream = createReadStream();
        //   const blobUrl = await uploadFileToAzure(placa, stream, finalFilename);

        //   return
      
        //   // Retorna la información del archivo subido incluyendo la URL
        //   return {
        //     filename: finalFilename,
        //     mimetype,
        //     encoding,
        //     url: blobUrl,  // Incluye la URL del archivo subido
        //   };
        // } else {
        //   throw new Error("El OCR no pudo completarse exitosamente.");
        // }
      } catch (error) {
        console.error(
          "Error processing the file or retrieving data from OCR:",
          error
        );
        throw new Error(
          "Error processing the file or retrieving data from OCR"
        );
      }
    },
  },
};

export default vehiculoResolver;
