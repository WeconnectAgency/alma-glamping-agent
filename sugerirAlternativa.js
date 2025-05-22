const { parse, format, addDays, getDay } = require('date-fns');
const { checkAvailability, isDateAvailable } = require('./checkAvailability');
const { es } = require('date-fns/locale');

function formatToHuman(dateStr) {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  return format(date, "d 'de' MMMM", { locale: es });
}

function esFinDeSemana(date) {
  const day = getDay(date);
  return day === 5 || day === 6 || day === 0; // viernes, sábado, domingo
}

function sugerirAlternativa(dateStr, userId, sessionMemory) {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());

  if (esFinDeSemana(date)) {
    const diasABuscar = 60;
    for (let i = 1; i <= diasABuscar; i++) {
      const test = addDays(date, i);
      const f = format(test, 'yyyy-MM-dd');
      if (esFinDeSemana(test) && isDateAvailable(f)) {
        sessionMemory[userId].history.ultimaFechaSugerida = f;
        return `Ese finde está lleno 😢. Pero el próximo finde con disponibilidad es el ${formatToHuman(f)}.`;
      }
    }
    return `Ese finde está lleno 😢 y no encontré otro con espacio pronto. ¿Querés que revisemos otro mes?`;
  }

  // Entre semana
  for (let i = 1; i <= 5; i++) {
    const test = addDays(date, i);
    const f = format(test, 'yyyy-MM-dd');
    const dow = getDay(test);
    if (dow >= 1 && dow <= 4 && checkAvailability(f)) {
      sessionMemory[userId].history.ultimaFechaSugerida = f;
      return `Ese día está reservado 😕. Pero el ${formatToHuman(f)} está disponible.`;
    }
  }

  return `No encontré días cercanos disponibles. ¿Querés que revise otro rango?`;
}

module.exports = { sugerirAlternativa, formatToHuman };
