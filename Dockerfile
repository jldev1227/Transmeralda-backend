# Usa la imagen oficial de Node
FROM node:22.6.0

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos solamente package.json y package-lock.json para instalar dependencias
COPY package*.json ./

# Ejecutamos npm install para instalar las dependencias
RUN npm install

# Ahora sí copiamos el resto del proyecto
COPY . .

# (Opcional) Instalación de Python 3.9.5 desde fuente (si lo necesitas de verdad)
RUN curl -o python.tar.xz https://www.python.org/ftp/python/3.9.5/Python-3.9.5.tar.xz && \
    tar -xf python.tar.xz && \
    cd Python-3.9.5 && \
    ./configure && make && make install

# Exponemos el puerto 4000
EXPOSE 4000

# Comando para ejecutar la aplicación
CMD ["npm", "start"]
