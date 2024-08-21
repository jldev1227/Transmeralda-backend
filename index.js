import { ApolloServer } from "apollo-server-express"; // Cambiado de "apollo-server" a "apollo-server-express"
import dotenv from "dotenv";
import express from "express";

// Schemes
import usuarioTypeDef from "./src/types/usuarioTypeDef.js";
import vehiculoTypeDef from "./src/types/vehiculoTypeDef.js";

// Resolvers
import usuarioResolver from "./src/resolvers/usuarioResolvers.js";
import "./src/config/db.js";
import { createContext } from "./src/config/context.js";
import { authenticateUser } from "./src/middlewares/authMiddleware.js";

dotenv.config();

// Configuración del servidor Express
const app = express();
express.json();

// Middleware para manejar la ruta del Deep Link
app.get("/deeplink-confirm/:token", (req, res) => {
    const { token } = req.params;
    console.log(token);
    
    // Respuesta HTML con la redirección y el enlace de respaldo
    res.send(`
          <!DOCTYPE html>
          <html>
              <head>
                  <title>Redirigiendo...</title>
                  <script type="text/javascript">
                      window.location.href = "transmeralda://confirm/${token}";
                  </script>
              </head>
              <body>
                  <p>Si no eres redirigido automáticamente, haz clic <a href="transmeralda://confirm/${token}">aquí</a>.</p>
              </body>
          </html>
      `);
  });
  
// Configuración del servidor Apollo
const server = new ApolloServer({
  typeDefs: [usuarioTypeDef, vehiculoTypeDef],
  resolvers: [usuarioResolver],
  context: async ({ req }) => {
    const userData = await authenticateUser(req);
    return { ...userData };
  },
});

// Aplicar el middleware de Apollo Server a la aplicación Express
await server.start(); // Asegúrate de que el servidor Apollo esté listo antes de aplicar el middleware
server.applyMiddleware({ app });

// Escucha en un puerto específico
app.listen({ port: 4000 }, () => {
  console.log(`Server ready at http://localhost:4000${server.graphqlPath}`);
});
