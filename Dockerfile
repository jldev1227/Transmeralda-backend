# Usa una imagen oficial de Node.js como base
FROM node:16

# Define el directorio de trabajo en el contenedor
WORKDIR /app

# Copia los archivos del proyecto a la imagen del contenedor
COPY . .

# Instala las dependencias
RUN npm install

# Expone el puerto 4000
EXPOSE 4000

# Comando para ejecutar la aplicación
CMD ["npm", "start"]

