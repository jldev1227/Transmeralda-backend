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
import { normalizeString } from "../utils/normalizeString.js";

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
    crearVehiculo: async (parent, { files, categorias }, { res }) => {
      try {
        if (
          !files ||
          !categorias ||
          files.length === 0 ||
          categorias.length === 0
        ) {
          res.status(400);
          throw new GraphQLError("Archivos y categorías son requeridos.", {
            extensions: {
              code: "BAD_USER_INPUT",
              statusCode: 400,
            },
          });
        }

        // Validar que todas las categorías sean de las permitidas
        const categoriasPermitidas = [
          "TARJETA_DE_PROPIEDAD",
          "SOAT",
          "TECNOMECANICA",
        ];

        const categoriasInvalidas = categorias.filter(
          (categoria) => !categoriasPermitidas.includes(categoria)
        );

        if (categoriasInvalidas.length > 0) {
          res.status(400);
          throw new GraphQLError(
            `Categorías no permitidas: ${categoriasInvalidas.join(", ")}. Use 'TARJETA_DE_PROPIEDAD', 'SOAT' o 'TECNOMECANICA'.`,
            {
              extensions: {
                code: "BAD_USER_INPUT",
                statusCode: 400,
              },
            }
          );
        }

        const resolvedFiles = await Promise.allSettled(files);

        if (resolvedFiles.some((file) => file.status === "rejected")) {
          res.status(400);
          throw new GraphQLError("Se requieren exactamente 3 archivos.", {
            extensions: {
              code: "BAD_USER_INPUT",
              statusCode: 400,
            },
          });
        }

        let tarjetaDePropiedad = {};
        let soat = {};
        let tecnomecanica = {};

        const visionEndpoint = process.env.OCR_URL;
        const subscriptionKey = process.env.AZURE_VISION_KEY;

        // Procesar los archivos y realizar el OCR
        for (let index = 0; index < resolvedFiles.length; index++) {
          const file = resolvedFiles[index];

          if (file.status !== "fulfilled") continue;

          const { createReadStream, filename, mimetype } = file.value;

          if (mimetype !== "application/pdf") {
            res.status(400);
            throw new GraphQLError("Solo se permiten archivos PDF.", {
              extensions: {
                code: "BAD_USER_INPUT",
                statusCode: 400,
              },
            });
          }

          const form = new FormData();
          const fieldName = categorias[index];
          form.append(fieldName, createReadStream(), {
            filename,
            contentType: mimetype,
          });

          // Realiza la llamada a Azure Computer Vision
          if (
            categorias[index] === "TARJETA_DE_PROPIEDAD" ||
            categorias[index] === "SOAT" ||
            categorias[index] === "TECNOMECÁNICA"
          ) {
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

              const tempFilePath = path.join(
                __dirname,
                `../utils/tempOcrData${categorias[index]}.json`
              );

              await fs.writeFileSync(tempFilePath, JSON.stringify(ocrData));

              const ocrResult = await new Promise((resolve, reject) => {
                let vehiculoData = "";

                const scriptName =
                  categorias[index] === "TARJETA_DE_PROPIEDAD"
                    ? "ocrTARJETA_DE_PROPIEDAD.py"
                    : categorias[index] === "SOAT"
                      ? "ocrSOAT.py"
                      : "ocrTECNOMECANICA.py";

                const vehiculoORC = spawn("python", [
                  `src/utils/${scriptName}`,
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

              // Procesar los datos del OCR (aquí podrías guardar en variables como tarjetaDePropiedad, etc.)
              if (categorias[index] === "TARJETA_DE_PROPIEDAD") {
                tarjetaDePropiedad = ocrResult;
              } else if (categorias[index] === "SOAT") {
                soat = ocrResult;
              } else if (categorias[index] === "TECNOMECÁNICA") {
                tecnomecanica = ocrResult;
              }
            } else {
              res.status(500);
              throw new GraphQLError(
                "El OCR no pudo completarse exitosamente.",
                {
                  extensions: {
                    code: "EXTERNAL_SERVICE_ERROR",
                    statusCode: 500,
                  },
                }
              );
            }
          }
        }

        // Crear el vehículo en la base de datos
        const nuevoVehiculo = await Vehiculo.create({
          ...tarjetaDePropiedad,
          soatVencimiento: soat.soatVencimiento,
          tecnomecanicaVencimiento: tecnomecanica.tecnomecanicaVencimiento,
        });

        // Ahora subir los archivos a Azure
        try {
          for (let index = 0; index < resolvedFiles.length; index++) {
            const file = resolvedFiles[index];
            if (file.status !== "fulfilled") continue;

            const { createReadStream } = file.value;
            const formattedName = categorias[index]
              .normalize("NFD") // Descompone caracteres con tildes
              .replace(/[\u0300-\u036f]/g, "") // Elimina las marcas diacríticas (tildes)
              .replace(/\s+/g, "_")
              .toUpperCase();

            const finalFilename = `${nuevoVehiculo.placa}_${formattedName}.pdf`;

            console.log(finalFilename);

            const stream = createReadStream();
            await uploadFileToAzure(nuevoVehiculo.placa, stream, finalFilename);
          }
        } catch (uploadError) {
          // Si ocurre un error al subir los archivos, elimina el vehículo de la base de datos
          await Vehiculo.destroy({ where: { id: nuevoVehiculo.id } });
          throw new GraphQLError(
            "Error al subir los archivos a Azure Storage. Los cambios han sido revertidos.",
            {
              extensions: {
                code: "EXTERNAL_SERVICE_ERROR",
                statusCode: 500,
              },
            }
          );
        }

        return {
          success: true,
          vehiculo: nuevoVehiculo,
          message: "Vehículo creado exitosamente.",
        };
      } catch (error) {
        handleGraphQLError(res, error, "crear");
      }
    },
    actualizarVehiculo: async (parent, { id, file, categoria }, { res }) => {
      try {
        if (!file || !categoria) {
          res.status(400);
          throw new GraphQLError("Archivo y categoría son requeridos.", {
            extensions: {
              code: "BAD_USER_INPUT",
              statusCode: 400,
            },
          });
        }

        // Validar que la categoría sea una de las permitidas
        const categoriasPermitidas = [
          "TARJETA_DE_PROPIEDAD",
          "SOAT",
          "TECNOMECÁNICA",
        ];
        if (!categoriasPermitidas.includes(categoria)) {
          res.status(400);
          throw new GraphQLError(
            "Categoría no permitida. Use 'TARJETA_DE_PROPIEDAD', 'SOAT' o 'TECNOMECÁNICA'.",
            {
              extensions: {
                code: "BAD_USER_INPUT",
                statusCode: 400,
              },
            }
          );
        }

        const resolvedFile = await file;

        // Extraer las propiedades del archivo
        const { createReadStream, filename, mimetype } = resolvedFile;

        if (mimetype !== "application/pdf") {
          res.status(400);
          throw new GraphQLError("Solo se permiten archivos PDF.", {
            extensions: {
              code: "BAD_USER_INPUT",
              statusCode: 400,
            },
          });
        }

        const form = new FormData();
        form.append(categoria, createReadStream(), {
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

        if (
          status !== "succeeded" ||
          !ocrData ||
          Object.keys(ocrData).length === 0
        ) {
          res.status(500);
          throw new GraphQLError(
            "El OCR no pudo completarse exitosamente o los datos de OCR están vacíos.",
            {
              extensions: {
                code: "EXTERNAL_SERVICE_ERROR",
                statusCode: 500,
              },
            }
          );
        }

        const tempFilePath = path.join(
          __dirname,
          `../utils/tempOcrData${categoria}.json`
        );

        await fs.writeFileSync(tempFilePath, JSON.stringify(ocrData));

        const ocrResult = await new Promise((resolve, reject) => {
          let vehiculoData = "";

          const scriptName =
            categoria === "TARJETA_DE_PROPIEDAD"
              ? "ocrTARJETA_DE_PROPIEDAD.py"
              : categoria === "SOAT"
                ? "ocrSOAT.py"
                : "ocrTECNOMECANICA.py";

          const vehiculoORC = spawn("python", [
            `src/utils/${scriptName}`,
            tempFilePath,
          ]);

          vehiculoORC.stdout.on("data", (data) => {
            vehiculoData += data.toString();
            console.log(vehiculoData);
          });

          vehiculoORC.stderr.on("data", (data) => {
            console.error(`Error del script de Python: ${data}`);
          });

          vehiculoORC.on("close", (code) => {
            // fs.unlinkSync(tempFilePath);
            if (code === 0) {
              try {
                const resultado = JSON.parse(vehiculoData);
                resolve(resultado);
              } catch (error) {
                reject(`Error al parsear el JSON: ${error}`);
              }
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

        let tarjetaDePropiedad = {};
        let soat = {};
        let tecnomecanica = {};

        // Obtener el vehículo de la base de datos
        const vehiculo = await Vehiculo.findByPk(id);
        if (!vehiculo) {
          res.status(404);
          throw new GraphQLError("Vehículo no encontrado.", {
            extensions: {
              code: "NOT_FOUND",
              statusCode: 404,
            },
          });
        }

        // Validar datos del SOAT y la tecnomecánica con la tarjeta de propiedad o los datos del vehículo
        const referenciaPlaca = tarjetaDePropiedad.placa || vehiculo.placa;
        const referenciaVin = tarjetaDePropiedad.vin || vehiculo.vin;
        const referenciaNumeroMotor =
          tarjetaDePropiedad.numeroMotor || vehiculo.numeroMotor;

        if (categoria === "TARJETA_DE_PROPIEDAD") {
          tarjetaDePropiedad = ocrResult;

          const placaOCR = tarjetaDePropiedad.placa;
          const placaVehiculo = vehiculo.placa;

          if (placaOCR !== placaVehiculo) {
            res.status(400);
            throw new GraphQLError(
              "La placa proporcionada por la tarjeta de propiedad no coincide con el vehículo a modificar",
              {
                extensions: {
                  code: "BAD_USER_INPUT",
                  statusCode: 400,
                },
              }
            );
          }
        } else if (categoria === "SOAT") {
          soat = ocrResult;

          if (
            (soat.placa && referenciaPlaca && soat.placa !== referenciaPlaca) ||
            (soat.vin && referenciaVin && soat.vin !== referenciaVin) ||
            (soat.numeroMotor && referenciaNumeroMotor && normalizeString(soat.numeroMotor) !== normalizeString(referenciaNumeroMotor))
          ) {
            res.status(400);
            throw new GraphQLError(
              "Los datos del SOAT no coinciden con la tarjeta de propiedad o los datos del vehículo.",
              {
                extensions: {
                  code: "BAD_USER_INPUT",
                  statusCode: 400,
                },
              }
            );
          } else {
            // Debugging outputs for verification
            console.log("Condición de VIN:", soat.vin && referenciaVin && soat.vin !== referenciaVin);
            console.log("Referencia Placa:", referenciaPlaca);
            console.log("Referencia Número Motor:", referenciaNumeroMotor);
            console.log("Referencia VIN:", referenciaVin);
          }

          const soatFechaVencimiento = new Date(
            soat.soatVencimiento + "T00:00:00"
          );

          const fechaActual = new Date();

          if (soatFechaVencimiento < fechaActual) {
            res.status(400);
            throw new GraphQLError(
              "El SOAT está vencido. No se puede actualizar el vehículo.",
              {
                extensions: {
                  code: "BAD_USER_INPUT",
                  statusCode: 400,
                },
              }
            );
          }
        } else if (categoria === "TECNOMECÁNICA") {
          tecnomecanica = ocrResult;

          const tecnomecanicaFechaVencimiento = new Date(
            tecnomecanica.tecnomecanicaVencimiento + "T00:00:00"
          );
          const fechaActual = new Date();

          if (tecnomecanicaFechaVencimiento < fechaActual) {
            res.status(400);
            throw new GraphQLError(
              "La Técnico Mecánica está vencida. No se puede actualizar el vehículo.",
              {
                extensions: {
                  code: "BAD_USER_INPUT",
                  statusCode: 400,
                },
              }
            );
          }

          if (
            (tecnomecanica.placa && tecnomecanica.placa !== referenciaPlaca) ||
            (tecnomecanica.vin && tecnomecanica.vin !== referenciaVin) ||
            (tecnomecanica.numeroMotor &&
              tecnomecanica.numeroMotor !== referenciaNumeroMotor)
          ) {
            res.status(400);
            throw new GraphQLError(
              "Los datos de la tecnomecánica no coinciden con la tarjeta de propiedad o los datos del vehículo.",
              {
                extensions: {
                  code: "BAD_USER_INPUT",
                  statusCode: 400,
                },
              }
            );
          }
        }

        // Actualizar los datos del vehículo según los archivos proporcionados
        if (tarjetaDePropiedad && tarjetaDePropiedad.placa) {
          Object.keys(tarjetaDePropiedad).forEach((key) => {
            // Si vehiculo tiene la misma clave, actualizamos el valor

            if (vehiculo.dataValues.hasOwnProperty(key)) {
              vehiculo[key] = tarjetaDePropiedad[key];
            }
          });
        }

        if (soat && soat.placa) {
          vehiculo.soatVencimiento = soat.soatVencimiento;
        }
        if (tecnomecanica && tecnomecanica.placa) {
          vehiculo.tecnomecanicaVencimiento =
            tecnomecanica.tecnomecanicaVencimiento;
        }

        await vehiculo.save();

        return {
          success: true,
          message: "Documento actualizado exitosamente.",
          vehiculo,
        };
      } catch (error) {
        handleGraphQLError(res, error, "actualizar");
      }
    },
  },
};

// Función para manejar errores de GraphQL
function handleGraphQLError(res, error, action = "proceso") {
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
  } else if (
    typeof error === "string" &&
    error.includes("Error al parsear el JSON")
  ) {
    console.log(`${action} fallido:`, error);
    res.status(400);
    throw new GraphQLError(
      "El archivo no corresponde con el documento a modificar.",
      {
        extensions: {
          code: "BAD_USER_INPUT",
          statusCode: 400,
        },
      }
    );
  } else if (typeof error === "string" && error.includes("válido")) {
    console.log(`${action} fallido:`, error);
    res.status(400);
    throw new GraphQLError(error, {
      extensions: {
        code: "BAD_USER_INPUT",
        statusCode: 400,
      },
    });
  } else {
    console.log(`${action} fallido:`, error);
    res.status(500);
    throw new GraphQLError(`Error al ${action} el vehículo.`, {
      extensions: {
        code: "INTERNAL_SERVER_ERROR",
        statusCode: 500,
      },
    });
  }
}

export default vehiculoResolver;
