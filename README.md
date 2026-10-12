# आश्रम दान वेबसाइट (Telegram संस्करण)

Supabase हटा दिया गया है। फ़ाइलें: `index.html`, `style.css`, `data.js`, `script.js`। सर्वर की ज़रूरत नहीं, GitHub Pages / Cloudflare Pages पर सीधे चलती है।

## सेटअप
1. @BotFather से बॉट बनाएँ, बॉट को अपने चैट/ग्रुप में जोड़ें और `chat_id` निकालें।
2. `data.js` में `SITE` (संस्था, UPI ID, QR/फ़ोटो URL, संपर्क) और `ASHRAMS` बदलें।
3. `script.js` में Telegram जानकारी भरें (नीचे सुरक्षा नोट पढ़ें)।
4. फ़ाइलें अपलोड करके Pages चालू करें।

## Telegram: सुरक्षित तरीका (सुझावित) — Cloudflare Worker
सीधे `TELEGRAM_BOT_TOKEN` फ्रंटएंड में डालने पर कोई भी पेज-सोर्स से टोकन निकालकर आपके बॉट से स्पैम भेज सकता है। इसलिए एक छोटा Worker बनाएँ, उसके Secrets में `BOT_TOKEN` और `CHAT_ID` रखें, और Worker का URL `TELEGRAM_PROXY_URL` में डालें:

```js
export default {
  async fetch(req, env) {
    const cors = { "Access-Control-Allow-Origin": "https://YOUR-SITE.example", "Access-Control-Allow-Headers": "Content-Type" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("no", { status: 405 });
    const { text } = await req.json();
    if (typeof text !== "string" || text.length > 1500) return new Response("bad", { status: 400, headers: cors });
    const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text }) });
    return new Response(null, { status: r.ok ? 200 : 502, headers: cors });
  }
};
```

## नमूना डेटा
`data.js` के 1000 दानदाता काल्पनिक हैं। चलती पट्टी, आँकड़े और "आज के शीर्ष दानदाता" इन्हीं से बनते हैं। पेज पर "नमूना डेटा (डेमो)" संदेश `SHOW_SAMPLE_NOTE` से दिखता है। असली दानदाताओं की सूची खुद `DONATIONS` में जोड़ें (`[नाम, राशि, कितने दिन पहले, आश्रम क्रमांक]`)।

## सत्यापन
फ़ॉर्म और UTR Telegram पर "असत्यापित" के रूप में आते हैं। बैंक/UPI स्टेटमेंट से मिलान आप खुद करें। साइट कोई भुगतान स्वतः सत्यापित नहीं करती।

## सीमाएँ
- 20 सेकंड की रोक सिर्फ ब्राउज़र में है, असली दर-सीमा नहीं। Worker में Cloudflare Rate Limiting/Turnstile जोड़ें।
- डुप्लिकेट UTR रोकने वाला डेटाबेस अब नहीं है, इसलिए यह जाँच आपको Telegram पर खुद करनी होगी।
