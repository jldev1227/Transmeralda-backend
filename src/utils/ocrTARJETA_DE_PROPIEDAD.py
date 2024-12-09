import json
import re
import unicodedata

# Función para normalizar el texto y remover tildes
def normalize_text(text):
    return unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')

def identificarTARJETA_DE_PROPIEDAD(data):
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text']
            
            if "REPÚBLICA DE COLOMBIA" in text and i < len(lines) - 1:
            # Verificar hasta las próximas tres líneas después de encontrar "REPÚBLICA DE COLOMBIA"
                for offset in range(1, 4):  # Chequea las tres líneas siguientes
                    if i + offset < len(lines):
                        next_line = lines[i + offset]
                        if "MINISTERIO DE TRANSPORTE" == next_line['text']:
                            return True
    return None


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

    # Lista de palabras clave a descartar
    exclude_keywords = [
        "-", "TARJETA DE PROPIEDAD", "PLACA", "MARCA", "LINEA", "CIL NDRADA CC", 
        "CILINDRADA CC", "CILINDRADA", "LÍNEA", "LINE", "LÍNE", "MODELO", "MODELD", 
        "CILINDRADA CC", "COLOR", "SERVICIO", "BLANCO",
        "REPÚBLICA DE COLOMBIA", "MINISTERIO DE TRANSPORTE", "LIBERTAD Y ORDEN", 
        "LICENCIA DE TRÁNSITO NO.", "PÚBLICO"
    ]

    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        
        # Iterar sobre las próximas dos líneas después de placa_index
        for offset in range(1, 8):  # Chequea las dos líneas siguientes
            if placa_index + offset < len(lines):
                next_line = lines[placa_index + offset]
                text = next_line['text'].strip().upper()
                
                # Verificar si la línea contiene palabras clave de exclusión
                if any(keyword in text for keyword in exclude_keywords):
                    continue  # Ignorar si contiene palabras clave
                
                # Si la línea pasa los filtros, devolverla
                return text, placa_index + offset

    # Si no se encuentra una marca
    return None, None

def extract_vehicle_line(data, marca, placa, marca_index):
    # Lista de palabras clave y frases a descartar
    exclude_keywords = [
        "-", "TARJETA DE PROPIEDAD", "PLACA", "MARCA", "LINEA", "CIL NDRADA CC", 
        "CILINDRADA CC", "CILINDRADA", "LÍNEA", "LINE", "LÍNE", "MODELO", "MODELD", 
        "CILINDRADA CC", "COLOR", "SERVICIO", "BLANCO", marca.upper(), placa.upper(),
        "REPÚBLICA DE COLOMBIA", "MINISTERIO DE TRANSPORTE", "LIBERTAD Y ORDEN", 
        "LICENCIA DE TRÁNSITO NO.", "PÚBLICO"
    ]

    # Expresiones regulares para descartar líneas no deseadas
    year_pattern = re.compile(r'(?<![A-Za-z])\b\d{4}\b(?![A-Za-z])')  # Números de 4 dígitos aislados
    long_numeric_pattern = re.compile(r'\b\d{8,}\b')  # Secuencias de 8 o más dígitos
    float_pattern = re.compile(r'^\d+\.\d+$')  # Solo números flotantes en líneas independientes
    numeric_pattern = re.compile(r'^\d+$')  # Solo números en líneas independientes
    unicode_pattern = re.compile(r'[^\w\s\.-]', re.UNICODE)

    # Recorre las páginas en el resultado analizado
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']

        # Determinar los índices a recorrer
        start_index = max(0, marca_index - 5)  # Asegura que no sea menor que 0
        end_index = min(len(lines), marca_index + 6)  # +6 porque el rango es exclusivo

        # Iterar sobre las líneas en el rango especificado
        for index in range(start_index, end_index):
            text = lines[index]['text'].strip().upper()
            
            # Descartar líneas que contienen palabras clave o patrones no deseados
            if text in exclude_keywords:  # Coincidencia exacta en lugar de parcial
                continue
            if year_pattern.search(text) or long_numeric_pattern.search(text) or float_pattern.search(text):
                continue
            if numeric_pattern.match(text):  # Descartar si es únicamente numérica
                continue
            if unicode_pattern.search(text):  # Descartar si contiene caracteres especiales Unicode
                continue

            # Si pasa todas las exclusiones, asumimos que esta línea es la "línea del vehículo"
            return text

    # Si no encuentra ninguna coincidencia
    return None

def extract_modelo(data):
    # Expresión regular para identificar años en formato YYYY (1900 a 2099 como ejemplo)
    year_pattern = re.compile(r'\b(19[0-9]{2}|20[0-9]{2})\b')

    for page in data['analyzeResult']['readResults']:
        lines = page['lines']

        for index, line in enumerate(lines):
            text = line['text'].strip()
            
            # Buscar un año en la línea
            match = year_pattern.search(text)
            if match:
                modelo = match.group()
                return modelo, index  # Devuelve el modelo y el índice

    # Si no encuentra ningún modelo
    return None, None

