const { parse, format, addDays, getDay, subDays, isValid } = require('date-fns');
const { es } = require('date-fns/locale');
const { isDateAvailable, getDomosDisponibles } = require('./checkAvailability');

// Configuración modificable
const CONFIG = {
  DIAS_BUSQUEDA_FINDE: 60,
  DIAS_BUSQUEDA_SEMANA: 5,
  DIAS_ALTERNATIVAS_A_MOSTRAR: 3 // Mostrar varias opciones
};

function formatToHuman(dateStr) {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  return isValid(date) ? format(date, "d 'de' MMMM", { locale: es }) : dateStr;
}

function esFinDeSemana(date) {
  const day = getDay(date);
  return day === 5 || day === 6 || day === 0; // viernes, sábado, domingo
}

async function sugerirAlternativa(dateStr, userId, sessionMemory) {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    if (!isValid(date)) {
      throw new Error('Fecha inválida');
    }

    const esFinde = esFinDeSemana(date);
    const diasABuscar = esFinde ? CONFIG.DIAS_BUSQUEDA_FINDE : CONFIG.DIAS_BUSQUEDA_SEMANA;
    const alternativas = [];

    // Buscar hacia adelante y atrás
    for (let i = 1; i <= diasABuscar && alternativas.length < CONFIG.DIAS_ALTERNATIVAS_A_MOSTRAR; i++) {
      const testForward = addDays(date, i);
      const testBackward = subDays(date, i);

      for (const testDate of [testForward, testBackward]) {
        if ((esFinde && !esFinDeSemana(testDate)) continue;
        
        const fechaStr = format(testDate, 'yyyy-MM-dd');
        if (isDateAvailable(fechaStr)) {
          const domos = getDomosDisponibles(fechaStr);
          alternativas.push({
            fecha: fechaStr,
            label: formatToHuman(fechaStr),
            domos
          });
        }
      }
    }

    if (alternativas.length === 0) {
      return esFinde 
        ? `Ese finde está lleno 😢 y no encontré otros con espacio. ¿Querés que revisemos otro mes?`
        : `No hay disponibilidad cercana. ¿Buscás otra fecha?`;
    }

    // Guardar todas las alternativas en sesión, no solo la primera
    sessionMemory[userId].history.ultimasFechasSugeridas = alternativas;

    const mensajeBase = esFinde
      ? `Ese finde está lleno. Te sugiero:\n`
      : `Ese día no está disponible. Podrías considerar:\n`;

    const opciones = alternativas.map((alt, idx) => 
      `${idx + 1}. ${alt.label} (${alt.domos.join(', ')})`
    ).join('\n');

    return `${mensajeBase}${opciones}\n\n¿Te interesa alguna? Responde con el número.`;
    
  } catch (error) {
    console.error('Error en sugerirAlternativa:', error);
    return 'Hubo un problema al buscar alternativas. ¿Podrías confirmar la fecha?';
  }
}

module.exports = {
  sugerirAlternativa,
  formatToHuman,
  CONFIG // Exportar configuración para tests
};