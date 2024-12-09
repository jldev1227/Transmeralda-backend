import json
import re
from datetime import datetime
import unicodedata

# Función para normalizar texto quitando tildes
def normalize(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')


def identificarTARJETA_DE_OPERACION(data):
   for page in data['analyzeResult']['readResults']:
    lines = page['lines']
    for i, line in enumerate(lines):
        text = line['text']
        
        # Si encontramos "TARJETA DE OPERACIÓN" y el índice es menor a 10, procedemos
        if "TARJETA DE OPERACIÓN" in text and i < 10:
            # Recorremos las siguientes 10 líneas, si están disponibles
            return True
    return None

from datetime import datetime

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
                for offset in range(1, 2):  # Chequea hasta 13 líneas siguientes
                    if i + offset < len(lines):
                        next_line = lines[i + offset]['text'].strip()
                        formatted_date = is_valid_date(next_line)
                        if formatted_date:  # Si se encontró una fecha válida
                            return formatted_date
    return None  # No se encontró una fecha válida

def extract_placa(data):
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text']
            if "PLACA" in text:
                for j, next_line in enumerate(lines[i:]):
                    next_text = next_line['text']
                    match = re.search(r'[A-Z]{3}\d{3}', next_text)
                    if match:
                        return match.group(0)
    return None


with open('./src/utils/tempOcrDataTARJETA_DE_OPERACION.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Extraer la placa y su posición en las líneas
isTarjetaOperacion = identificarTARJETA_DE_OPERACION(data)

if(isTarjetaOperacion):
    vencimiento = extract_fecha_vencimiento(data)
    placa = extract_placa(data)

    vehiculo_data = {
        "tarjetaOperacionVencimiento": vencimiento,
        "placa": placa,
    }

    # Convertir el diccionario a un objeto JSON y imprimirlo
    print(json.dumps(vehiculo_data, indent=4, ensure_ascii=True))
else:
    print("No se encontró la Tarjeta de operación en el archivo de texto")
    