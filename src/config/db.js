import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mssql", // Usar 'mssql' para Azure SQL
    dialectOptions: {
      encrypt: true, // Necesario para Azure SQL
      trustServerCertificate: false, // Desactivar si no confías en el certificado
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection to the database was successful.");

    // Sincroniza todos los modelos con la base de datos
    await sequelize.sync({ force: false }); // Usa force: true si deseas recrear las tablas
    console.log("Modelos registrados en Sequelize:", sequelize.models);

    console.log("All models were synchronized successfully.");
  } catch (err) {
    console.error("Error al conectar a la base de datos:", err);
  }
})();

export default sequelize;