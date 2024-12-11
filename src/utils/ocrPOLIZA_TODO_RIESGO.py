import json
import re
from datetime import datetime
import unicodedata
import sys

# Función para normalizar texto quitando tildes
def normalize(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')

MESES = {
    "ene": "01", "feb": "02", "mar": "03", "abr": "04", "may": "05", "jun": "06",
    "jul": "07", "ago": "08", "sep": "09", "oct": "10", "nov": "11", "dic": "12",
    "enero": "01", "febrero": "02", "marzo": "03", "abril": "04", "mayo": "05", "junio": "06",
    "julio": "07", "agosto": "08", "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
}

def identificarPolizaTodoRiesgo(data):
   for page in data['analyzeResult']['readResults']:
    lines = page['lines']
    for i, line in enumerate(lines):
        text = line['text']

        # Dividir el texto en palabras y buscar "POLIZA"
        words = text.split()
        
        for word in words:
            if "POLIZA" in normalize(word.upper()):
                return True

    return None

def extract_and_format_dates(data):
    formatted_dates = []

    # Loop through the pages and lines in the data
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']

        day, month, year = None, None, None

        for i, line in enumerate(lines):
            text = line['text'].strip()

            # Handle the format DD-MMM.-YYYY or DD-MMM-YYYY
            match = re.search(r"(\d{2})-(\w{3,})?\.-?(\d{4})", text, re.IGNORECASE)
            if match:
                try:
                    day, month_text, year = match.groups()
                    month = MESES.get(month_text.lower().replace('.', ''))  # Normalize the month text
                    if month:
                        formatted_date = datetime.strptime(f"{year}-{month}-{day}", "%Y-%m-%d")
                        formatted_dates.append(formatted_date)
                except ValueError:
                    continue

            # Check for inline dates in formats like DD-MM-YYYY or DD/MM/YYYY
            date_patterns = [r"\b\d{2}/\d{2}/\d{4}\b", r"\b\d{2}-\d{2}-\d{4}\b"]
            for pattern in date_patterns:
                matches = re.findall(pattern, text)
                for match in matches:
                    try:
                        if "/" in match:
                            formatted_date = datetime.strptime(match, "%d/%m/%Y")
                        else:
                            formatted_date = datetime.strptime(match, "%d-%m-%Y")
                        formatted_dates.append(formatted_date)
                    except ValueError:
                        continue

            # Handle separate date components (e.g., each part on a different line)
            if text.isdigit():
                if len(text) == 2 and not day or len(text) == 1 and not day:  # Potential day
                    day = text
                elif len(text) == 2 and day and not month or len(text) == 1 and day and not month:  # Potential month
                    month = text
                elif len(text) == 4 and day and month:  # Potential year
                    year = text

            # If we have all components, format the date
            if day and month and year:
                try:
                    formatted_date = datetime.strptime(f"{year}-{month}-{day}", "%Y-%m-%d")
                    formatted_dates.append(formatted_date)
                except ValueError:
                    pass
                finally:
                    day, month, year = None, None, None  # Reset for the next potential date

    # Find the latest date
    if formatted_dates:
        latest_date = max(formatted_dates)
        return latest_date.strftime("%Y-%m-%d")
    else:
        return "No encontrado"
    
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

    placa_param = 'TFX325'
    # Leer el archivo JSON especificado
    try:
        with open('./src/utils/tempOcrDataPOLIZA_TODO_RIESGO.json', 'r', encoding='utf-8') as file:
            data = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        sys.exit(1)

    # Validar la tarjeta de operación y buscar la placa
    isTarjetaOperacion = identificarPolizaTodoRiesgo(data)

    if isTarjetaOperacion:
        vencimiento = extract_and_format_dates(data)
        placa_found = extract_placa(data, placa_param)

        vehiculo_data = {
            "polizaTodoRiesgoVencimiento": vencimiento if vencimiento else "No encontrado",
            "placaEncontrada": placa_found,
        }

        # Imprimir el resultado en formato JSON
        print(json.dumps(vehiculo_data, indent=4, ensure_ascii=False))
    else:
        print("No se encontró la Tarjeta de operación en el archivo de texto")