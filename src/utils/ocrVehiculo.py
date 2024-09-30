import json
import re
import unicodedata
import argparse


# Función para normalizar el texto y remover tildes
def normalize_text(text):
    return unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')

# Función para extraer la placa del JSON y devolver su índice
def extract_placa_from_json(data):
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text']
            if "PLACA" in text:
                for j, next_line in enumerate(lines[i:]):
                    next_text = next_line['text']
                    match = re.search(r'[A-Z]{3}\d{3}', next_text)
                    if match:
                        return match.group(0), i + j
    return None, None

# Función para extraer la marca y su índice basándose en la posición de la placa
def extract_marca_after_placa(data, placa_index):
    if placa_index is None:
        return None, None
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        if placa_index + 1 < len(lines):
            next_line = lines[placa_index + 1]
            marca = next_line['text'].strip()
            return marca, placa_index + 1
    return None, None

# Función para extraer la línea del vehículo a partir de la posición de la marca
def extract_linea_after_marca(data, marca_index):
    if marca_index is None:
        return None, None

    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        
        if marca_index + 1 < len(lines):
            # Verificar si la línea después de la marca es "LÍNEA"
            if lines[marca_index + 1]['text'].strip().upper() == 'LÍNEA':
                next_line = lines[marca_index + 4] if marca_index + 4 < len(lines) else None
            else:
                next_line = lines[marca_index + 1]

            # Si next_line es None, retornar None
            if not next_line:
                return None, None

            linea = next_line['text'].strip()
            return linea, marca_index + 1

    return None, None

# Función para extraer el modelo del vehículo a partir de la posición de la línea
def extract_modelo_after_linea(data, linea_index):
    if linea_index is None:
        return None, None
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for j, next_line in enumerate(lines[linea_index + 1: linea_index + 5]):
            next_text = next_line['text'].strip()
            match = re.search(r'\b\d{4}\b', next_text)
            if match:
                return match.group(0), linea_index + 1 + j
    return None, None

# Función para extraer el color del vehículo a partir del índice del modelo
def extract_color_after_modelo(data, modelo_index):
    if modelo_index is None:
        return None

    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for j, next_line in enumerate(lines[modelo_index + 1: modelo_index + 7]):
            next_text = next_line['text'].strip()

            # Verificar si next_text tiene el formato numérico con un punto decimal
            if re.search(r'^\d+\.\d+$', next_text):  # Busca números con formato decimal exacto
                if modelo_index + 1 + j + 1 < len(lines):
                    color_line = lines[modelo_index + 1 + j + 1]
                    color = color_line['text'].strip()

                    # Si el color es 'SERVICIO', pasar a la siguiente línea
                    if color.upper() == 'SERVICIO':
                        if modelo_index + 1 + j + 2 < len(lines):
                            color_line = lines[modelo_index + 1 + j + 2]
                            color = color_line['text'].strip()

                    return color

            

    return None
# Función para extraer la clase del vehículo utilizando palabras clave conocidas
def extract_clase_vehiculo(data):
    clases_vehiculo = ["CAMIONETA", "CAMION", 'MICROBUS', 'BUS']
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for line in lines:
            text = line['text'].strip().upper()
            for clase in clases_vehiculo:
                if clase in text:
                    if clase == "CAMION":
                        return "CAMIONETA"
                    return clase
    return None

# Función para extraer el tipo de combustible y carrocería
def extract_combustible_and_carroceria(data):
    combustibles = ["DIESEL", 'GASOLINA']  # Lista de combustibles conocidos

    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        # Buscar en todas las líneas
        for i, line in enumerate(lines):
            text = line['text'].strip().upper()

            # Manejar el caso especial "DOBLE CABINA CON DIESEL"
            if "DOBLE CABINA CON DIESEL" in text:
                return "DIESEL", "DOBLE CABINA"
            
            # Buscar el combustible en la lista de combustibles conocidos
            for combustible in combustibles:
                if combustible in text:
                    # Extraer el tipo de carrocería un índice antes del combustible
                    if i > 0:
                        tipo_carroceria = lines[i - 1]['text'].strip()

                        # Verificar si tipo_carroceria es igual a 'CAPACIDAD Kg/PSJ'
                        if tipo_carroceria.upper() == 'CAPACIDAD KG/PSJ':
                            # Cambiar a la línea anterior si la condición se cumple
                            if i > 1:
                                tipo_carroceria = lines[i - 2]['text'].strip()

                        return combustible, tipo_carroceria

    return None, None

