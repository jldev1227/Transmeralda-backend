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

const waitForOcrResult = async (operationLocation, subscriptionKey) => {
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
      if (status === "succeeded") {
        ocrData = ocrResponse.data;
      }
    } catch (error) {
      throw new Error("Error al obtener el estado de OCR de Azure.");
    }
  }

  if (!ocrData) {
    throw new Error("El OCR no pudo completarse exitosamente.");
  }
  return ocrData;
};

const getOcrScriptName = (categoria) => {
  const scripts = {
    TARJETA_DE_PROPIEDAD: "ocrTARJETA_DE_PROPIEDAD.py",
    SOAT: "ocrSOAT.py",
    TECNOMECÁNICA: "ocrTECNOMECANICA.py",
    TARJETA_DE_OPERACIÓN: "ocrTARJETA_DE_OPERACION.py",
    POLIZA_CONTRACTUAL: "ocrPOLIZA_CONTRACTUAL.py",
    POLIZA_EXTRACONTRACTUAL: "ocrPOLIZA_EXTRACONTRACTUAL.py",
    POLIZA_TODO_RIESGO: "ocrPOLIZA_TODO_RIESGO.py",
  };

  return scripts[categoria] || "script_no_definido.py";
};

const runOcrScript = async (categoria, scriptName, ocrData, vehiculoPlaca = "") => {
  const tempFilePath = path.join(__dirname, `../utils/tempOcrData${categoria}.json`);
  await fs.promises.writeFile(tempFilePath, JSON.stringify(ocrData));

  return new Promise((resolve, reject) => {
    let scriptOutput = "";

    const pythonProcess = spawn("python", [`src/utils/${scriptName}`, vehiculoPlaca]);

    pythonProcess.stdout.on("data", (data) => {
      scriptOutput += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`Error del script de Python: ${data}`);
    });

    pythonProcess.on("close", (code) => {
      fs.unlink(tempFilePath, () => {}); // Eliminar el archivo temporal después de procesarlo
      if (code === 0) {
        try {
          resolve(JSON.parse(scriptOutput));
        } catch (error) {
          reject(new Error(`Error al parsear el JSON del script: ${error.message}`));
        }
      } else {
        reject(new Error(`El script terminó con código de error: ${code}`));
      }
    });
  });
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
        if (!files || !categorias || files.length === 0 || categorias.length === 0) {
          throw new GraphQLError("Archivos y categorías son requeridos.", {
            extensions: { code: "BAD_USER_INPUT", statusCode: 400 },
          });
        }
    
        const categoriasPermitidas = [
          "TARJETA_DE_PROPIEDAD",
          "SOAT",
          "TECNOMECÁNICA",
          "TARJETA_DE_OPERACIÓN",
          "POLIZA_CONTRACTUAL",
          "POLIZA_EXTRACONTRACTUAL",
          "POLIZA_TODO_RIESGO",
        ];
    
        const categoriasFaltantes = categoriasPermitidas.filter(
          (categoria) => !categorias.includes(categoria)
        );
        if (categoriasFaltantes.length > 0) {
          throw new GraphQLError(
            `Faltan las siguientes categorías: ${categoriasFaltantes.join(", ")}.`,
            { extensions: { code: "BAD_USER_INPUT", statusCode: 400 } }
          );
        }
    
        const resolvedFiles = await Promise.allSettled(files);
    
        let tarjetaDePropiedad = {};
        const documentosOCR = {};
    
        const visionEndpoint = process.env.OCR_URL;
        const subscriptionKey = process.env.AZURE_VISION_KEY;
    
        // Procesar primero Tarjeta de Propiedad
        for (let index = 0; index < resolvedFiles.length; index++) {
          const file = resolvedFiles[index];
          if (file.status !== "fulfilled") continue;
    
          const { createReadStream, filename, mimetype } = file.value;
          if (categorias[index] === "TARJETA_DE_PROPIEDAD") {
            const form = new FormData();
            form.append(categorias[index], createReadStream(), { filename, contentType: mimetype });
    
            const response = await axios.post(visionEndpoint, form, {
              headers: {
                "Ocp-Apim-Subscription-Key": subscriptionKey,
                ...form.getHeaders(),
              },
            });
    
            const operationLocation = response.headers["operation-location"];
            const ocrData = await waitForOcrResult(operationLocation, subscriptionKey);
    
            tarjetaDePropiedad = await runOcrScript('TARJETA_DE_PROPIEDAD', "ocrTARJETA_DE_PROPIEDAD.py", ocrData);
    
            if (!tarjetaDePropiedad.placa) {
              throw new GraphQLError("No se pudo extraer la placa de la Tarjeta de Propiedad.", {
                extensions: { code: "BAD_USER_INPUT", statusCode: 400 },
              });
            }
            break; // Detener una vez procesada la Tarjeta de Propiedad
          }
        }
    
        const vehiculoPlaca = tarjetaDePropiedad.placa;
    
        // Procesar los demás documentos
        for (let index = 0; index < resolvedFiles.length; index++) {
          const file = resolvedFiles[index];
          if (file.status !== "fulfilled" || categorias[index] === "TARJETA_DE_PROPIEDAD") continue;
    
          const { createReadStream, filename, mimetype } = file.value;
          const form = new FormData();
          form.append(categorias[index], createReadStream(), { filename, contentType: mimetype });
    
          const response = await axios.post(visionEndpoint, form, {
            headers: {
              "Ocp-Apim-Subscription-Key": subscriptionKey,
              ...form.getHeaders(),
            },
          });
    
          const operationLocation = response.headers["operation-location"];
          const ocrData = await waitForOcrResult(operationLocation, subscriptionKey);
    
          const scriptName = getOcrScriptName(categorias[index]);
          documentosOCR[categorias[index]] = await runOcrScript(categorias[index], scriptName, ocrData, vehiculoPlaca);

          const fechasVencimiento = {
            soat: documentosOCR[categorias[index]].soatVencimiento,
            tecnomecanica: documentosOCR[categorias[index]].tecnomecanicaVencimiento,
            tarjetaDeOperacion: documentosOCR[categorias[index]].tarjetaOperacionVencimiento,
            polizaContractual: documentosOCR[categorias[index]].polizaContractualVencimiento,
            polizaExtracontractual: documentosOCR[categorias[index]].polizaExtraContractualVencimiento,
            polizaTodoRiesgo: documentosOCR[categorias[index]].polizaTodoRiesgoVencimiento,
          };
  
          if (categorias[index] === "SOAT") {
            validarPlaca(documentosOCR[categorias[index]].placa, vehiculoPlaca, "SOAT");
            documentosOCR.SOAT = documentosOCR[categorias[index]].soatVencimiento;
          } else if (categorias[index] === "TECNOMECÁNICA") {
            validarPlaca(documentosOCR[categorias[index]].placa, vehiculoPlaca, "TECNOMECÁNICA");
            documentosOCR.TECNOMECÁNICA = documentosOCR[categorias[index]].tecnomecanicaVencimiento;
          } else if (categorias[index] === "TARJETA_DE_OPERACIÓN") {
            validarPlaca(documentosOCR[categorias[index]].placa, vehiculoPlaca, "TARJETA_DE_OPERACIÓN");
            documentosOCR.TARJETA_DE_OPERACIÓN = documentosOCR[categorias[index]].tarjetaOperacionVencimiento;
          } else if (categorias[index] === "POLIZA_CONTRACTUAL") {
            validarPlaca(documentosOCR[categorias[index]].placa, vehiculoPlaca, "POLIZA_CONTRACTUAL");
            documentosOCR.POLIZA_CONTRACTUAL = documentosOCR[categorias[index]].polizaContractualVencimiento;
          } else if (categorias[index] === "POLIZA_EXTRACONTRACTUAL") {
            validarPlaca(documentosOCR[categorias[index]].placa, vehiculoPlaca, "POLIZA_EXTRACONTRACTUAL");
            documentosOCR.POLIZA_EXTRACONTRACTUAL = documentosOCR[categorias[index]].polizaExtraContractualVencimiento;
          } else if (categorias[index] === "POLIZA_TODO_RIESGO") {
            validarPlaca(documentosOCR[categorias[index]].placa, vehiculoPlaca, "POLIZA_TODO_RIESGO");
            documentosOCR.POLIZA_TODO_RIESGO = documentosOCR[categorias[index]].polizaTodoRiesgoVencimiento;
          }
          
          validarFechasVencimiento(fechasVencimiento);
        }

        // Crear el vehículo en la base de datos
        const nuevoVehiculo = await Vehiculo.create({
          ...tarjetaDePropiedad,
          soatVencimiento: documentosOCR.SOAT,
          tecnomecanicaVencimiento: documentosOCR.TECNOMECÁNICA,
          tarjetaDeOperacionVencimiento: documentosOCR.TARJETA_DE_OPERACIÓN,
          polizaContractualVencimiento: documentosOCR.POLIZA_CONTRACTUAL,
          polizaExtraContractualVencimiento: documentosOCR.POLIZA_EXTRACONTRACTUAL,
          polizaTodoRiesgoVencimiento: documentosOCR.POLIZA_TODO_RIESGO,
        });
    
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

        const form = new FormData();
        form.append(categoria, createReadStream(), {
          filename,
          contentType: mimetype,
        });

        const visionEndpoint = process.env.OCR_URL;
        const subscriptionKey = process.env.AZURE_VISION_KEY;

        console.log(visionEndpoint)
        console.log(subscriptionKey)

        let response;
        try {
          response = await axios.post(visionEndpoint, form, {
            headers: {
              "Ocp-Apim-Subscription-Key": subscriptionKey,
              ...form.getHeaders(),
            },
          });

          console.log(response)
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

          const vehiculoORC = spawn("python", [
            `src/utils/${scriptName}`,
            vehiculo.placa,
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

        let tarjetaDePropiedad = {};

        // Validar datos del SOAT y la tecnomecánica con la tarjeta de propiedad o los datos del vehículo
        const referenciaPlaca = tarjetaDePropiedad.placa || vehiculo.placa;
        const fechasVencimiento = {
          soat: ocrResult.soatVencimiento,
          tecnomecanica: ocrResult.tecnomecanicaVencimiento,
          tarjetaDeOperacion: ocrResult.tarjetaOperacionVencimiento,
          polizaContractual: ocrResult.polizaContractualVencimiento,
          polizaExtracontractual: ocrResult.polizaExtraContractualVencimiento,
          polizaTodoRiesgo: ocrResult.polizaTodoRiesgoVencimiento,
        };

        if (categoria === "SOAT") {
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
