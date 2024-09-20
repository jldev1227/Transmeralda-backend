import GraphQLUpload from "graphql-upload/GraphQLUpload.mjs";
import axios from "axios";
import { uploadFileToAzure } from "../config/azureConnect.js";
import { isAdmin } from "../middlewares/authMiddleware.js";
import { Usuario, Vehiculo } from "../models/index.js";
import { spawn } from "child_process";
import FormData from "form-data"; // Necesitarás instalar esto si no lo tienes: npm install form-data
import { GraphQLError } from "graphql"; // Asegúrate de importar GraphQLError
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

// Define __dirname manualmente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    crearVehiculo: async (parent, { file, name }, { res }) => {
      const { createReadStream, filename, mimetype } = await file;

      if (mimetype !== "application/pdf") {
        res.status(400);
        throw new GraphQLError("Solo se permiten archivos PDF.", {
          extensions: {
            code: "BAD_USER_INPUT",
            statusCode: 400,
          },
        });
      }

      try {
        const form = new FormData();
        form.append("file", createReadStream(), {
          filename,
          contentType: mimetype,
        });

        const visionEndpoint = process.env.OCR_URL;
        const subscriptionKey = process.env.AZURE_VISION_KEY;

        let response;
        try {
          response = await axios.post(visionEndpoint, form, {
            headers: {
              "Ocp-Apim-Subscription-Key": subscriptionKey,
              ...form.getHeaders(),
            },
          });
        } catch (error) {
          res.status(500);
          throw new GraphQLError(
            "No se pudo procesar el archivo con Azure Computer Vision.",
            {
              extensions: {
                code: "EXTERNAL_SERVICE_ERROR",
                statusCode: 500,
              },
            }
          );
        }

        const operationLocation = response.headers["operation-location"];
        if (!operationLocation) {
          res.status(500);
          throw new GraphQLError(
            "No se pudo obtener la ubicación de la operación de OCR.",
            {
              extensions: {
                code: "EXTERNAL_SERVICE_ERROR",
                statusCode: 500,
              },
            }
          );
        }

        let status = "running";
        let ocrData;

        while (status === "running") {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            const ocrResponse = await axios.get(operationLocation, {
              headers: {
                "Ocp-Apim-Subscription-Key": subscriptionKey,
              },
            });

            status = ocrResponse.data.status;
            ocrData = ocrResponse.data;
          } catch (error) {
            res.status(500);
            throw new GraphQLError(
              "Error al obtener el estado de OCR de Azure.",
              {
                extensions: {
                  code: "EXTERNAL_SERVICE_ERROR",
                  statusCode: 500,
                },
              }
            );
          }
        }

        if (status === "succeeded") {
          try {
            if (!ocrData || Object.keys(ocrData).length === 0) {
              res.status(500);
              throw new GraphQLError(
                "Los datos de OCR están vacíos o no son válidos.",
                {
                  extensions: {
                    code: "INVALID_OCR_DATA",
                    statusCode: 500,
                  },
                }
              );
            }

            // Escribir los datos de OCR en un archivo temporal
            const tempFilePath = path.join(__dirname, "tempOcrData.json");
            await fs.writeFileSync(tempFilePath, JSON.stringify(ocrData));

            const vehiculoNuevo = await new Promise((resolve, reject) => {
              let vehiculoData = "";

              const vehiculoORC = spawn("python", [
                "src/utils/ocrVehiculo.py",
                tempFilePath,
              ]);

              vehiculoORC.stdout.on("data", (data) => {
                vehiculoData += data.toString();
              });

              vehiculoORC.stderr.on("data", (data) => {
                console.error(`Error del script de Python: ${data}`);
              });

              vehiculoORC.on("close", (code) => {
                fs.unlinkSync(tempFilePath);
                if (code === 0) {
                  try {
                    const resultado = JSON.parse(vehiculoData);
                    resolve(resultado);
                  } catch (error) {
                    reject(`Error al parsear el JSON: ${error}`);
                  }
                } else if (code === 1) {
                  reject(
                    new GraphQLError(
                      "El archivo no es válido o no es una tarjeta de propiedad válida.",
                      {
                        extensions: {
                          code: "BAD_USER_INPUT",
                          statusCode: 400,
                        },
                      }
                    )
                  );
                } else {
                  reject(
                    new GraphQLError(
                      `El proceso terminó con un código de error: ${code}`,
                      {
                        extensions: {
                          code: "INTERNAL_SERVER_ERROR",
                          statusCode: 500,
                        },
                      }
                    )
                  );
                }
              });
            });

            const nuevoVehiculo = await Vehiculo.create(vehiculoNuevo);
            const formattedName = name.replace(/\s+/g, "_").toUpperCase();
            const finalFilename = `${nuevoVehiculo.placa}_${formattedName}.pdf`;

            const stream = createReadStream();
            await uploadFileToAzure(nuevoVehiculo.placa, stream, finalFilename);

            return {
              success: true,
              vehiculo: nuevoVehiculo,
              message: 'Vehiculo creado exitosamente',
            };
          } catch (error) {
            handleGraphQLError(res, error);
          }
        } else {
          res.status(500);
          throw new GraphQLError("El OCR no pudo completarse exitosamente.", {
            extensions: {
              code: "EXTERNAL_SERVICE_ERROR",
              statusCode: 500,
            },
          });
        }
      } catch (error) {
        handleGraphQLError(res, error);
      }
    },
  },
};

// Función para manejar errores de GraphQL
function handleGraphQLError(res, error) {
  // Solo lanza el error si no se ha lanzado ya
  if (error instanceof GraphQLError) {
    throw error;
  }

  if (error.name === "SequelizeUniqueConstraintError") {
    res.status(409);
    throw new GraphQLError("La placa ya está registrada.", {
      extensions: {
        code: "CONFLICT",
        statusCode: 409,
      },
    });
  } else if (typeof error === "string" && error.includes("válido")) {
    console.log(error, "no válido");
    res.status(400);
    throw new GraphQLError(error, {
      extensions: {
        code: "BAD_USER_INPUT",
        statusCode: 400,
      },
    });
  } else {
    res.status(500);
    throw new GraphQLError("Error al crear el vehículo.", {
      extensions: {
        code: "INTERNAL_SERVER_ERROR",
        statusCode: 500,
      },
    });
  }
}
export default vehiculoResolver;
