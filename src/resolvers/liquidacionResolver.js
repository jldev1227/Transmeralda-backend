import { Liquidacion, Anticipo, Bonificacion, Pernote, Recargo, Usuario, Vehiculo } from "../models/index.js";

const liquidacionResolver = {
  Query: {
    // Obtener todas las liquidaciones
    liquidaciones: async () => {
      const liquidaciones = await Liquidacion.findAll({
        include: [
          { model: Usuario, as: "conductor" },  // Incluye la relación con el conductor
          { model: Vehiculo, as: "vehiculos" },  // Incluye la relación con los vehículos
          { model: Bonificacion, as: "bonificaciones" },  // Incluye la relación con bonificaciones
          { model: Pernote, as: "pernotes" },  // Incluye la relación con pernotes
          { model: Recargo, as: "recargos" },  // Incluye la relación con recargos
          { model: Anticipo, as: "anticipos" },  // Incluye la relación con recargos
        ],
      });
    
      return liquidaciones.map((liquidacion) => {
        // Verificar si periodoStart y periodoEnd existen
        const periodo =
          liquidacion.periodoStart && liquidacion.periodoEnd
            ? {
                start: {
                  era: "AD",
                  year: new Date(liquidacion.periodoStart).getFullYear(),
                  month: new Date(liquidacion.periodoStart).getMonth() + 1,
                  day: new Date(liquidacion.periodoStart).getDate(),
                  calendar: { identifier: "gregorian" },  // Corregido a 'gregorian'
                },
                end: {
                  era: "AD",
                  year: new Date(liquidacion.periodoEnd).getFullYear(),
                  month: new Date(liquidacion.periodoEnd).getMonth() + 1,
                  day: new Date(liquidacion.periodoEnd).getDate(),
                  calendar: { identifier: "gregorian" },  // Corregido a 'gregorian'
                },
              }
            : null;
    
        // Devolver los datos de la liquidación, incluyendo el periodo
        return {
          ...liquidacion.toJSON(),
          periodo,
        };
      });
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
        salarioDevengado,
        totalPernotes,
        totalBonificaciones,
        totalRecargos,
        diasLaborados,
        diasLaboradosVillanueva,
        ajusteSalarial,
        vehiculos,
        bonificaciones,
        pernotes,
        recargos
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
            id: vehiculos, // Ya que vehiculos es una lista de IDs
          },
        });
    
        // Verificar que todos los vehículos existan
        if (vehiculosDB.length !== vehiculos.length) {
          throw new Error("Algunos vehículos no se encontraron.");
        }
    
        // Crear la nueva liquidación
        const nuevaLiquidacion = await Liquidacion.create({
          conductorId, // Asociar conductor
          periodoStart,
          periodoEnd,
          auxilioTransporte,
          sueldoTotal,
          salarioDevengado,
          totalPernotes,
          totalBonificaciones,
          totalRecargos,
          diasLaborados,
          diasLaboradosVillanueva,
          ajusteSalarial,
        });
    
        // Asociar los vehículos a la liquidación
        await nuevaLiquidacion.setVehiculos(vehiculosDB); // Relacionar los vehículos
    
        // Insertar bonificaciones por vehículo
        if (bonificaciones && bonificaciones.length > 0) {
          for (const bono of bonificaciones) {
            await Bonificacion.create({
              liquidacionId: nuevaLiquidacion.id,
              vehiculoId: bono.vehiculoId, // Asegúrate de pasar el `vehiculoId` con cada bonificación
              name: bono.name,
              values: bono.values, // El array de objetos con { mes, quantity }
              value: bono.value,
            });
          }
        }
    
        // Insertar pernotes por vehículo
        if (pernotes && pernotes.length > 0) {
          for (const pernote of pernotes) {
            await Pernote.create({
              liquidacionId: nuevaLiquidacion.id,
              vehiculoId: pernote.vehiculoId, // Asegúrate de pasar el `vehiculoId` con cada pernote
              empresa: pernote.empresa,
              cantidad: pernote.cantidad,
              valor: pernote.valor,
              fechas: pernote.fechas, // Array de fechas
            });
          }
        }
    
        // Insertar recargos por vehículo
        if (recargos && recargos.length > 0) {
          for (const recargo of recargos) {
            await Recargo.create({
              liquidacionId: nuevaLiquidacion.id,
              vehiculoId: recargo.vehiculoId, // Asegúrate de pasar el `vehiculoId` con cada recargo
              empresa: recargo.empresa,
              valor: recargo.valor,
              pagCliente: recargo.pagCliente, // Booleano opcional
              mes: recargo.mes, // Mes relacionado al recargo
            });
          }
        }
    
        // Consultar y devolver la liquidación con los datos relacionados
        const liquidacionConDetalles = await Liquidacion.findOne({
          where: { id: nuevaLiquidacion.id },
          include: [
            {
              model: Usuario, // Modelo del conductor
              as: 'conductor', // Asegúrate de que el alias esté bien configurado en tu relación
            },
            {
              model: Vehiculo,
              as: 'vehiculos', // Relacionar vehículos
            },
            {
              model: Bonificacion,
              as: 'bonificaciones', // Relacionar bonificaciones
            },
            {
              model: Pernote,
              as: 'pernotes', // Relacionar pernotes
            },
            {
              model: Recargo,
              as: 'recargos', // Relacionar recargos
            },
          ],
        });
    
        return liquidacionConDetalles;
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

        console.log(args.diasLaboradosVillanueva, liquidacion.diasLaboradosVillanueva)
    
        // Actualizar los campos permitidos si están presentes en los argumentos
        await liquidacion.update({
          conductorId: args.conductorId || liquidacion.conductorId,
          periodoStart: args.periodoStart,
          periodoEnd: args.periodoEnd,
          auxilioTransporte: args.auxilioTransporte,
          sueldoTotal: args.sueldoTotal,
          salarioDevengado: args.salarioDevengado,
          totalPernotes: args.totalPernotes || liquidacion.totalPernotes,
          totalBonificaciones: args.totalBonificaciones,
          totalRecargos: args.totalRecargos,
          diasLaborados: args.diasLaborados,
          diasLaboradosVillanueva: args.diasLaboradosVillanueva,
          ajusteSalarial: args.ajusteSalarial,
        });
    
        // Actualizar la relación con los vehículos si se proporciona
        if (args.vehiculos && args.vehiculos.length > 0) {
          const vehiculos = await Vehiculo.findAll({
            where: { id: args.vehiculos },
          });
          await liquidacion.setVehiculos(vehiculos); // Establece la nueva relación con los vehículos
        }
    
        // Actualizar bonificaciones
        if (args.bonificaciones && args.bonificaciones.length > 0) {
          // Primero eliminamos las bonificaciones existentes relacionadas con esta liquidación
          await Bonificacion.destroy({ where: { liquidacionId: liquidacion.id } });
    
          // Luego creamos las nuevas bonificaciones
          for (const bono of args.bonificaciones) {
            await Bonificacion.create({
              liquidacionId: liquidacion.id,
              vehiculoId: bono.vehiculoId,
              name: bono.name,
              values: bono.values, // Array de { mes, quantity }
              value: bono.value,
            });
          }
        }
    
        // Actualizar pernotes
        if (args.pernotes && args.pernotes.length > 0) {
          // Eliminar los pernotes existentes
          await Pernote.destroy({ where: { liquidacionId: liquidacion.id } });
    
          // Crear los nuevos pernotes
          for (const pernote of args.pernotes) {
            await Pernote.create({
              liquidacionId: liquidacion.id,
              vehiculoId: pernote.vehiculoId,
              empresa: pernote.empresa,
              cantidad: pernote.cantidad,
              valor: pernote.valor,
              fechas: pernote.fechas, // Array de fechas (nueva estructura)
            });
          }
        }
    
        // Actualizar recargos
        if (args.recargos && args.recargos.length > 0) {
          // Eliminar los recargos existentes
          await Recargo.destroy({ where: { liquidacionId: liquidacion.id } });
    
          // Crear los nuevos recargos
          for (const recargo of args.recargos) {
            await Recargo.create({
              liquidacionId: liquidacion.id,
              vehiculoId: recargo.vehiculoId,
              empresa: recargo.empresa,
              valor: recargo.valor,
              pagCliente: recargo.pagCliente, // Booleano
              mes: recargo.mes, // Mes en string
            });
          }
        }
    
        // Retornar la liquidación actualizada junto con las relaciones
        const liquidacionActualizada = await Liquidacion.findByPk(args.id, {
          include: [
            { model: Usuario, as: "conductor" },
            { model: Vehiculo, as: "vehiculos" },
            { model: Bonificacion, as: "bonificaciones" },
            { model: Pernote, as: "pernotes" },
            { model: Recargo, as: "recargos" },
          ],
        });
    
        return liquidacionActualizada;
      } catch (error) {
        throw new Error(`Error al actualizar la liquidación: ${error.message}`);
      }
    },
    async registrarAnticipos(_, { anticipos }, { models }) {
      try {
        const registros = await Promise.all(
          anticipos.map(async (anticipo) => {
            const { valor, liquidacionId } = anticipo;
            
            // Validar que la liquidación exista antes de registrar el anticipo
            const liquidacion = await Liquidacion.findByPk(liquidacionId);
            if (!liquidacion) {
              throw new Error('La liquidación especificada no existe');
            }
    
            // Crear el anticipo vinculado a la liquidación
            return await Anticipo.create({
              valor,
              liquidacionId,
            });
          })
        );
    
        return registros; // Devolver los registros de anticipos creados
      } catch (error) {
        throw new Error("Error registrando anticipos: " + error.message);
      }
    },
    async eliminarAnticipo(_, { id }) {
      try {
        // Buscar el anticipo por su ID
        const anticipo = await Anticipo.findByPk(id);
        
        if (!anticipo) {
          throw new Error("Anticipo no encontrado");
        }

        // Eliminar el anticipo
        await anticipo.destroy();
        
        return true; // Devolver true si se eliminó con éxito
      } catch (error) {
        console.error("Error eliminando el anticipo:", error);
        throw new Error("Error eliminando el anticipo");
      }
    },    
  },
};

export default liquidacionResolver;
