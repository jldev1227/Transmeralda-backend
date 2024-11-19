export function normalizeString(str) {
    return str.replace(/[^a-zA-Z0-9]/g, ""); // Elimina todo excepto letras y números
  }