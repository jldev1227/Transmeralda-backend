export function generarCodigoRecuperacion() {
    // Genera un número entre 100000 y 999999
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  