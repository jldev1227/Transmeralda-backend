import { Formulario, Categoria, Campo, Vehiculo } from "../models/index.js";
import { GraphQLJSON } from "graphql-type-json";

const formularioResolver = {
  JSON: GraphQLJSON, // Agrega el resolver para el scalar JSON

  Formulario: {
    categorias: async (parent) => {
      // Incluir los 'campos' al obtener las categorías
      const categorias = await parent.getCategorias({
        include: [
          {
            model: Campo,
            as: "campos",
          },
        ],
      });
      return categorias;
    },
  },

  // Agregar un resolver para Categoria.campos
  Categoria: {
    campos: async (parent) => {
      // 'campos' ya debería estar incluido debido al 'include' anterior
      // Si no, puedes obtenerlos así:
      // return parent.getCampos();
      return parent.campos || [];
    },
  },

  Campo: {
    opciones: async (parent) => {
      try {
        const opciones = await parent.getOpciones(); // Relación definida en Sequelize
        console.log(opciones)
        return opciones;
      } catch (error) {
        console.error("Error al obtener opciones:", error);
        throw new Error("No se pudieron obtener las opciones para el campo.");
      }
    },
  },
  
  Query: {
    // Obtener todos los formularios
    obtenerFormularios: async () => {
      try {
        const formularios = await Formulario.findAll({
          include: [
            {
              model: Categoria,
              as: "categorias",
              include: [
                {
                  model: Campo,
                  as: "campos",
                },
              ],
            },
          ],
        });
        return formularios;
      } catch (error) {
        console.error("Error al obtener formularios:", error);
        throw new Error("No se pudieron obtener los formularios.");
      }
    },

    // Obtener un formulario por su ID
    obtenerFormulario: async (_, { id }) => {
      try {
        const formulario = await Formulario.findByPk(id, {
          include: [
            {
              model: Categoria,
              as: "categorias",
              include: [
                {
                  model: Campo,
                  as: "campos"
                },
              ],
            },
          ],
        });

        if (!formulario) {
          throw new Error(`No se encontró el formulario con el ID: ${id}`);
        }
        return formulario;
      } catch (error) {
        console.error(`Error al obtener el formulario con ID ${id}:`, error);
        throw new Error("No se pudo obtener el formulario.");
      }
    },

    obtenerOpciones: async (_, { fuente, parametro }) => {
      try {
        if (fuente === "vehiculos") {
          const vehiculos = await Vehiculo.findAll({
            raw: true, // Devuelve los datos como objetos simples, si es necesario
          });
          
    
          if (vehiculos.length === 0) {
            throw new Error("No se encontraron opciones para la fuente especificada.");
          }
    
          const opciones = vehiculos.map((vehiculo) => ({
            Valor: vehiculo.placa, // El valor será la placa
            Label: vehiculo.placa, // El label también será la placa
            datosVehiculo: vehiculo, // Incluye la información completa del vehículo
          }));

          return opciones;
        } else {
          throw new Error("Fuente no soportada.");
        }
      } catch (error) {
        console.error("Error en obtenerOpciones:", error.message);
        throw new Error("No se pudieron obtener las opciones.");
      }
    }
    
  },

  Mutation: {
    // Crear un nuevo formulario
    crearFormulario: async (_, { input }) => {
      // input podría ser un objeto que contenga Nombre, Descripcion, etc.
      const { Nombre, Descripcion } = input;

      try {
        const nuevoFormulario = await Formulario.create({
          Nombre,
          Descripcion,
        });
        return nuevoFormulario;
      } catch (error) {
        console.error("Error al crear formulario:", error);
        throw new Error("No se pudo crear el formulario.");
      }
    },

    // Actualizar un formulario existente
    actualizarFormulario: async (_, { id, input }) => {
      const { Nombre, Descripcion } = input;
      try {
        const formulario = await Formulario.findByPk(id);
        if (!formulario) {
          throw new Error(`No se encontró el formulario con el ID: ${id}`);
        }

        formulario.Nombre = Nombre !== undefined ? Nombre : formulario.Nombre;
        formulario.Descripcion =
          Descripcion !== undefined ? Descripcion : formulario.Descripcion;

        await formulario.save();
        return formulario;
      } catch (error) {
        console.error(`Error al actualizar el formulario con ID ${id}:`, error);
        throw new Error("No se pudo actualizar el formulario.");
      }
    },

    // Eliminar un formulario existente
    eliminarFormulario: async (_, { id }) => {
      try {
        const formulario = await Formulario.findByPk(id);
        if (!formulario) {
          throw new Error(`No se encontró el formulario con el ID: ${id}`);
        }

        await formulario.destroy();
        return true; // Puedes retornar true/false indicando éxito
      } catch (error) {
        console.error(`Error al eliminar el formulario con ID ${id}:`, error);
        throw new Error("No se pudo eliminar el formulario.");
      }
    },
  },
};

export default formularioResolver;
