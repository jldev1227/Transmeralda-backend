import json
import re
from datetime import datetime

# Diccionario para traducir meses en español a números
MESES = {
    "enero": "01", "febrero": "02", "marzo": "03", "abril": "04", "mayo": "05", "junio": "06",
    "julio": "07", "agosto": "08", "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
}


def extract_placa(data):
    for page in data['analyzeResult']['readResults']:
        lines = page['lines']
        for i, line in enumerate(lines):
            text = line['text']
            
            match = re.search(r'[A-Z]{3}\d{3}', text)
            if match:
                return match.group(0)
    return None

# Función para validar y formatear fechas
def validar_y_formatear_fecha(texto):
    date_pattern = re.compile(r'(\b\d{4}-\d{2}-\d{2}\b|\b\d{2}-\d{2}-\d{4}\b)')
    fechas_encontradas = []
    
    for match in date_pattern.findall(texto):
            try:
                if len(match.split('-')[0]) == 4:  # YYYY-MM-DD
                    fecha = datetime.strptime(match, "%Y-%m-%d")
                else:  # DD-MM-YYYY
                    fecha = datetime.strptime(match, "%d-%m-%Y")
                fechas_encontradas.append(fecha.strftime("%Y-%m-%d"))
            except ValueError:
                continue

        # Buscar fechas con meses en texto
    texto = texto.lower()
    texto = re.sub(r"[,\.]", "", texto)  # Remover puntuación para facilitar el análisis
    for mes, num in MESES.items():
        pattern = re.compile(rf'(\d{{1,2}}) de {mes} de (\d{{4}})')
        for dia, anio in pattern.findall(texto):
            try:
                fecha = datetime.strptime(f"{anio}-{num}-{int(dia):02d}", "%Y-%m-%d")
                fechas_encontradas.append(fecha.strftime("%Y-%m-%d"))
            except ValueError:
                continue

    return fechas_encontradas

# Filtrar la fecha más reciente
def obtener_fecha_mas_reciente(fechas):
    if not fechas:
        return None
    fechas_objetos = [datetime.strptime(fecha, "%Y-%m-%d") for fecha in fechas]
    return max(fechas_objetos).strftime("%Y-%m-%d")

# Filtrar texto por contexto
def filtrar_por_contexto(texto, palabras_clave):
    lineas_relevantes = []
    for linea in texto.splitlines():
        if any(palabra.lower() in linea.lower() for palabra in palabras_clave):
            lineas_relevantes.append(linea)
    return " ".join(lineas_relevantes)

# Proceso principal para procesar documento JSON de Azure
def procesar_documento_azure(data, palabras_clave=None):
    # Combinar todo el texto extraído
    texto_completo = " ".join(
        [line['text'] for page in data['analyzeResult']['readResults'] for line in page['lines']]
    )
    
    # Filtrar por palabras clave si se proporcionan
    if palabras_clave:
        texto_completo = filtrar_por_contexto(texto_completo, palabras_clave)
    
    # Extraer y procesar fechas
    fechas = validar_y_formatear_fecha(texto_completo)
    fecha_mas_reciente = obtener_fecha_mas_reciente(fechas)
    return fechas, fecha_mas_reciente

# Proceso principal para procesar documento JSON de Azure
def procesar_documento_azure(data, palabras_clave=None):
    # Combinar todo el texto extraído
    texto_completo = " ".join(
        [line['text'] for page in data['analyzeResult']['readResults'] for line in page['lines']]
    )
    
    # Filtrar por palabras clave si se proporcionan
    if palabras_clave:
        texto_completo = filtrar_por_contexto(texto_completo, palabras_clave)
    
    # Extraer y procesar fechas
    fechas = validar_y_formatear_fecha(texto_completo)
    fecha_mas_reciente = obtener_fecha_mas_reciente(fechas)
    return fechas, fecha_mas_reciente

# Leer el archivo JSON con los resultados de Azure
with open('./src/utils/tempOcrDataPOLIZA_CONTRACTUAL.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Palabras clave específicas para filtrar contexto
palabras_clave = ["vigencia", "Responsabilidad Civil Contractual"]

# Procesar el documento JSON
fechas_encontradas, fecha_mas_reciente = procesar_documento_azure(data, palabras_clave=palabras_clave)

vencimiento = procesar_documento_azure(data)
placa = extract_placa(data)

vehiculo_data = {
    "polizaContractual": fecha_mas_reciente,
    "placa": placa,
}

# Convertir el diccionario a un objeto JSON y imprimirlo
print(json.dumps(vehiculo_data, indent=4, ensure_ascii=True))
