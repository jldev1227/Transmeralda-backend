import json
import re

def identificarSOAT(data):
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text']
            if "SOAT" in text and i == 0:
                # Verificar si el índice 3 después de la línea actual existe
                if i + 3 < len(lines):
                    next_line = lines[i + 3]
                    if "PÓLIZA DE SEGURO DE DAÑOS CORPORALES CAUSADOS A LAS PERSONAS EN ACCIDENTES DE TRÁNSITO" == next_line['text']:
                        return True
    return None


def extract_fecha_vencimiento(data):
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text']
            if "DÍA" in text:
                for j, next_line in enumerate(lines[i:]):
                    next_text = next_line['text']
                    match = re.search(r'\b\d{4}-\d{2}-\d{2}\b', next_text)
                    
                    if match and j == 15:
                        return match.group(0)
    return None

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

# Función para identificar el VIN, Número de Serie y Número de Chasis
def extract_vin_serie_chasis(data):
    vin = None
    num_motor = None

    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text']
            if "No. VIN" in text:
                for j in range(1, 10):  # Tomamos más de 5 líneas por seguridad
                    next_text = lines[i + j]['text'].strip().upper()

                    match = re.search(r'\b[A-Z0-9-]{8,}\b', next_text)
                    if match:
                        match_text = match.group(0)
                        if len(match_text) > 14:
                            vin = match_text
                        elif re.match(r'^[A-Z0-9-]{8,14}$', match_text):
                            num_motor = match_text

                        # Si se han encontrado tanto el VIN como el número de motor, salir de la función
                        if vin and num_motor:
                            return vin, num_motor

    return vin, num_motor


with open('./src/utils/tempOcrDataSOAT.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Extraer la placa y su posición en las líneas
isSoat = identificarSOAT(data)

if(isSoat):
    vencimiento = extract_fecha_vencimiento(data)
    placa = extract_placa(data)
    vin, num_motor  = extract_vin_serie_chasis(data)

    vehiculo_data = {
        "soatVencimiento": vencimiento,
        "placa": placa,
        "vin": vin,
        "numeroMotor": num_motor, 
    }

    # Convertir el diccionario a un objeto JSON y imprimirlo
    print(json.dumps(vehiculo_data, indent=4, ensure_ascii=True))
else:
    print("No se encontró el SOAT en el archivo de texto")
    