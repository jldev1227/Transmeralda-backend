import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Usuario from './src/models/Usuario.js'; // Asegúrate de que el modelo esté correctamente importado
import moment from 'moment';

// Obtener __dirname en un módulo ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo JSON
const filePath = path.join(__dirname, 'usuarios_activos_sin_campos.json');

// Leer y procesar el archivo JSON
fs.readFile(filePath, 'utf8', async (err, data) => {
  if (err) {
    console.error('Error al leer el archivo JSON:', err);
    return;
  }

  try {
    const usuarios = JSON.parse(data);

    // Convertir fechas y asegurar valores únicos para campos restringidos
    usuarios.forEach((usuario, index) => {
      // Convertir y validar las fechas
      if (usuario.fechaNacimiento && moment(usuario.fechaNacimiento, 'D/M/YYYY', true).isValid()) {
        usuario.fechaNacimiento = moment(usuario.fechaNacimiento, 'D/M/YYYY').format('YYYY-MM-DD');
      } else {
        usuario.fechaNacimiento = null;
      }

      if (usuario.fechaExpedicionLicencia && moment(usuario.fechaExpedicionLicencia, 'D/M/YYYY', true).isValid()) {
        usuario.fechaExpedicionLicencia = moment(usuario.fechaExpedicionLicencia, 'D/M/YYYY').format('YYYY-MM-DD');
      } else {
        usuario.fechaExpedicionLicencia = null;
      }

      if (usuario.fechaVencimientoLicencia && moment(usuario.fechaVencimientoLicencia, 'D/M/YYYY', true).isValid()) {
        usuario.fechaVencimientoLicencia = moment(usuario.fechaVencimientoLicencia, 'D/M/YYYY').format('YYYY-MM-DD');
      } else {
        usuario.fechaVencimientoLicencia = null;
      }

      if (usuario.fechaVinculacionEmpresa && moment(usuario.fechaVinculacionEmpresa, 'D/M/YYYY', true).isValid()) {
        usuario.fechaVinculacionEmpresa = moment(usuario.fechaVinculacionEmpresa, 'D/M/YYYY').format('YYYY-MM-DD');
      } else {
        usuario.fechaVinculacionEmpresa = null;
      }

      // Asegurar valores únicos o nulos en campos con restricciones de unicidad
      usuario.cc = usuario.cc === 'N/A' ? `temp-cc-${index}` : usuario.cc;
      usuario.correo = usuario.correo === 'N/A' ? `temp-correo-${index}@example.com` : usuario.correo;
      usuario.telefono = usuario.telefono === 'N/A' ? `temp-phone-${index}` : usuario.telefono;
    });

    // Insertar usuarios en lotes para evitar problemas con el tamaño de la consulta
    const batchSize = 10;
    for (let i = 0; i < usuarios.length; i += batchSize) {
      const batch = usuarios.slice(i, i + batchSize);
      await Usuario.bulkCreate(batch, { validate: true });
    }

    console.log('Inserción masiva de usuarios completada con éxito.');
  } catch (error) {
    console.error('Error durante la inserción masiva de usuarios:', error);
  }
});
