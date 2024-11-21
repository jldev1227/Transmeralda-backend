# Usa una imagen oficial de Node.js como base
FROM node:22.6.0

# Define el directorio de trabajo en el contenedor
WORKDIR /app

# Copia los archivos del proyecto a la imagen del contenedor
COPY . .

# Instala las dependencias y Python 3
RUN apt-get update && \
    apt-get install -y python3 && \
    apt-get remove -y python && \
    ln -sf /usr/bin/python3 /usr/bin/python

# Instala las dependencias de Node.js
RUN npm install

# Expone el puerto 4000
EXPOSE 4000

# Comando para ejecutar la aplicación
CMD ["npm", "start"]
