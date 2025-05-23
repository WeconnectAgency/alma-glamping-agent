const { parse, format, addDays, getDay, subDays, isValid, isAfter } = require('date-fns');
const { es } = require('date-fns/locale');
const XLSX = require('xlsx');

// 1. Sistema de Caché
const CACHE = {
  data: null,
  lastUpdated: null,
  filePath: './Reservas_Alma_Glamping.xlsx',
  ttl: 5 * 60 * 1000, // 5 minutos en milisegundos
  maxSize: 1000 // Máximo de registros en caché
};

async function loadDataWithCache() {
  const now = new Date();
  
  // Verificar si el caché es válido
  if (CACHE.data && CACHE.lastUpdated && 
      (now - CACHE.lastUpdated) < CACHE.ttl) {
    return CACHE.data;
  }

  try {
    console.log('📂 Actualizando caché de reservas...');
    const workbook = XLSX.readFile(CACHE.filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    // Procesamiento optimizado de datos
    CACHE.data = rawData.map(row => {
      let fecha;
      if (typeof row.Fecha === 'string') {
        fecha = parse(row.Fecha, 'yyyy-MM-dd', new Date());
      } else {
        fecha = new Date((row.Fecha - 25569) * 86400 * 1000);
      }
      
      return {
        ...row,
        parsedDate: isValid(fecha) ? format(fecha, 'yyyy-MM-dd') : null,
        domos: Object.entries(row)
          .filter(([key]) => key !== 'Fecha')
          .reduce((acc, [key, val]) => ({
            ...acc,
            [key]: val?.toString().trim().toLowerCase() === 'disponible'
          }), {})
      };
    }).filter(item => item.parsedDate);
    
    CACHE.lastUpdated = now;
    return CACHE.data;
    
  } catch (error) {
    console.error('Error al cargar datos:', error);
    throw new Error('No se pudo cargar el archivo de reservas');
  }
}

// 2. Funciones Optimizadas con Caché
async function isDateAvailableWithCache(dateStr) {
  const data = await loadDataWithCache();
  const item = data.find(d => d.parsedDate === dateStr);
  return item ? Object.values(item.domos).some(Boolean) : false;
}

async function getDomosDisponiblesWithCache(dateStr) {
  const data = await loadDataWithCache();
  const item = data.find(d => d.parsedDate === dateStr);
  if (!item) return [];
  
  return Object.entries(item.domos)
    .filter(([_, disponible]) => disponible)
    .map(([domo]) => domo);
}

// 3. Versión Mejorada de sugerirAlternativa con Caché
async function sugerirAlternativa(dateStr, userId, sessionMemory) {
  try {
    console.log('[🐛 DEBUG] dateStr recibido en sugerirAlternativa:', dateStr);
    const rawDate =
  typeof dateStr === 'object' && dateStr.date
    ? dateStr.date
    : typeof dateStr === 'string'
      ? dateStr
      : null;

if (!rawDate) {
  console.error('[❌ ERROR] Fecha inválida recibida en sugerirAlternativa:', dateStr);
  return 'Para no cometer errores, ¿me confirmás el día con el mes, por fa? 😊';
}

    const date = parse(rawDate, 'yyyy-MM-dd', new Date());
    if (!isValid(date)) throw new Error('Fecha inválida');

    const [disponible, alternativas] = await Promise.all([
      isDateAvailableWithCache(rawDate),
      buscarAlternativas(date, sessionMemory)
    ]);

    if (disponible) {
      return `¡Buenas noticias! El ${formatToHuman(rawDate)} sigue disponible. ¿Querés reservar?`;
    }

    if (alternativas.length === 0) {
      return esFinDeSemana(date)
        ? `Ese finde está completo 😢. ¿Querés que busque en otro mes?`
        : `No hay disponibilidad cercana. ¿Qué otra fecha te interesa?`;
    }

    sessionMemory[userId].history.ultimasFechasSugeridas = alternativas;

    const mensajeBase = esFinDeSemana(date)
      ? `Ese finde está completo. Te sugiero:\n`
      : `Esa fecha no está disponible. Podés elegir:\n`;

    const opciones = alternativas.map((alt, i) =>
      `${i + 1}. ${alt.fecha} (${alt.domos.join(', ')})`
    ).join('\n');

    return `${mensajeBase}${opciones}\n\nDecime el número de tu preferencia.`;

  } catch (error) {
    console.error('Error en sugerirAlternativa:', error);
    return 'Hubo un problema al buscar fechas. ¿Podrías intentarlo de nuevo?';
  }
}

// Función auxiliar para buscar alternativas
async function buscarAlternativas(date, sessionMemory) {
 if (!isValid(date)) {
  console.warn('⚠️ Fecha inválida en buscarAlternativas:', date);
  return [];
}
  const esFinde = esFinDeSemana(date);
  const config = {
    diasBusqueda: esFinde ? 60 : 14,
    maxAlternativas: 3,
    buscarAtras: true
  };

  const alternativas = [];
  const hoy = new Date();

  for (let i = 1; i <= config.diasBusqueda && alternativas.length < config.maxAlternativas; i++) {
    const fechasAProbar = [addDays(date, i)];
    if (config.buscarAtras) fechasAProbar.push(subDays(date, i));

    for (const fecha of fechasAProbar) {
      if (isAfter(fecha, hoy)) { // No sugerir fechas pasadas
        const fechaStr = format(fecha, 'yyyy-MM-dd');
        const mismoTipo = esFinde ? esFinDeSemana(fecha) : !esFinDeSemana(fecha);
        
        if (mismoTipo && await isDateAvailableWithCache(fechaStr)) {
          alternativas.push({
            fecha: formatToHuman(fechaStr),
            fechaStr,
            domos: await getDomosDisponiblesWithCache(fechaStr)
          });
        }
      }
    }
  }

  return alternativas;
}
module.exports = {
  sugerirAlternativa,
  buscarAlternativas,
  isDateAvailableWithCache,
  getDomosDisponiblesWithCache,
  loadDataWithCache
};
