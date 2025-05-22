const XLSX = require('xlsx');
const { parse, format, addDays, isAfter, isValid, eachDayOfInterval } = require('date-fns');
const { es } = require('date-fns/locale');

// 1. Sistema de Caché
const CACHE = {
  data: null,
  lastUpdated: null,
  filePath: './Reservas_Alma_Glamping.xlsx',
  ttl: 5 * 60 * 1000 // 5 minutos
};

async function loadData() {
  const now = new Date();
  if (CACHE.data && (now - CACHE.lastUpdated) < CACHE.ttl) {
    return CACHE.data;
  }

  try {
    console.log('🔄 Actualizando caché de reservas...');
    const workbook = XLSX.readFile(CACHE.filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    CACHE.data = rawData.map(row => ({
      ...row,
      parsedDate: parseExcelDate(row.Fecha),
      disponibilidad: getDisponibilidad(row)
    })).filter(item => item.parsedDate);

    CACHE.lastUpdated = now;
    return CACHE.data;
  } catch (error) {
    console.error('Error al cargar datos:', error);
    throw new Error('No se pudo cargar el archivo de reservas');
  }
}

// 2. Funciones auxiliares
function parseExcelDate(excelDate) {
  if (!excelDate) return null;
  try {
    const date = typeof excelDate === 'string' 
      ? parse(excelDate, 'yyyy-MM-dd', new Date())
      : new Date((excelDate - 25569) * 86400 * 1000);
    return isValid(date) ? format(date, 'yyyy-MM-dd') : null;
  } catch {
    return null;
  }
}

function getDisponibilidad(row) {
  return Object.entries(row)
    .filter(([key]) => key !== 'Fecha')
    .reduce((acc, [domo, estado]) => ({
      ...acc,
      [domo]: !estado || estado.toString().trim() === ''
    }), {});
}

function formatToHuman(dateStr) {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  return isValid(date) ? format(date, "d 'de' MMMM", { locale: es }) : dateStr;
}

// 3. Función principal mejorada
async function checkAvailabilityRange(startDateStr, endDateStr, userId = null, sessionMemory = null) {
  try {
    // Validación de fechas
    const start = parse(startDateStr, 'yyyy-MM-dd', new Date());
    const end = parse(endDateStr, 'yyyy-MM-dd', new Date());
    
    if (!isValid(start) || !isValid(end)) {
      return { error: 'Formato de fecha inválido. Usa YYYY-MM-DD' };
    }
    if (isAfter(start, end)) {
      return { error: 'La fecha de inicio no puede ser posterior a la fecha final. 😅' };
    }

    // Cargar datos (con caché)
    const data = await loadData();
    const fechas = eachDayOfInterval({ start, end });
    
    // Procesar disponibilidad
    const resultados = fechas.map(fecha => {
      const fechaStr = format(fecha, 'yyyy-MM-dd');
      const item = data.find(d => d.parsedDate === fechaStr);
      
      if (!item) return null;
      
      const domosDisponibles = Object.entries(item.disponibilidad)
        .filter(([_, disponible]) => disponible)
        .map(([domo]) => domo);
      
      return {
        fecha: fechaStr,
        label: formatToHuman(fechaStr),
        domos: domosDisponibles,
        disponible: domosDisponibles.length > 0
      };
    }).filter(Boolean);

    // Formatear respuesta
    const disponibles = resultados.filter(r => r.disponible);
    const noDisponibles = resultados.filter(r => !r.disponible);

    if (disponibles.length === 0) {
      const mensaje = `Entre el ${formatToHuman(startDateStr)} y el ${formatToHuman(endDateStr)} no hay disponibilidad. 😔`;
      const sugerencia = await generarSugerencias(start, end, userId, sessionMemory);
      return { 
        error: mensaje,
        sugerencia 
      };
    }

    // Guardar contexto si hay sesión
    if (userId && sessionMemory) {
      sessionMemory[userId].lastSearch = {
        start: startDateStr,
        end: endDateStr,
        results: disponibles
      };
    }

    return {
      success: true,
      period: `${formatToHuman(startDateStr)} al ${formatToHuman(endDateStr)}`,
      disponibles,
      resumen: `🎉 ${disponibles.length} días disponibles de ${resultados.length}`
    };

  } catch (error) {
    console.error('Error en checkAvailabilityRange:', error);
    return { error: 'Error al consultar disponibilidad. Intenta nuevamente.' };
  }
}

// 4. Función para sugerencias automáticas
async function generarSugerencias(start, end, userId, sessionMemory) {
  // Lógica para buscar fechas alternativas cercanas
  // Puede usar similar a sugerirAlternativa.js
  return '¿Querés que busque fechas alternativas?';
}

module.exports = {
  checkAvailabilityRange,
  loadData // Exportado para testing
};