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
        if "SOAT" in text and i < 10:
            # Recorremos las siguientes 10 líneas, si están disponibles
            for j in range(1, 11):  # Recorremos desde 1 hasta 10
                if i + j < len(lines):  # Asegurarnos de no salir del rango
                    next_line = lines[i + j]
                    
                    # Comprobamos si la línea es la póliza esperada
                    if normalize(next_line['text']) == normalize("PÓLIZA DE SEGURO DE DAÑOS CORPORALES CAUSADOS A LAS PERSONAS EN ACCIDENTES DE TRÁNSITO"):
                        return True
    return None


def extract_fecha_vencimiento(data):
    fechas = []
    current_year, current_month, current_day = None, None, None  # Variables para los componentes de la fecha
    temp_date_components = []  # Lista para almacenar componentes temporales de fecha

    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for line in lines:
            # Obtener el texto de la línea actual y dividirlo en palabras individuales
            text = line['text'].strip()
            words = text.split()

            for word in words:
                # Verificar si la palabra es una fecha completa en formato "YYYY-MM-DD" o "YYYY MM DD"
                full_date_match = re.match(r'^20\d{2}[- ]\d{1,2}[- ]\d{1,2}$', word)
                if full_date_match:
                    try:
                        # Intentar parsear la fecha directamente
                        fecha = datetime.strptime(word.replace(" ", "-"), "%Y-%m-%d")
                        fechas.append(fecha)
                        continue  # Saltar el resto de la lógica de búsqueda de componentes
                    except ValueError:
                        pass  # Ignorar fechas inválidas en este formato

                # Buscar componentes de año, mes, día en cada palabra
                year_match = re.match(r'^20\d{2}$', word)
                month_match = re.match(r'^(1[0-2]|0?[1-9])$', word)
                day_match = re.match(r'^(3[01]|[12][0-9]|0?[1-9])$', word)

                # Si se detecta un año y no tenemos una fecha completa
                if year_match:
                    current_year = int(year_match.group(0))
                    temp_date_components = [current_year]  # Reiniciar componentes temporales

                # Si se detecta un mes y ya tenemos un año en componentes temporales
                elif month_match and len(temp_date_components) == 1:
                    current_month = int(month_match.group(0))
                    temp_date_components.append(current_month)

                # Si se detecta un día y ya tenemos año y mes en componentes temporales
                elif day_match and len(temp_date_components) == 2:
                    current_day = int(day_match.group(0))
                    temp_date_components.append(current_day)

                    # Intentar formar la fecha completa
                    if len(temp_date_components) == 3:
                        try:
                            fecha = datetime(temp_date_components[0], temp_date_components[1], temp_date_components[2])
                            fechas.append(fecha)
                        except ValueError:
                            pass  # Ignorar fechas inválidas

                        # Reiniciar componentes temporales después de formar una fecha
                        temp_date_components = []

    # Seleccionar la fecha de mayor valor como fecha de vencimiento
    if fechas:
        fecha_vencimiento = max(fechas)  # La fecha mayor es la de vencimiento
        return fecha_vencimiento.strftime("%Y-%m-%d")  # Retornar en formato "YYYY-MM-DD"

    return None  # Retornar None si no se encontró una fecha

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


with open('./src/utils/tempOcrDataSOAT.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Extraer la placa y su posición en las líneas
isSoat = identificarSOAT(data)

if(isSoat):
    vencimiento = extract_fecha_vencimiento(data)
    placa = extract_placa(data)

    vehiculo_data = {
        "soatVencimiento": vencimiento,
        "placa": placa,
    }

    # Convertir el diccionario a un objeto JSON y imprimirlo
    print(json.dumps(vehiculo_data, indent=4, ensure_ascii=True))
else:
    print("No se encontró el SOAT en el archivo de texto")
    