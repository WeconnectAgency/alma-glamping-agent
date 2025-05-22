const { parse, format, addDays, getDay } = require('date-fns');
const { checkAvailability } = require('./checkAvailability');
const { isDateAvailable } = require('./checkAvailability');
const { parse, format } = require('date-fns');
const { es } = require('date-fns/locale');

function formatToHuman(dateStr) {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  return format(date, "d 'de' MMMM", { locale: es });
}


function esFinDeSemana(date) {
  const day = getDay(date);
  return day === 5 || day === 6 || day === 0;
}

function sugerirAlternativa(dateStr) {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  const dayOfWeek = getDay(date);

  // Si es fin de semana (viernes, sábado, domingo)
  if (esFinDeSemana(date)) {
  const diasABuscar = 60; // días hacia adelante que va a revisar
  let encontrada = null;

  for (let i = 1; i <= diasABuscar; i++) {
    const test = addDays(date, i);
    const f = format(test, 'yyyy-MM-dd');

    if (esFinDeSemana(test) && isDateAvailable(f)) {
      encontrada = f;
      break;
    }
  }

  if (encontrada) {
    return `Ese finde está lleno 😢. Pero el próximo finde con disponibilidad es el ${formatToHuman(encontrada)}. ¿Querés que lo reservemos?`;
  }

  return `Ese finde está lleno 😢 y no encontré otro con espacio pronto. ¿Querés que revisemos otro mes?`;
}


  // Si es entre semana (lunes a jueves)
  for (let i = 1; i <= 5; i++) {
    const test = addDays(date, i);
    const dow = getDay(test);
    const f = format(test, 'yyyy-MM-dd');
    if (dow >= 1 && dow <= 4 && checkAvailability(f)) {
      return `Ese día está reservado 😕. Pero el ${formatToHuman(f)} está disponible. ¿Te gustaría reservarlo?`;
    }
  }

  return `No encontré días cercanos disponibles. ¿Querés que revise otro rango?`;
}

module.exports = { sugerirAlternativa };
