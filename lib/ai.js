const { http } = require('./util');
const GROQ = () => process.env.GROQ_API_KEY || '';

async function ask(prompt, persona) {
  const key = GROQ();
  const sys = 'You are ' + (persona || 'Malfoy') + ', a funny sassy anime character chatting on WhatsApp. Reply short, in English, with emojis. Max 3 lines.';
  if (key && key.indexOf('PASTE') === -1 && key.indexOf('your_') === -1) {
    const d = await http('https://api.groq.com/openai/v1/chat/completions', {
      t: 12000, method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }], temperature: 0.8, max_tokens: 220 }),
    });
    if (d && d.choices && d.choices[0]) return d.choices[0].message.content;
  }
  const t = await http('https://text.pollinations.ai/' + encodeURIComponent(sys + ' User: ' + prompt), { type: 'text', t: 9000 });
  if (t && t.length > 2 && t.length < 1500) return t.trim();
  return null;
}
module.exports = { ask };