# Función para extraer el número de motor utilizando la ubicación basada en "NUMERO DE MOTOR"
def extract_numero_motor(data):
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            # Normalizar texto para comparar sin tildes
            normalized_text = normalize_text(line['text'].strip().upper())
            
            # Buscar la frase "NUMERO DE MOTOR" en la línea exacta
            if "NUMERO DE MOTOR" in normalized_text:   
                # Buscar en las siguientes 5 líneas el número de motor
                for j in range(1, 10):
                    if i + j < len(lines):
                        next_text = lines[i + j]['text'].strip().upper()

                        # Buscar un patrón alfanumérico para el número de motor
                        match = re.search(r'\b[A-Z0-9]{2,}[A-Z0-9\s-]{4,}\b', next_text)
                        if match and len(next_text) <= 18:
                            # Imprimir el texto cuando encuentre el número de motor
                            print(f"Coincidencia encontrada: {normalized_text} -> {next_text}")
                            return match.group(0), i + j  # Retorna el número de motor y su índice
    return None

# Función para identificar el VIN, Número de Serie y Número de Chasis
def extract_vin_serie_chasis(data, motor_index):
    vin = None
    vin_count = 0
    series = "******"  # Default for series if conditions are not met
    chasis = None
    
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        potential_vin_list = []
        # Buscar los textos después del índice del número de motor
        for j in range(1, 10):  # Tomamos más de 5 líneas por seguridad
            if motor_index + j < len(lines):
                next_text = lines[motor_index + j]['text'].strip().upper()
                # Buscar un texto alfanumérico mayor a 10 caracteres
                match = re.search(r'\b[A-Z0-9-]{10,}\b', next_text)
                if match:
                    potential_vin = match.group(0)
                    potential_vin_list.append(potential_vin)
                    # Contamos cuántas veces se repite este potencial VIN
                    if potential_vin not in potential_vin_list:
                        vin_count += 1

        # Validar el potencial VIN encontrado y su cantidad
        if len(potential_vin_list) > 0:
            vin = potential_vin_list[0]  # Asumimos el primero como el VIN válido
            vin_count = potential_vin_list.count(vin)

        # Asignar los valores basados en la cantidad de repeticiones
        if vin_count >= 3:
            series = vin
            chasis = vin
        elif vin_count == 2:
            chasis = vin
        elif vin_count == 1:
            chasis = vin

    return vin, series, chasis 

def es_nombre_valido(texto):
    # Verificar que el texto no contiene números y no es 'IDENTIFICACIÓN'
    return (
        not any(char.isdigit() for char in texto) and 
        "IDENTIFICACION" not in normalize_text(texto).upper() and 
        "RESTRICCION MOVILIDAD" not in normalize_text(texto).upper()
    )
    
def extract_nombre_propietario(data):
    propietario_nombre = None
    propietario_identificacion = None

    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            # Normalizar texto para comparar sin tildes y en mayúsculas
            normalized_text = normalize_text(line['text'].strip().upper())

            # Buscar la frase clave "PROPIETARIO"
            if "PROPIETARIO" in normalized_text:
                # Buscar el nombre en las siguientes 5 líneas
                for j in range(1, 4):
                    if i + j < len(lines):
                        next_text = lines[i + j]['text'].strip()

                        # Verificar si hay un nombre válido y una identificación en la misma línea
                        if re.search(r'\d', next_text):
                            # Separar el nombre y la identificación usando una expresión regular
                            match = re.match(r'^(.*?)(C\.C\. \d+|NIT \d+)', next_text)
                            if match:
                                propietario_nombre = match.group(1).strip()  # Captura solo el nombre
                                propietario_identificacion = match.group(2).strip()  # Captura solo la identificación
                                return propietario_nombre, propietario_identificacion

                        # Si solo hay un nombre en la línea
                        if es_nombre_valido(next_text):
                            propietario_nombre = next_text  # Asignar el nombre del propietario

                            return propietario_nombre, propietario_identificacion
    return None



