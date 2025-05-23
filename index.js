  const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require("cors");
const { format, addDays } = require('date-fns');
require('dotenv').config();
const { sugerirAlternativa } = require('./sugerirAlternativa');
const parseNaturalDate = require('./parseNaturalDate');
const parseDateRange = require('./parseDateRange');
const { checkAvailability, checkAvailabilityRange, getDomosDisponibles, isDateAvailable } = require('./checkAvailability');
const { formatToHuman } = require('./sugerirAlternativa');

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;
app.use(bodyParser.json());

const SYSTEM_PROMPT = `
Eres Alma, el agente conversacional de Alma Glamping, un glamping boutique ubicado en Escazú, Costa Rica.

🧠 Estructura interna:
Actuás como un anfitrión real, dividido en 5 módulos mentales:
1. Interpretación de intención del visitante.
2. Memoria contextual (fechas, tono, historial).
3. Interacción emocional (adaptación del lenguaje).
4. Consulta técnica (disponibilidad, errores, links).
5. Acción estratégica (seguir conversación, reservar, sugerir).

✨ Antes de responder:
- Reflexioná brevemente: ¿quién está hablando? ¿qué tipo de emoción/situación transmite? ¿qué ya se dijo?
- Elegí tu tono y objetivo en función de eso.
- Evitá sonar a servicio al cliente. No repetís frases de sistema.

🌟 Tu personalidad:
Cálida, humana, empática y emocionalmente conectada. Sonás como alguien que vivió la experiencia y está ayudando a planear una escapada mágica. Usás un lenguaje cotidiano, fluido y participativo.

🎯 Tu propósito:
Inspirar al visitante a reservar una escapada a Alma Glamping. No vendés ni convencés, sino que transmitís la magia del lugar, incluso si llueve o está nublado. Inspirás sin presión.

📅 Reservas:
- Detectás fechas naturales como “el 14”, “14 de junio”, “sábado”.
- Si no hay disponibilidad, sugerís fechas cercanas.
- Si dicen “otra fecha”, retomás la última recordada.
- Solo compartís el link si el usuario lo pide o hay clara intención:
  https://www.simplebooking.it/ibe2/hotel/8772

🔁 Seguimiento:
Si alguien muestra intención pero desaparece, podés hacer seguimiento una sola vez con tono suave:
“Hola de nuevo 🌿 ¿Seguís interesado en reservar para esa fecha? ”

🏕️ Alojamiento:
- 3 Domos Junior Suite ($280 USD/noche)
- 1 Domo Suite ($300 USD/noche)
Todos incluyen: cama king, jacuzzi privado, fogata, minibar, A/C y desayuno.

📍 Ubicación:
A solo 4.4 km del Estadio Nacional, en las montañas de Escazú.
“Buscanos como ALMA Glamping Escazú en Google Maps o Waze.”

🎁 Servicios adicionales:
Cena romántica, masajes, decoración especial, fotografía, letras “Cásate conmigo”.
Si alguien propone una idea nueva, respondé: “Contame lo que tenés en mente y vemos cómo hacerlo realidad.”

🐾 Políticas:
- Aceptamos mascotas pequeñas.
- El pago es 100% en línea.
- La política de cancelación se muestra al reservar.

🛑 Reglas clave:
- Solo saludás con “Hola 👋” la primera vez.
- No repetís el link ni saludos.
- Nunca decís que sos un bot o modelo de lenguaje.
- No usás frases como “estoy aquí para ayudarte”.
- Mostrás los enlaces directamente (sin markdown).
- Si no sabés algo: “No tengo esa info exacta, pero podés consultarla por WhatsApp 👉 https://wa.link/r8p2rp”
- Si preguntan algo extraño: “¡Qué pregunta tan original! 😅 No está permitido, pero si tenés otra duda real, contame.”

🎭 Tonos posibles según el tipo de visitante:
- Curioso → tono inspirador.
- Dudoso por clima → tono reconfortante (lluvia = magia, niebla = desconexión).
- Decidido → tono claro y resolutivo.
- Cliente frecuente → tono familiar y agradecido.
- Romántico → tono íntimo y emocional.
- Explorador → tono aventurero y relajado.
- Práctico → tono directo, sin adornos.
`;  

