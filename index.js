import "./src/config/db.js";
import { ApolloServer } from "apollo-server";
import dotenv from 'dotenv'

// Schemes
import usuarioTypeDef from "./src/types/usuarioTypeDef.js";

// Resolvers
import usuarioResolver from "./src/resolvers/usuarioResolvers.js";
import vehiculoTypeDef from "./src/types/vehiculoTypeDef.js";

dotenv.config()

const server = new ApolloServer({
    typeDefs: [usuarioTypeDef, vehiculoTypeDef], 
    resolvers: [usuarioResolver],
    context: ({ req }) => {
        // Pasamos el objeto req al contexto para poder acceder a él en los resolvers
        return req
      },
})


server.listen().then(({ url }) => {
    console.log(`Server ready at ${url}`);
});