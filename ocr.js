import { data } from "./data.js";

function removeAccents(text) {
    // Normaliza el texto a su forma básica y elimina los caracteres diacríticos
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

const extractDataFromOCR = (ocrResult) => {
  const pages = ocrResult.analyzeResult.readResults;
  const extractedData = {};
  let lineCounter = 0; // Contador de líneas después del modelo
  let captureClass = false; // Bandera para capturar la clase del vehículo
  let captureCarroceria = false; // Bandera para capturar el tipo de carrocería
  let captureCapacidad = false; // Bandera para capturar la capacidad en Kg/PSJ
  let captureMotor = false; // Bandera para capturar el número de motor
  let motorCounter = 0; // Contador de líneas después de "NÚMERO DE MOTOR"

  // Expresión Regular para la placa
  const placaRegex = /([A-Z]{3}\d{3})/i;
  // Expresión Regular para el número de motor
  const motorRegex = /[A-Z0-9-]{6,12}/i; // Ajuste la longitud según los ejemplos proporcionados

  pages.forEach((page) => {
    let previousLine = "";

    page.lines.forEach((line) => {
      const lineText = line.words.map((word) => word.text).join(" ");
      console.log(lineText); // Para depuración y visualizar la estructura del texto.

      // Buscar la placa del vehículo
      const placaMatch = lineText.match(placaRegex);
      if (placaMatch) {
        extractedData.placa = placaMatch[0];
        previousLine = "PLACA ENCONTRADA"; // Cambia el contexto para buscar la marca
        return; // Continúa con la siguiente línea después de encontrar la placa
      }

      // Si la línea previa indica que se encontró la placa, capturamos la marca
      if (previousLine === "PLACA ENCONTRADA") {
        extractedData.marca = lineText.trim();
        previousLine = "MARCA ENCONTRADA"; // Cambia el contexto para buscar la línea
        return; // Continúa con la siguiente línea después de encontrar la marca
      }

      // Si la línea previa indica que se encontró la marca, capturamos la línea del vehículo
      if (previousLine === "MARCA ENCONTRADA") {
        extractedData.linea = lineText.trim();
        previousLine = "LINEA ENCONTRADA"; // Cambia el contexto para buscar el modelo
        return; // Continúa con la siguiente línea después de encontrar la línea
      }

      // Si la línea previa indica que se encontró la línea, capturamos el modelo del vehículo
      if (previousLine === "LINEA ENCONTRADA") {
        extractedData.modelo = lineText.trim();
        previousLine = "MODELO ENCONTRADO"; // Cambia el contexto para contar líneas hacia el color
        lineCounter = 0; // Inicia el conteo para encontrar el color
        return; // Continúa con la siguiente línea después de encontrar el modelo
      }

      // Contar líneas después de encontrar el modelo para capturar el color
      if (previousLine === "MODELO ENCONTRADO") {
        lineCounter++;
        if (lineCounter === 5) {
          // Captura el color en la línea correcta
          extractedData.color = lineText.trim();
          previousLine = ""; // Resetea el contexto después de capturar el color
        }
        return;
      }

      // Buscar la palabra clave para la clase del vehículo
      if (lineText.includes("CAPACIDAD Kg/PSJ")) {
        captureClass = true; // Cambia el contexto para capturar la clase del vehículo
        return;
      }

      if (captureClass) {
        extractedData.claseVehiculo = lineText.trim();
        captureClass = false; // Resetea la bandera después de capturar la clase del vehículo
        captureCarroceria = true; // Cambia el contexto para capturar el tipo de carrocería
        return;
      }

      // Si se activó la bandera para capturar el tipo de carrocería
      if (captureCarroceria) {
        const carroceriaParts = lineText.trim().split(" ");

        // Si la carrocería contiene "CON DIESEL", separa el combustible
        if (
          carroceriaParts.includes("CON") &&
          carroceriaParts.includes("DIESEL")
        ) {
          extractedData.tipoCarroceria = `${carroceriaParts[0]} ${carroceriaParts[1]}`; // Solo captura "DOBLE CABINA"
          extractedData.combustible = "DIESEL"; // Asigna "DIESEL" como combustible
        } else {
          // Si es solo "DOBLE CABINA" sin combustible en la misma línea
          extractedData.tipoCarroceria = lineText.trim();
        }

        captureCarroceria = false; // Resetea la bandera después de capturar el tipo de carrocería
        captureCapacidad = true; // Cambia el contexto para capturar la capacidad
        return;
      }

      // Si se activó la bandera para capturar la capacidad
      if (captureCapacidad) {
        const capacidadMatch = lineText.trim().match(/^\d+$/);
        if (capacidadMatch) {
          extractedData.capacidad = capacidadMatch[0];
        } else if (lineText.trim().toUpperCase() === "DIESEL") {
          extractedData.combustible = "DIESEL";
        }
        captureCapacidad = false;
        return;
      }

      if (removeAccents(lineText).includes("NUMERO DE MOTOR")) {
        captureMotor = true;
        motorCounter = 0; // Reinicia el contador para las líneas después de la palabra clave
        return; // Continúa con la siguiente línea
      }
  
      // Contar líneas después de "NÚMERO DE MOTOR"
      if (captureMotor) {
        motorCounter++;
        console.log('CAPTURANDO MOTOR N°', motorCounter, lineText)
        // Captura el número de motor en la segunda línea o cuando coincide con el patrón
        if (motorRegex.test(lineText)) {
            console.log('CAPTURADO')
          const motorMatch = lineText.match(motorRegex);
          if (motorMatch) {
            extractedData.numeroMotor = motorMatch['input'];
            captureMotor = false; // Resetea la bandera solo después de capturar el número de motor
          }
        }else{
            console.log('LineText:', lineText, 'No logro hacer match', motorCounter)
        }
  
        // Resetea la bandera si pasa de la segunda línea y no encuentra un número de motor
        if (motorCounter > 2) {
          captureMotor = false;
        }
      }
    });
  });

  return extractedData;
};

const ocrResult = extractDataFromOCR(data);
console.log(ocrResult);