const sessionMemory = {};

app.post('/mensaje', async (req, res) => {
  const userMessage = req.body.message || '';
  const userId = req.body.userId || 'cliente';

  // Inicialización de sesión si no existe
  if (!sessionMemory[userId]) {
    sessionMemory[userId] = {
      history: {},
      conversation: []
    };
  }

  // Parseo inicial de fecha (única declaración)
  const parsedDate = parseNaturalDate(userMessage);
  const lowerMessage = userMessage.toLowerCase();

  // Manejo de fechas ambiguas
  if (parsedDate?.needsConfirmation) {
    sessionMemory[userId].history.ambiguousDate = parsedDate;
    const optionsText = parsedDate.options.map(opt => opt.label).join(' o ');
    return res.json({ 
      reply: `¿Qué fecha exacta te interesa? Tenemos: ${optionsText}`,
      options: parsedDate.options
    });
  }

  // Guardar mensaje en historial
  sessionMemory[userId].conversation.push({ role: 'user', content: userMessage });

  // Flujo principal de conversación
  try {
    // 1. Confirmación de sugerencia previa
    if (lowerMessage.includes('sí') || lowerMessage.includes('claro') || lowerMessage.includes('dale')) {
      if (sessionMemory[userId].history?.suggestedDate) {
        const fecha = sessionMemory[userId].history.suggestedDate;
        const disponibles = getDomosDisponibles(fecha);

        if (disponibles.length === 0) {
          return res.json({
            reply: `¡Ups! Ya se reservaron todos los domos para el ${formatToHuman(fecha)}. ¿Querés que busque otras fechas?`
          });
        }

        delete sessionMemory[userId].history.suggestedDate;
        return res.json({
          reply: `¡Perfecto! Para el ${formatToHuman(fecha)} tenemos: ${disponibles.join(', ')}. ¿Cuál te gustaría?`
        });
      }
    }

    // 2. Manejo de rangos de fechas
    const dateRange = parseDateRange(userMessage);
    if (dateRange) {
      sessionMemory[userId].history.lastRange = dateRange;
      const disponibilidad = await checkAvailabilityRange(dateRange.start, dateRange.end);
      return res.json({ reply: disponibilidad });
    }

    // 3. Fechas específicas
    if (parsedDate) {
      sessionMemory[userId].history.lastDate = parsedDate;

      if (!isDateAvailable(parsedDate)) {
        const respuesta = await sugerirAlternativa(parsedDate, userId, sessionMemory);
        return res.json({ reply: respuesta });
      }

      return res.json({
        reply: `¡Disponible! El ${formatToHuman(parsedDate)} está libre. ¿Querés reservar?`
      });
    }

    // 4. Solicitud de alternativas
    if (lowerMessage.includes('otra fecha') || lowerMessage.includes('alternativa')) {
      if (sessionMemory[userId].history?.lastDate) {
        const respuesta = await sugerirAlternativa(
          sessionMemory[userId].history.lastDate, 
          userId, 
          sessionMemory
        );
        return res.json({ reply: respuesta });
      }
      return res.json({ reply: '¿Para qué fecha necesitás disponibilidad?' });
    }

    // 5. Fallback a OpenAI para conversación general
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...sessionMemory[userId].conversation
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const botReply = response.data.choices[0].message.content;
    sessionMemory[userId].conversation.push({ role: 'assistant', content: botReply });
    
    return res.json({ 
      reply: botReply,
      sessionId: userId 
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Ocurrió un error procesando tu mensaje',
      details: error.message 
    });
  }
});

// Endpoint para limpiar sesiones (útil para desarrollo)
app.post('/limpiar-sesion', (req, res) => {
  const { userId } = req.body;
  if (userId && sessionMemory[userId]) {
    delete sessionMemory[userId];
  }
  res.json({ status: 'Sesión limpiada' });
});

app.listen(port, () => {
  console.log(`Servidor activo en http://localhost:${port}`);
});