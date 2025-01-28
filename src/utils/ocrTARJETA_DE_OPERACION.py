import json
import re
from datetime import datetime
import unicodedata
import sys

# Función para normalizar texto quitando tildes
def normalize(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')

def identificarTARJETA_DE_OPERACION(data):
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text']
            # Si encontramos "TARJETA DE OPERACIÓN" y el índice es menor a 10, procedemos
            if "TARJETA DE OPERACION" in normalize(text.upper()) and i < 10:
                return True
    return None

def extract_fecha_vencimiento(data):
    def is_valid_date(text):
        # Intenta analizar la fecha en los dos formatos posibles
        for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
            try:
                # Si es válida, retorna la fecha en formato YYYY-MM-DD
                return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return None  # No es una fecha válida

    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text'].strip()
            if "HASTA:" in text:
                # Verifica las próximas líneas después de encontrar "HASTA:"
                for offset in range(1, 2):
                    if i + offset < len(lines):
                        next_line = lines[i + offset]['text'].strip()
                        formatted_date = is_valid_date(next_line)
                        if formatted_date:  # Si se encontró una fecha válida
                            return formatted_date
    return None  # No se encontró una fecha válida

def extract_placa(data, placa_param):
    placa_param = normalize(placa_param.upper())
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for line in lines:
            text = normalize(line['text'].upper())
            if placa_param in text:
                return text
    return False

if __name__ == "__main__":
    # Validar argumentos de línea de comandos
    if len(sys.argv) != 2:
        print("Uso: python script.py <placa>")
        sys.exit(1)

    placa_param = sys.argv[1]

    # Leer el archivo JSON especificado
    try:
        with open('./src/utils/tempOcrDataTARJETA_DE_OPERACIÓN.json', 'r', encoding='utf-8') as file:
            data = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        sys.exit(1)

    # Validar la tarjeta de operación y buscar la placa
    isTarjetaOperacion = identificarTARJETA_DE_OPERACION(data)

    if isTarjetaOperacion:
        vencimiento = extract_fecha_vencimiento(data)
        placa_found = extract_placa(data, placa_param)

        vehiculo_data = {
            "tarjetaDeOperacionVencimiento": vencimiento if vencimiento else "No encontrado",
            "placaEncontrada": placa_found,
        }

        # Imprimir el resultado en formato JSON
        print(json.dumps(vehiculo_data, indent=4, ensure_ascii=False))
    else:
        print("No se encontró la Tarjeta de operación en el archivo de texto")