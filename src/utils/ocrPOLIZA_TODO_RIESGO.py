import json
import re
from datetime import datetime
import unicodedata

# Función para normalizar texto quitando tildes
def normalize(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')


def identificarSOAT(data):
   for page in data['analyzeResult']['readResults']:
    lines = page['lines']
    for i, line in enumerate(lines):
        text = line['text']
        
        # Si encontramos "SOAT" y el índice es menor a 10, procedemos
        if "TOMADOR" in text:
            # Recorremos las siguientes 10 líneas, si están disponibles
            return True
    return None

def extract_and_format_dates(data):
    formatted_dates = []

    # Loop through the pages and lines in the data
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']

        # Prepare to concatenate relevant pieces of date information
        day, month, year = None, None, None

        for line in lines:
            text = line['text']


            # Extract day, month, and year based on the text content
            if text == 'DD':
                try:
                    day = lines[lines.index(line) + 1]['text']
                except IndexError:
                    continue
            elif text == 'MM':
                try:
                    month = lines[lines.index(line) + 1]['text']
                except IndexError:
                    continue
            elif text == 'AAAA':
                try:
                    year = lines[lines.index(line) + 1]['text']
                except IndexError:
                    continue

            # Once we have all components, format the date
            if day and month and year:
                try:
                    formatted_date = datetime.strptime(f"{year}-{month}-{day}", "%Y-%m-%d")
                    formatted_dates.append(formatted_date)
                except ValueError:
                    continue
                finally:
                    day, month, year = None, None, None  # Reset for the next potential date

    # Find the latest date
    if formatted_dates:
        latest_date = max(formatted_dates)
        return latest_date.strftime("%Y-%m-%d")
    else:
        return None


def extract_placa(data):
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text']
            
            match = re.search(r'[A-Z]{3}\d{3}', text)
            if match:
                return match.group(0)
    return None


with open('./src/utils/tempOcrDataPOLIZA_TODO_RIESGO.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Extraer la placa y su posición en las líneas
isPolizaRiesgo = identificarSOAT(data)

if(isPolizaRiesgo):
    vencimiento = extract_and_format_dates(data)
    placa = extract_placa(data)

    vehiculo_data = {
        "polizaTodoRiesgo": vencimiento,
        "placa": placa,
    }

    # Convertir el diccionario a un objeto JSON y imprimirlo
    print(json.dumps(vehiculo_data, indent=4, ensure_ascii=True))
else:
    print("No se encontró la Póliza todo riesgo en el archivo de texto")
    