# Función para extraer el color del vehículo a partir del índice del modelo
def extract_color_after_modelo(data, marca, placa, linea, modelo_index):
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        
        # Lista de palabras clave a descartar
        exclude_keywords = [
            "-", "TARJETA DE PROPIEDAD", "PLACA", "MARCA", "LINEA", "CIL NDRADA CC", 
            "CILINDRADA CC", "CILINDRADA", "LÍNEA", "LINE", "LÍNE", "MODELO", "MODELD", 
            "CILINDRADA CC", "SERVICIO", marca.upper(), placa.upper(), linea.upper(),
            "REPÚBLICA DE COLOMBIA", "COLOR", "MINISTERIO DE TRANSPORTE", "LIBERTAD Y ORDEN", 
            "LICENCIA DE TRÁNSITO NO.", "PÚBLICO"
        ]
        
        # Expresión regular para descartar patrones no deseados
        year_pattern = re.compile(r'\b\d{4}\b')  # Años en formato YYYY
        long_numeric_pattern = re.compile(r'\b\d{8,}\b')  # Secuencias largas de números
        decimal_pattern = re.compile(r'\b\d+\.\d+\b')  # Números decimales
        
        # Determinar el rango de búsqueda
        start_index = max(0, modelo_index - 5)  # Hasta 5 índices antes, sin salir de los límites
        end_index = min(len(lines), modelo_index + 6)  # Hasta 5 índices después (modelo_index + 5)
        
        # Recorrer el rango definido
        for index in range(start_index, end_index):
            text = lines[index]['text'].strip().upper()
            
            # Descartar líneas que contienen palabras clave o patrones no deseados
            if any(keyword in text for keyword in exclude_keywords):
                continue
            if year_pattern.search(text) or long_numeric_pattern.search(text) or decimal_pattern.search(text):
                continue

            return text

    # Si no se encuentra ningún color
    return None

# Función para extraer la clase del vehículo utilizando palabras clave conocidas
def extract_clase_vehiculo(data):
    clases_vehiculo = ["CAMIONETA", "CAMION", "MICROBUS", "BUS"]
    for page in data.get('analyzeResult', {}).get('readResults', []):
        for line in page.get('lines', []):
            text = line.get('text', '').strip().upper()
            if text in clases_vehiculo:
                    return "CAMIONETA" if text == "CAMION" else text
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
                        next_text = re.sub(r'O', '0', next_text)
                        
                        # Buscar un patrón alfanumérico para el número de motor
                        match = re.search(r'\b[A-Z0-9]{2,}[A-Z0-9\s-]{4,}\b', next_text)
                        if match and len(next_text) <= 18:
                            modified_text = re.sub(r'-(O)', r'-0', match.group())
                            # Imprimir el texto cuando encuentre el número de motor
                            return modified_text, i + j  # Retorna el número de motor y su índice
    return None

# Función para identificar el VIN, Número de Serie y Número de Chasis
def extract_vin_serie_chasis(data, motor_index):
    vin_count = 0
    series = "******"  # Default for series if conditions are not met
    chasis = None
    vin = None  # Inicializamos vin

    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        potential_vin_list = []
        # Buscar los textos después del índice del número de motor
        for j in range(1, 10):  # Tomamos más de 5 líneas por seguridad
            if motor_index + j < len(lines):
                next_text = lines[motor_index + j]['text'].strip().upper()

                # Buscar un texto alfanumérico mayor a 10 caracteres
                match = re.search(r'\b[A-Z0-9-]{17}\b', next_text)
                if match:
                    potential_vin = match.group(0)
                    # Aplicar la modificación para cambiar 'O' por '0'
                    potential_vin = re.sub(r'O', '0', potential_vin)
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

def extract_date_matricula(data):
    pattern = r"^(\d{2})/(\d{2})/(\d{4})$"
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            normalized_text = normalize_text(line['text'].strip().upper())

            if "MATRICULA" in normalized_text:
                for j in range(1, 7):
                    
                    # Asegurarse de que i + j no exceda el índice
                    if i + j < len(lines):
                        next_text = lines[i + j]['text'].strip()
                        # Usar match para verificar si coincide con el patrón de fecha
                        match = re.match(pattern, next_text)
                        if match:
                            # Formatear la fecha reemplazando '/' por '-'
                            format_text = match.group(3) + '-' + match.group(2) + '-' + match.group(1)
                            return format_text
    return None

with open('./src/utils/tempOcrDataTARJETA_DE_PROPIEDAD.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Extraer la placa y su posición en las líneas
placa, placa_index = extract_placa_from_json(data)

# Extraer la marca y su posición basándose en la línea siguiente a la placa
marca, marca_index = extract_marca_after_placa(data, placa_index)

# Extraer la línea del vehículo y su índice basándose en la línea siguiente a la marca
linea = extract_vehicle_line(data, marca, placa, marca_index)

# Extraer el modelo del vehículo basándose en las 3 líneas siguientes a la línea
modelo, modelo_index = extract_modelo(data)

# Extraer el color del vehículo basándose en las líneas siguientes al modelo
color = extract_color_after_modelo(data, marca, placa, linea, modelo_index)

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


fecha_matricula = extract_date_matricula(data)

# En caso de que no se haya encontrado la identificación, utilizar la función para buscar solo la identificación
if not propietario_identificacion:
    propietario_identificacion = extract_identificacion_propietario(data)

is_tarjeta_de_propiedad = identificarTARJETA_DE_PROPIEDAD(data)

if(is_tarjeta_de_propiedad):
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
        "propietarioIdentificacion": propietario_identificacion,
        "fechaMatricula": fecha_matricula
    }

    # Convertir el diccionario a un objeto JSON y imprimirlo
    print(json.dumps(vehiculo_data, indent=4, ensure_ascii=True))

else:
    print("No se encontró la tarjeta de propiedad en el archivo de texto")
    