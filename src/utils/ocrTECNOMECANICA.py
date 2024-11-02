import json
import re
import datetime

def identificarTECNOMECANICA(data):
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text']
            if "MINISTERIO DE TRANSPORTE" in text:
                # Verificar si el índice 3 después de la línea actual existe
                return True
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

def extract_fecha_vencimiento(data):
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text']
            if "Fecha de vencimiento:" in text:
                # Buscar la fecha en el texto de la línea actual
                match = re.search(r'\d{4}/\d{2}/\d{2}', text)
                if match:
                    # Convertir la fecha al formato deseado
                    fecha_original = match.group(0)
                    fecha_formateada = datetime.datetime.strptime(fecha_original, "%Y/%m/%d").strftime("%Y-%m-%d")
                    return fecha_formateada
                
                # Si la fecha no está en la misma línea, buscar en las líneas siguientes
                for next_line in lines[i+1:]:
                    next_text = next_line['text']
                    match = re.search(r'\d{4}/\d{2}/\d{2}', next_text)
                    if match:
                        fecha_original = match.group(0)
                        fecha_formateada = datetime.datetime.strptime(fecha_original, "%Y/%m/%d").strftime("%Y-%m-%d")
                        return fecha_formateada

    return None

def extract_vin_serie_chasis(data):
    vin = None
    num_motor = None

    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text']
            if "NRO. MOTOR:" in text:
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



with open('./src/utils/tempOcrDataTECNOMECÁNICA.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Extraer la placa y su posición en las líneas
isTecnomecanica = identificarTECNOMECANICA(data)

if(isTecnomecanica):
    placa = extract_placa(data)
    vin, num_motor  = extract_vin_serie_chasis(data)
    vencimiento = extract_fecha_vencimiento(data)


    vehiculo_data = {
        "tecnomecanicaVencimiento": vencimiento,
        "placa": placa,
        "vin": vin,
        "numeroMotor": num_motor
    }

    # Convertir el diccionario a un objeto JSON y imprimirlo
    print(json.dumps(vehiculo_data, indent=4, ensure_ascii=True))
else:
    print("El archivo no es una TÉCNICO MECÁNICA")
    