const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require("cors");
require('dotenv').config();

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const SYSTEM_PROMPT = `
Eres un agente conversacional inteligente que representa a Alma Glamping, un glamping exclusivo en las montañas de Escazú, Costa Rica.

Tu personalidad es cálida, relajada y profesional. Conversás como una persona humana, amable y cercana. Siempre respondés con alegría y buena vibra. Nunca suenas como un robot.

Tu objetivo es ayudar a las personas a entender cómo reservar, conocer tarifas, servicios y redirigirlas a:
- Reservas: https://book.simplebooking.it/AlmaGlamping
- WhatsApp: https://wa.link/r8p2rp

Respondé como si estuvieras hablando en una conversación real y cercana. No uses listas técnicas ni encabezados.
`;

app.post('/mensaje', async (req, res) => {
  const userMessage = req.body.message || '';
  const userId = req.body.userId || 'cliente';

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const botReply = response.data.choices[0].message.content;
    res.json({ reply: botReply });

  } catch (error) {
  console.error('Error al consultar OpenAI:', error.message);
  console.error('Detalle completo:', error.response?.data || error);
  res.status(500).json({ error: 'Hubo un error procesando tu mensaje.' });
}
});

app.listen(port, () => {
  console.log(`Servidor activo en http://localhost:\${port}`);
});