def extract_identificacion_propietario(data):
    # Utiliza la función extract_nombre_propietario para obtener ambos valores
    propietario_nombre, propietario_identificacion = extract_nombre_propietario(data)
    
    # Si ya se ha encontrado la identificación
    if propietario_identificacion:
        return propietario_identificacion

    # Si no encontramos la identificación con la función anterior, buscarla de nuevo
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            normalized_text = normalize_text(line['text'].strip().upper())
            if "PROPIETARIO" in normalized_text:
                for j in range(1, 4):
                    if i + j < len(lines):
                        next_text = lines[i + j]['text'].strip()
                        if re.search(r'\d', next_text):
                            return next_text

    return None

parser = argparse.ArgumentParser(description='Procesar un objeto JSON.')
parser.add_argument('data', type=str, help='JSON del vehículo como argumento')

# Parseo de argumentos
args = parser.parse_args()

try:
    # Cargar el JSON desde el argumento
    data = json.loads(args.data)
except json.JSONDecodeError as e:
    print(f"Error al decodificar el JSON: {e}")
    exit(1)

with open('./src/resolvers/tempOcrData.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Extraer la placa y su posición en las líneas
placa, placa_index = extract_placa_from_json(data)

# Extraer la marca y su posición basándose en la línea siguiente a la placa
marca, marca_index = extract_marca_after_placa(data, placa_index)

# Extraer la línea del vehículo y su índice basándose en la línea siguiente a la marca
linea, linea_index = extract_linea_after_marca(data, marca_index)

# Extraer el modelo del vehículo basándose en las 3 líneas siguientes a la línea
modelo, modelo_index = extract_modelo_after_linea(data, linea_index)

# Extraer el color del vehículo basándose en las líneas siguientes al modelo
color = extract_color_after_modelo(data, modelo_index)

# Extraer la clase del vehículo utilizando palabras clave
clase_vehiculo = extract_clase_vehiculo(data)

# Extraer el combustible y el tipo de carrocería
combustible, tipo_carroceria = extract_combustible_and_carroceria(data)

# Extraer el número de motor y su índice
numero_motor, motor_index = extract_numero_motor(data)

# Imprimir los textos después del índice del número de motor
vin, numero_serie, numero_chasis = extract_vin_serie_chasis(data, motor_index)

# Extraer el nombre y la identificación del propietario del vehículo
propietario_nombre, propietario_identificacion = extract_nombre_propietario(data)

# En caso de que no se haya encontrado la identificación, utilizar la función para buscar solo la identificación
if not propietario_identificacion:
    propietario_identificacion = extract_identificacion_propietario(data)

# Construir el objeto vehiculo_data con todos los campos requeridos
vehiculo_data = {
    "placa": placa,
    "marca": marca,
    "linea": linea,
    "modelo": modelo,
    "color": color,
    "claseVehiculo": clase_vehiculo,
    "combustible": combustible,
    "tipoCarroceria": tipo_carroceria,
    "numeroMotor": numero_motor,
    "vin": vin,
    "numeroSerie": numero_serie,
    "numeroChasis": numero_chasis,
    "propietarioNombre": propietario_nombre,
    "propietarioIdentificacion": propietario_identificacion
}

# Convertir el diccionario a un objeto JSON y imprimirlo
print(json.dumps(vehiculo_data, indent=4, ensure_ascii=True))