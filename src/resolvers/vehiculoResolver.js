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
    crearVehiculo: async (parent, { files, categorias }, { res }) => {
      console.log(files);
      try {
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

          console.log(categorias[index]);

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
                `../utils/tempOcrData${categorias[index].replace(/\s/g, "")}.json`
              );

              await fs.writeFileSync(tempFilePath, JSON.stringify(ocrData));

              const ocrResult = await new Promise((resolve, reject) => {
                let vehiculoData = "";

                const scriptName =
                  categorias[index] === "TARJETA_DE_PROPIEDAD"
                    ? "ocrTarjetaPropiedad.py"
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

              if (categorias[index] === "TARJETA DE PROPIEDAD") {
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

        if (
          tarjetaDePropiedad.placa !== soat.placa ||
          tarjetaDePropiedad.vin !== soat.vin ||
          tarjetaDePropiedad.numeroMotor !== soat.numeroMotor
        ) {
          res.status(400);
          throw new GraphQLError(
            "Los datos del SOAT no coinciden con la tarjeta de propiedad.",
            {
              extensions: {
                code: "BAD_USER_INPUT",
                statusCode: 400,
              },
            }
          );
        }

        if (
          tarjetaDePropiedad.placa !== tecnomecanica.placa ||
          tarjetaDePropiedad.vin !== tecnomecanica.vin ||
          tarjetaDePropiedad.numeroMotor !== tecnomecanica.numeroMotor
        ) {
          res.status(400);
          throw new GraphQLError(
            "Los datos de la tecnomecánica no coinciden con la tarjeta de propiedad.",
            {
              extensions: {
                code: "BAD_USER_INPUT",
                statusCode: 400,
              },
            }
          );
        }

        const soatFechaVencimiento = new Date(
          soat.soatVencimiento + "T00:00:00"
        );
        const tecnomecanicaFechaVencimiento = new Date(
          soat.soatVencimiento + "T00:00:00"
        );
        const fechaActual = new Date();

        if (soatFechaVencimiento < fechaActual) {
          res.status(400);
          throw new GraphQLError(
            "El SOAT está vencido. No se puede registrar el vehículo.",
            {
              extensions: {
                code: "BAD_USER_INPUT",
                statusCode: 400,
              },
            }
          );
        }

        if (tecnomecanicaFechaVencimiento < fechaActual) {
          res.status(400);
          throw new GraphQLError(
            "La Técnico Mecánica está vencida. No se puede registrar el vehículo.",
            {
              extensions: {
                code: "BAD_USER_INPUT",
                statusCode: 400,
              },
            }
          );
        }

        const { soatVencimiento } = soat;
        const { tecnomecanicaVencimiento } = tecnomecanica;

        const nuevoVehiculo = await Vehiculo.create({
          ...tarjetaDePropiedad,
          soatVencimiento,
          tecnomecanicaVencimiento,
        });

        // const formattedName = categorias[index]
        //   .replace(/\s+/g, "_")
        //   .toUpperCase();
        // const finalFilename = `${nuevoVehiculo.placa}_${formattedName}.pdf`;

        // const stream = createReadStream();
        // await uploadFileToAzure(
        //   nuevoVehiculo.placa,
        //   stream,
        //   finalFilename
        // );

        return {
          success: true,
          vehiculo: nuevoVehiculo,
          message: "Vehiculo creado exitosamente",
        };
      } catch (error) {
        handleGraphQLError(res, error, "crear");
      }
    },
    actualizarVehiculo: async (parent, { id, files, categorias }, { res }) => {
      try {
        const resolvedFiles = await Promise.allSettled(files);

        if (resolvedFiles.every((file) => file.status === "rejected")) {
          res.status(400);
          throw new GraphQLError(
            "Error al procesar los archivos proporcionados.",
            {
              extensions: {
                code: "BAD_USER_INPUT",
                statusCode: 400,
              },
            }
          );
        }

        let tarjetaDePropiedad = {};
        let soat = {};
        let tecnomecanica = {};
        const visionEndpoint = process.env.OCR_URL;
        const subscriptionKey = process.env.AZURE_VISION_KEY;
    
        // Filtrar archivos cumplidos y asociar con su categoría correcta
        const fulfilledFiles = resolvedFiles
          .map((file, index) =>
            file.status === "fulfilled"
              ? { ...file.value, categoria: categorias[index] }
              : null
          )
          .filter((file) => file !== null);
    
        for (let index = 0; index < fulfilledFiles.length; index++) {
          const { createReadStream, filename, mimetype, categoria } =
            fulfilledFiles[index];
    
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
              `../utils/tempOcrData${categoria.replace(/\s/g, "")}.json`
            );
    
            await fs.writeFileSync(tempFilePath, JSON.stringify(ocrData));
    
            const ocrResult = await new Promise((resolve, reject) => {
              let vehiculoData = "";
    
              const scriptName =
                categoria === "TARJETA DE PROPIEDAD"
                  ? "ocrTarjetaPropiedad.py"
                  : categoria === "SOAT"
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

            if (categoria === "TARJETA DE PROPIEDAD") {
              tarjetaDePropiedad = ocrResult;
            } else if (categoria === "SOAT") {
              soat = ocrResult;
            } else if (categoria === "TECNOMECANICA") {
              tecnomecanica = ocrResult;
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
        }
    
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
        const referenciaNumeroMotor = tarjetaDePropiedad.numeroMotor || vehiculo.numeroMotor;
    
        if (
          (soat.placa && soat.placa !== referenciaPlaca) ||
          (soat.vin && soat.vin !== referenciaVin) ||
          (soat.numeroMotor && soat.numeroMotor !== referenciaNumeroMotor)
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
        }
    
        if (
          (tecnomecanica.placa && tecnomecanica.placa !== referenciaPlaca) ||
          (tecnomecanica.vin && tecnomecanica.vin !== referenciaVin) ||
          (tecnomecanica.numeroMotor && tecnomecanica.numeroMotor !== referenciaNumeroMotor)
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

        const soatFechaVencimiento = new Date(
          soat.soatVencimiento + "T00:00:00"
        );
        const tecnomecanicaFechaVencimiento = new Date(
          tecnomecanica.tecnomecanicaVencimiento + "T00:00:00"
        );
        const fechaActual = new Date();
    
        if (soatFechaVencimiento < fechaActual) {
          res.status(400);
          throw new GraphQLError(
            "El SOAT está vencido. No se puede registrar el vehículo.",
            {
              extensions: {
                code: "BAD_USER_INPUT",
                statusCode: 400,
              },
            }
          );
        }
        
        if (tecnomecanicaFechaVencimiento < fechaActual) {
          res.status(400);
          throw new GraphQLError(
            "La Técnico Mecánica está vencida. No se puede registrar el vehículo.",
            {
              extensions: {
                code: "BAD_USER_INPUT",
                statusCode: 400,
              },
            }
          );
        }

        // Actualizar los datos del vehículo según los archivos proporcionados
        if (tarjetaDePropiedad && tarjetaDePropiedad.placa) {
          Object.keys(tarjetaDePropiedad).forEach((key) => {
            // Si vehiculo tiene la misma clave, actualizamos el valor

            console.log(tarjetaDePropiedad[key])
            if (vehiculo.dataValues.hasOwnProperty(key)) {
              vehiculo[key] = tarjetaDePropiedad[key];
              console.log(`remplazado ${vehiculo[key]} por ${tarjetaDePropiedad[key]}`)
            }
          });
        }

        if (soat) {
          vehiculo.soatVencimiento = soat.soatVencimiento;
        }
        if (tecnomecanica) {
          vehiculo.tecnomecanicaVencimiento = tecnomecanica.tecnomecanicaVencimiento
        }

        await vehiculo.save();
    
        return {
          success: true,
          message: "Vehículo actualizado exitosamente.",
          vehiculo,
        };
      } catch (error) {
        handleGraphQLError(res, error, "actualizar");
      }
    }
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
