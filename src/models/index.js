import sequelize from '../config/db.js';
import { initServicio } from './Servicio.js';
import { initUsuario } from './Usuario.js';
import { initVehiculo } from './Vehiculo.js'; // Similar a Usuario.js

// Inicializar los modelos
const Usuario = initUsuario(sequelize);
const Vehiculo = initVehiculo(sequelize);
const Servicio = initServicio(sequelize);

// Aquí podrías configurar asociaciones entre modelos si las hay

export { Usuario, Vehiculo, Servicio };
