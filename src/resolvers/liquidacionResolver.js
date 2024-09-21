import { Usuario, Vehiculo } from "../models/index.js";
import Liquidacion from "../models/Liquidacion.js";
import { v4 as uuidv4 } from "uuid";

const liquidacionResolver = {
  Query: {
    // Obtener todas las liquidaciones
    liquidaciones: async () => {
      const liquidaciones = await Liquidacion.findAll({
        include: [
          { model: Usuario, as: "conductor" },  // Incluye la relación con el conductor
          { model: Vehiculo, as: "vehiculos" }  // Incluye la relación con los vehículos
        ],
      });
      
      return Promise.all(
        liquidaciones.map(async (liquidacion) => {
          // Supongo que estás obteniendo el conductor desde otro servicio (modificar según tu arquitectura)
          // Verificar si periodoStart y periodoEnd existen
          console.log(liquidacion)
          const periodo =
          liquidacion.periodoStart && liquidacion.periodoEnd
          ? {
                  start: {
                    era: "AD",
                    year: new Date(liquidacion.periodoStart).getFullYear(),
                    month: new Date(liquidacion.periodoStart).getMonth() + 1,
                    day: new Date(liquidacion.periodoStart).getDate(),
                    calendar: { identifier: "gregory" },
                  },
                  end: {
                    era: "AD",
                    year: new Date(liquidacion.periodoEnd).getFullYear(),
                    month: new Date(liquidacion.periodoEnd).getMonth() + 1,
                    day: new Date(liquidacion.periodoEnd).getDate(),
                    calendar: { identifier: "gregory" },
                  },
                }
                : null;
                
                // Devolver los datos de la liquidación, incluyendo periodo y vehículos
                return {
            ...liquidacion.toJSON(),
            periodo,
          };
        })
      );
    },

    // Obtener una liquidación por ID y consultar el conductor (usuario)
    liquidacion: async (_, { id }) => {
      const liquidacion = await Liquidacion.findByPk(id, {
        include: [{ model: Vehiculo, as: "vehiculos" }], // Asegúrate de que la relación esté correctamente configurada
      });

      if (!liquidacion) {
        throw new Error(`La liquidación con ID ${id} no fue encontrada`);
      }

      // Supongo que obtienes el conductor a través de otra API
      const conductor = await obtenerConductorPorId(liquidacion.conductorId);

      if (!conductor) {
        throw new Error("Conductor no encontrado");
      }

      // Devolver la liquidación con el conductor añadido
      return {
        ...liquidacion.toJSON(),
        conductor,
      };
    },
  },
  Mutation: {
    async crearLiquidacion(
      _,
      {
        conductorId,
        periodoStart,
        periodoEnd,
        auxilioTransporte,
        sueldoTotal,
        totalPernotes,
        totalBonificaciones,
        totalRecargos,
        diasLaborados,
        ajusteSalarial,
        vehiculos,
      }
    ) {
      try {
        // Verificar si el conductor existe
        const conductor = await Usuario.findByPk(conductorId, {
          attributes: ["id", "nombre", "apellido", "cc"], // Selecciona solo los campos que necesitas
        });

        if (!conductor) {
          throw new Error(`El conductor con ID ${conductorId} no existe.`);
        }

        // Verificar si los vehículos existen
        const vehiculosDB = await Vehiculo.findAll({
          where: {
            id: vehiculos, // Ya que vehiculos es una lista de IDs, no necesitas mapearlos
          },
        });

        // Verificar que todos los vehículos existan
        if (vehiculosDB.length !== vehiculos.length) {
          throw new Error("Algunos vehículos no se encontraron.");
        }

        const id = uuidv4().slice(0, 6); // Obtén los primeros 6 caracteres

        // Crear la nueva liquidación
        const nuevaLiquidacion = await Liquidacion.create({
          id,
          conductorId, // Asociar conductor
          periodoStart,
          periodoEnd,
          auxilioTransporte,
          sueldoTotal,
          totalPernotes,
          totalBonificaciones,
          totalRecargos,
          diasLaborados,
          ajusteSalarial,
        });

        // Asociar los vehículos a la liquidación (puedes hacerlo mediante una relación de asociación si usas Sequelize)
        await nuevaLiquidacion.setVehiculos(vehiculosDB); // Relacionar los vehículos

        const liquidacionConConductor = await Liquidacion.findOne({
          where: { id: nuevaLiquidacion.id },
          include: [
            {
              model: Usuario, // Modelo del conductor
              as: 'conductor', // Asegúrate de que el alias esté bien configurado en tu relación
            },
          ],
        });

        return liquidacionConConductor;
      } catch (error) {
        console.error("Error al crear la liquidación:", error);
        throw new Error("Error creando la liquidación");
      }
    },
    editarLiquidacion: async (_, args) => {
      try {
        // Buscar la liquidación existente por su ID
        const liquidacion = await Liquidacion.findByPk(args.id);

        if (!liquidacion) {
          throw new Error('Liquidación no encontrada');
        }

        // Actualizar los campos permitidos si están presentes en los argumentos
        await liquidacion.update({
          periodoStart: args.periodoStart || liquidacion.periodoStart,
          periodoEnd: args.periodoEnd || liquidacion.periodoEnd,
          auxilioTransporte: args.auxilioTransporte || liquidacion.auxilioTransporte,
          sueldoTotal: args.sueldoTotal || liquidacion.sueldoTotal,
          totalPernotes: args.totalPernotes || liquidacion.totalPernotes,
          totalBonificaciones: args.totalBonificaciones || liquidacion.totalBonificaciones,
          totalRecargos: args.totalRecargos || liquidacion.totalRecargos,
          diasLaborados: args.diasLaborados || liquidacion.diasLaborados,
          ajusteSalarial: args.ajusteSalarial || liquidacion.ajusteSalarial,
        });

        // Actualizar la relación con los vehículos si se proporciona
        if (args.vehiculos && args.vehiculos.length > 0) {
          const vehiculos = await Vehiculo.findAll({
            where: { id: args.vehiculos },
          });
          await liquidacion.setVehiculos(vehiculos); // Establece la nueva relación con los vehículos
        }

        // Retornar la liquidación actualizada junto con las relaciones
        const liquidacionActualizada = await Liquidacion.findByPk(args.id, {
          include: [
            { model: Usuario, as: "conductor" },
            { model: Vehiculo, as: "vehiculos" },
          ],
        });

        return liquidacionActualizada;
      } catch (error) {
        throw new Error(`Error al actualizar la liquidación: ${error.message}`);
      }
    },
  },
};

export default liquidacionResolver;
