import { Formulario, Vehiculo } from "../models/index.js";
import { GraphQLJSON } from 'graphql-type-json'

const formularioResolver = {
  JSON: GraphQLJSON, // Agrega el resolver para el scalar JSON

  Query: {
    // Obtener todos los formularios
    obtenerFormularios: async () => {
      try {
        const formularios = await Formulario.findAll();
        return formularios;
      } catch (error) {
        console.error("Error al obtener formularios:", error);
        throw new Error("No se pudieron obtener los formularios.");
      }
    },
    obtenerFormulario: async (_, { id }) => {
      try {
        const formulario = await Formulario.findByPk(id);
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
      console.log(fuente, parametro)
      try {
        if (fuente === 'vehiculos') {
          const vehiculos = await Vehiculo.findAll();
          
          console.log(vehiculos.map((vehiculo) => vehiculo))
          return vehiculos.map((vehiculo) => ({
            valor: vehiculo[parametro], // El campo usado como valor (ejemplo: "placa")
            label: vehiculo[parametro], // El campo mostrado en el selector (ejemplo: "placa")
            datosExtra: vehiculo, // Objeto completo para referencia
          }));
        } else {
          throw new Error('Fuente no soportada.');
        }
      } catch (error) {
        console.error('Error al obtener opciones dinámicas:', error);
        throw new Error('No se pudieron obtener las opciones.');
      }
    }    
  },
};

export default formularioResolver;
