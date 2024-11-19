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
    excluded_words = {"NO", "HO", "TON", "NOMBRES", "DEL", "MOTOR", "CHASIS"}  # Palabras que queremos ignorar

    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text'].strip().upper()

            # Buscar VIN de 17 caracteres alfanuméricos
            vin_match = re.search(r'\b[A-Z0-9]{17}\b', text)
            if vin_match:
                vin_candidate = vin_match.group(0)
                # Validar que el VIN contenga letras y números, y que no sea una palabra excluida
                if any(char.isalpha() for char in vin_candidate) and any(char.isdigit() for char in vin_candidate):
                    vin = vin_candidate

            # Intentar extraer número de motor directamente en la misma línea si contiene "NRO. MOTOR:"
            if "NRO. MOTOR:" in text:
                # Extraer el texto después de "NRO. MOTOR:"
                motor_text = text.split("NRO. MOTOR:")[1].strip()
                
                # Verificar si el texto después de los dos puntos parece un número de motor
                motor_match = re.search(r'\b([A-Z0-9]{2,10}\s?[A-Z0-9]{2,10})\b', motor_text)
                if motor_match:
                    match_text = motor_match.group(0)
                    
                    # Validar que el texto tenga letras y números, no esté en palabras excluidas, y tenga longitud adecuada
                    if match_text not in excluded_words and len(match_text.replace(" ", "")) >= 8:
                        if any(char.isalpha() for char in match_text) and any(char.isdigit() for char in match_text):
                            num_motor = match_text

                # Si no se encontró el número de motor en la misma línea, buscar en las líneas siguientes
                if not num_motor:
                    for j in range(1, 10):  # Revisar hasta 10 líneas siguientes por seguridad
                        if i + j < len(lines):
                            next_text = lines[i + j]['text'].strip().upper()
                            # Buscar patrones de número de motor con posibles espacios (ej. "SA2Q UJ159440")
                            motor_match = re.search(r'\b([A-Z0-9]{2,10}\s?[A-Z0-9]{2,10})\b', next_text)
                            if motor_match:
                                match_text = motor_match.group(0)

                                # Validar que el texto tenga letras y números, no esté en palabras excluidas, y tenga longitud adecuada
                                if match_text not in excluded_words and len(match_text.replace(" ", "")) >= 8:
                                    if any(char.isalpha() for char in match_text) and any(char.isdigit() for char in match_text):
                                        num_motor = match_text
                                        break  # Terminar si encontramos un número de motor válido

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
    vencimiento = extract_fecha_vencimiento(data)


    vehiculo_data = {
        "tecnomecanicaVencimiento": vencimiento,
        "placa": placa,
    }

    # Convertir el diccionario a un objeto JSON y imprimirlo
    print(json.dumps(vehiculo_data, indent=4, ensure_ascii=True))
else:
    print("El archivo no es una TÉCNICO MECÁNICA")
    