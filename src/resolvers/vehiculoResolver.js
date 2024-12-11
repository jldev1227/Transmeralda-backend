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
import { ApolloError } from "apollo-server-errors";

// Define __dirname manualmente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility function to validate OCR plate matches vehicle plate
const validarPlaca = (ocrPlaca, referenciaPlaca, categoria) => {
  if (ocrPlaca && referenciaPlaca && ocrPlaca !== referenciaPlaca) {
    throw new GraphQLError(
      `La placa obtenida (${ocrPlaca}) para la categoría ${categoria} no coincide con el vehículo (${referenciaPlaca}).`,
      {
        extensions: {
          code: "BAD_USER_INPUT",
          statusCode: 400,
        },
      }
    );
  }
};

const validarFechasVencimiento = (fechas) => {
  const fechaActual = new Date();
  for (const [nombre, fecha] of Object.entries(fechas)) {
    if (fecha && new Date(fecha + "T00:00:00") < fechaActual) {
      throw new GraphQLError(
        `La fecha de vencimiento de ${nombre} está vencida (${fecha}).`,
        {
          extensions: {
            code: "BAD_USER_INPUT",
            statusCode: 400,
          },
        }
      );
    }
  }
};

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
      const vehiculo = await Vehiculo.findByPk(id);

      if (!vehiculo) {
        throw new ApolloError(
          "El vehículo no fue encontrado",
          "VEHICULO_NO_ENCONTRADO"
        );
      }

      return vehiculo;
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
          "TECNOMECÁNICA",
          "TARJETA_DE_OPERACIÓN",
          "POLIZA_CONTRACTUAL",
          "POLIZA_EXTRACONTRACTUAL",
          "POLIZA_TODO_RIESGO",
        ];

        // Validar que todas las categorías permitidas estén presentes
        const categoriasFaltantes = categoriasPermitidas.filter(
          (categoria) => !categorias.includes(categoria)
        );

        if (categoriasFaltantes.length > 0) {
          res.status(400);
          throw new GraphQLError(
            `Faltan las siguientes categorías: ${categoriasFaltantes.join(", ")}. Todos los documentos son requeridos.`,
            {
              extensions: {
                code: "BAD_USER_INPUT",
                statusCode: 400,
              },
            }
          );
        }

        const categoriasInvalidas = categorias.filter(
          (categoria) => !categoriasPermitidas.includes(categoria)
        );

        if (categoriasInvalidas.length > 0) {
          res.status(400);
          throw new GraphQLError(
            `Categorías no permitidas: ${categoriasInvalidas.join(", ")}. Use 'TARJETA_DE_PROPIEDAD', 'SOAT', 'TECNOMECÁNICA', 'TARJETA_DE_OPERACION', 'POLIZA_CONTRACTUAL', 'POLIZA_EXTRACONTRACTUAL', 'POLIZA_TODO_RIESGO'.`,
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
          throw new GraphQLError("Se requieren exactamente 8 archivos.", {
            extensions: {
              code: "BAD_USER_INPUT",
              statusCode: 400,
            },
          });
        }

        let tarjetaDePropiedad = {};
        let soat = {};
        let tecnomecanica = {};
        let tarjetaDeOperacion = {};
        let polizaContractual = {};
        let polizaExtracontractual = {};
        let polizaTodoRiesgo = {};

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
            categorias[index] === "TECNOMECÁNICA" ||
            categorias[index] === "TARJETA_DE_OPERACIÓN" ||
            categorias[index] === "POLIZA_CONTRACTUAL" ||
            categorias[index] === "POLIZA_EXTRACONTRACTUAL" ||
            categorias[index] === "POLIZA_TODO_RIESGO"
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

                const obtenerScript = (categoria) => {
                  switch (categoria) {
                    case "TARJETA_DE_PROPIEDAD":
                      return "ocrTARJETA_DE_PROPIEDAD.py";
                    case "SOAT":
                      return "ocrSOAT.py";
                    case "TECNOMECÁNICA":
                      return "ocrTECNOMECANICA.py";
                    case "TARJETA_DE_OPERACIÓN":
                      return "ocrTARJETA_DE_OPERACION.py";
                    case "POLIZA_CONTRACTUAL":
                      return "ocrPOLIZA_CONTRACTUAL.py";
                    case "POLIZA_EXTRACONTRACTUAL":
                      return "ocrPOLIZA_EXTRACONTRACTUAL.py";
                    case "POLIZA_TODO_RIESGO":
                      return "ocrPOLIZA_TODO_RIESGO.py";
                    default:
                      return "script_no_definido.py"; // En caso de que no se encuentre la categoría
                  }
                };

                // Ejemplo de uso
                const scriptName = obtenerScript(categorias[index]);

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

              // Procesar los datos del OCR (aquí podrías guardar en variables como tarjetaDePropiedad, etc.)
              if (categorias[index] === "TARJETA_DE_PROPIEDAD") {
                tarjetaDePropiedad = ocrResult;
              } else if (categorias[index] === "SOAT") {
                soat = ocrResult;
              } else if (categorias[index] === "TECNOMECÁNICA") {
                tecnomecanica = ocrResult;
              } else if (categorias[index] === "TARJETA_DE_OPERACIÓN") {
                tarjetaDeOperacion = ocrResult;
              } else if (categorias[index] === "POLIZA_CONTRACTUAL") {
                polizaContractual = ocrResult;
              } else if (categorias[index] === "POLIZA_EXTRACONTRACTUAL") {
                polizaExtracontractual = ocrResult;
              } else if (categorias[index] === "POLIZA_TODO_RIESGO") {
                polizaTodoRiesgo = ocrResult;
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

        const fechasVencimiento = {
          soat: soat.soatVencimiento,
          tecnomecanica: tecnomecanica.tecnomecanicaVencimiento,
          tarjetaDeOperacion: tarjetaDeOperacion.tarjetaOperacionVencimiento,
          polizaContractual: polizaContractual.polizaContractualVencimiento,
          polizaExtracontractual:
            polizaExtracontractual.polizaExtraContractualVencimiento,
          polizaTodoRiesgo: polizaTodoRiesgo.polizaTodoRiesgoVencimiento,
        };

        validarFechasVencimiento(fechasVencimiento);

        // Crear el vehículo en la base de datos
        const nuevoVehiculo = await Vehiculo.create({
          ...tarjetaDePropiedad,
          soatVencimiento: soat.soatVencimiento,
          tecnomecanicaVencimiento: tecnomecanica.tecnomecanicaVencimiento,
          tarjetaDeOperacionVencimiento:
            tarjetaDeOperacion.tarjetaOperacionVencimiento,
          polizaContractualVencimiento:
            polizaContractual.polizaContractualVencimiento,
          polizaExtraContractualVencimiento:
            polizaExtracontractual.polizaExtraContractualVencimiento,
          polizaTodoRiesgoVencimiento:
            polizaTodoRiesgo.polizaTodoRiesgoVencimiento,
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

        console.log(categoria)

        // Validar que la categoría sea una de las permitidas
        const categoriasPermitidas = [
          "TARJETA_DE_PROPIEDAD",
          "SOAT",
          "TECNOMECÁNICA",
          "TARJETA_DE_OPERACIÓN",
          "POLIZA_CONTRACTUAL",
          "POLIZA_EXTRACONTRACTUAL",
          "POLIZA_TODO_RIESGO",
        ];

        const categoriaPermitida = categoriasPermitidas.includes(categoria);

        if (!categoriaPermitida) {
          res.status(400);
          throw new GraphQLError(
            "Categoría no permitida. Use 'TARJETA_DE_PROPIEDAD', 'SOAT', 'TECNOMECÁNICA', 'TARJETA_DE_OPERACIÓN', 'POLIZA_CONTRACTUAL', 'POLIZA_EXTRACONTRACTUAL', 'POLIZA_TODO_RIESGO'.",
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

        console.log(tempFilePath)

        await fs.writeFileSync(tempFilePath, JSON.stringify(ocrData));

        const ocrResult = await new Promise((resolve, reject) => {
          let vehiculoData = "";

          const obtenerScript = (categoria) => {
            switch (categoria) {
              case "TARJETA_DE_PROPIEDAD":
                return "ocrTARJETA_DE_PROPIEDAD.py";
              case "SOAT":
                return "ocrSOAT.py";
              case "TECNOMECÁNICA":
                return "ocrTECNOMECANICA.py";
              case "TARJETA_DE_OPERACIÓN":
                return "ocrTARJETA_DE_OPERACION.py";
              case "POLIZA_CONTRACTUAL":
                return "ocrPOLIZA_CONTRACTUAL.py";
              case "POLIZA_EXTRACONTRACTUAL":
                return "ocrPOLIZA_EXTRACONTRACTUAL.py";
              case "POLIZA_TODO_RIESGO":
                return "ocrPOLIZA_TODO_RIESGO.py";
              default:
                return "script_no_definido.py"; // En caso de que no se encuentre la categoría
            }
          };

          // Ejemplo de uso
          const scriptName = obtenerScript(categoria);

          console.log(scriptName, categoria)

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
        const fechasVencimiento = {
          tarjetaDePropiedad: tarjetaDePropiedad.tarjetaOperacionVencimiento,
          soat: ocrResult.soatVencimiento,
          tecnomecanica: ocrResult.tecnomecanicaVencimiento,
          tarjetaDeOperacion: ocrResult.tarjetaOperacionVencimiento,
          polizaContractual: ocrResult.polizaContractualVencimiento,
          polizaExtracontractual: ocrResult.polizaExtraContractualVencimiento,
          polizaTodoRiesgo: ocrResult.polizaTodoRiesgoVencimiento,
        };

        console.log(fechasVencimiento)

        if (categoria === "TARJETA_DE_PROPIEDAD") {
          validarPlaca(ocrResult.placa, referenciaPlaca, "TARJETA_DE_PROPIEDAD");
          vehiculo.tarjetaDePropiedadVencimiento = ocrResult.tarjetaOperacionVencimiento;
        } else if (categoria === "SOAT") {
          validarPlaca(ocrResult.placa, referenciaPlaca, "SOAT");
          vehiculo.soatVencimiento = ocrResult.soatVencimiento;
        } else if (categoria === "TECNOMECÁNICA") {
          validarPlaca(ocrResult.placa, referenciaPlaca, "TECNOMECÁNICA");
          vehiculo.tecnomecanicaVencimiento = ocrResult.tecnomecanicaVencimiento;
        } else if (categoria === "TARJETA_DE_OPERACIÓN") {
          validarPlaca(ocrResult.placa, referenciaPlaca, "TARJETA_DE_OPERACIÓN");
          vehiculo.tarjetaDeOperacionVencimiento = ocrResult.tarjetaOperacionVencimiento;
        } else if (categoria === "POLIZA_CONTRACTUAL") {
          validarPlaca(ocrResult.placa, referenciaPlaca, "POLIZA_CONTRACTUAL");
          vehiculo.polizaContractualVencimiento = ocrResult.polizaContractualVencimiento;
        } else if (categoria === "POLIZA_EXTRACONTRACTUAL") {
          validarPlaca(ocrResult.placa, referenciaPlaca, "POLIZA_EXTRACONTRACTUAL");
          vehiculo.polizaExtraContractualVencimiento = ocrResult.polizaExtraContractualVencimiento;
        } else if (categoria === "POLIZA_TODO_RIESGO") {
          validarPlaca(ocrResult.placa, referenciaPlaca, "POLIZA_TODO_RIESGO");
          vehiculo.polizaTodoRiesgoVencimiento = ocrResult.polizaTodoRiesgoVencimiento;
        }
        
        validarFechasVencimiento(fechasVencimiento);
        await vehiculo.save();

        // Update Azure file
        const formattedName = categoria
          .normalize("NFD")
          .replace(/[̀-\u036f]/g, "")
          .replace(/\s+/g, "_")
          .toUpperCase();
        const finalFilename = `${vehiculo.placa}_${formattedName}.pdf`;

        const stream = createReadStream();
        await uploadFileToAzure(vehiculo.placa, stream, finalFilename);

        console.log(vehiculo)
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
