/* ===== CONFIG ===== */
const CONFIG = {
  /* विकल्प A (सुरक्षित, सुझावित): Cloudflare Worker का URL (README देखें) */
  TELEGRAM_PROXY_URL: "",
  /* विकल्प B (सीधा): ध्यान दें, टोकन पेज के सोर्स में सबको दिखेगा */
  TELEGRAM_BOT_TOKEN: "",
  TELEGRAM_CHAT_ID: "",
  SHOW_SAMPLE_NOTE: true,   // असली डेटा लगाने पर false करें
  TICKER_SECONDS_PER_ITEM: 3
};
const $ = (id) => document.getElementById(id);
const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const STATUS = { planned: "योजनाबद्ध", land_acquired: "भूमि प्राप्त", under_construction: "निर्माणाधीन", completed: "पूर्ण" };
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const safeUrl = (u) => (u && /^https:\/\//i.test(u) ? u : "");
const donations = DONATIONS.map(([name, amount, days, ashram]) => ({ name, amount, days, ashram }));
let lastDonation = null;

/* ---- Telegram ---- */
async function sendTelegram(text) {
  if (CONFIG.TELEGRAM_PROXY_URL) {
    const r = await fetch(CONFIG.TELEGRAM_PROXY_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (!r.ok) throw new Error("TG");
    return;
  }
  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) throw new Error("NOCONFIG");
  const r = await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CONFIG.TELEGRAM_CHAT_ID, text })
  });
  if (!r.ok) throw new Error("TG");
}
function cooldown(key, sec) {
  const last = Number(localStorage.getItem(key) || 0);
  if (Date.now() - last < sec * 1000) return false;
  localStorage.setItem(key, Date.now()); return true;
}

/* ---- ऊपर की चलती पट्टी ---- */
function buildTicker() {
  const list = donations.slice().sort(() => Math.random() - 0.5);
  const frag = () => { const f = document.createDocumentFragment();
    list.forEach((d) => { const s = el("span", "", d.name + " ने"); s.append(el("b", "", inr(d.amount) + " दान किया")); f.append(s); });
    return f; };
  const t = $("tickerTrack");
  t.append(frag(), frag());
  t.style.setProperty("--dur", list.length * CONFIG.TICKER_SECONDS_PER_ITEM + "s");
}

/* ---- UPI ---- */
function upiUri(amount, ref) {
  const p = new URLSearchParams({ pa: SITE.upi_id, pn: SITE.upi_payee_name, cu: "INR" });
  if (amount) p.set("am", Number(amount).toFixed(2));
  if (ref) p.set("tn", "Donation " + ref);
  return "upi://pay?" + p.toString().replace(/\+/g, "%20");
}
function applySite() {
  $("babaName").textContent = SITE.baba_name; $("orgName").textContent = SITE.organization_name;
  $("aOrg").textContent = SITE.organization_name; $("footOrg").textContent = SITE.organization_name;
  $("aPhone").textContent = SITE.contact_phone || "उपलब्ध नहीं"; $("aMail").textContent = SITE.contact_email || "उपलब्ध नहीं";
  $("upiId").textContent = SITE.upi_id; $("upiPayee").textContent = SITE.upi_payee_name;
  const b = safeUrl(SITE.baba_image_url); if (b) $("babaImg").src = b;
  const q = safeUrl(SITE.upi_qr_image_url);
  if (q) $("qrImg").src = q; else $("qrMsg").textContent = "QR छवि अभी उपलब्ध नहीं है। कृपया UPI ID का उपयोग करें।";
  $("upiOpen").hidden = false; $("upiOpen").href = upiUri();
  $("sampleNote").hidden = !CONFIG.SHOW_SAMPLE_NOTE;
}
$("copyUpi").onclick = async () => {
  try { await navigator.clipboard.writeText(SITE.upi_id); $("qrMsg").textContent = "UPI ID कॉपी हो गई।"; $("qrMsg").className = "msg good"; }
  catch { $("qrMsg").textContent = "कॉपी नहीं हो सकी। कृपया UPI ID दबाकर कॉपी करें।"; $("qrMsg").className = "msg bad"; }
};
$("dlQr").onclick = async () => {
  const url = $("qrImg").src; if (!url) return;
  try {
    const blob = await (await fetch(url, { mode: "cors" })).blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "upi-qr.png"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch { window.open(url, "_blank", "noopener"); $("qrMsg").textContent = "सीधा डाउनलोड नहीं हो सका। नई टैब की छवि दबाकर सेव करें।"; }
};

/* ---- आश्रम, आँकड़े, शीर्ष दानदाता (नमूना डेटा से) ---- */
function renderAshrams() {
  const g = $("ashramGrid"), sel = $("fAshram");
  ASHRAMS.forEach((a, i) => {
    const got = donations.filter((d) => d.ashram === i).reduce((s, d) => s + d.amount, 0);
    const c = el("article", "acard");
    if (safeUrl(a.image_url)) { const im = el("img"); im.src = a.image_url; im.alt = a.name; im.loading = "lazy"; c.append(im); }
    const d = el("div", "in");
    d.append(el("h3", "", a.name), el("span", "tag", STATUS[a.status] || a.status), el("p", "", a.description),
      el("p", "meta", [a.city, a.district, a.state].filter(Boolean).join(", ")));
    if (safeUrl(a.maps_url)) { const m = el("a", "", "नक्शे में देखें"); m.href = a.maps_url; m.target = "_blank"; m.rel = "noopener noreferrer"; d.append(m); }
    d.append(el("p", "meta", `अनुमानित बजट: ${inr(a.estimated_budget)} · प्राप्त: ${inr(got)}`));
    const b = el("button", "btn", "इस आश्रम के लिए सहयोग करें"); b.type = "button";
    b.onclick = () => { sel.value = String(i); location.hash = "#qr"; };
    d.append(b); c.append(d); g.append(c);
    sel.append(new Option(a.name, String(i)));
  });
  g.querySelector(".muted")?.remove();
}
function renderStats() {
  const total = donations.reduce((s, d) => s + d.amount, 0);
  const todayList = donations.filter((d) => d.days === 0);
  const goal = ASHRAMS.reduce((s, a) => s + a.estimated_budget, 0);
  $("sTotal").textContent = inr(total);
  $("sCount").textContent = donations.length.toLocaleString("en-IN");
  $("sToday").textContent = inr(todayList.reduce((s, d) => s + d.amount, 0));
  $("sGoal").textContent = `${inr(total)} / ${inr(goal)}`;
  const pct = goal ? Math.min(100, total / goal * 100) : 0;
  $("barFill").style.width = pct + "%"; $("bar").setAttribute("aria-valuenow", Math.round(pct));
  const top = todayList.slice().sort((a, b) => b.amount - a.amount).slice(0, 10);
  const ol = $("topList"); ol.replaceChildren();
  if (!top.length) { ol.append(el("li", "muted", "आज अभी तक कोई दान दर्ज नहीं हुआ।")); return; }
  top.forEach((d, i) => { const li = el("li", i < 3 ? "g" : "");
    li.append(el("span", "rk", i + 1), el("span", "nm", d.name), el("span", "am", inr(d.amount))); ol.append(li); });
}

/* ---- फ़ॉर्म → Telegram ---- */
const setErr = (id, m) => { const e = document.querySelector(`.err[data-for="${id}"]`); if (e) e.textContent = m || ""; };
document.querySelectorAll("#chips button").forEach((b) => b.onclick = () => {
  document.querySelectorAll("#chips button").forEach((x) => x.classList.remove("on"));
  b.classList.add("on"); $("fAmount").value = b.dataset.a; if (!b.dataset.a) $("fAmount").focus();
});
$("fMobile").oninput = (e) => e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
const newRef = () => "ASH-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

$("donForm").onsubmit = async (e) => {
  e.preventDefault();
  if ($("hp").value) return;
  const v = { name: $("fName").value.trim(), mobile: $("fMobile").value.trim(), amount: Number($("fAmount").value), ashram: $("fAshram").value };
  let bad = false;
  const chk = (id, ok, m) => { setErr(id, ok ? "" : m); if (!ok) bad = true; };
  chk("fName", v.name.length >= 2, "कृपया अपना पूरा नाम लिखें (कम से कम 2 अक्षर)।");
  chk("fMobile", /^[6-9]\d{9}$/.test(v.mobile), "कृपया 10 अंकों का सही मोबाइल नंबर लिखें।");
  chk("fAmount", v.amount >= 1 && v.amount <= 1000000, "कृपया ₹1 से ₹10,00,000 के बीच राशि लिखें।");
  chk("fAshram", v.ashram !== "", "कृपया आश्रम चुनें।");
  chk("fConsent", $("fConsent").checked, "आगे बढ़ने के लिए सहमति आवश्यक है।");
  if (bad) return;
  const m = $("formMsg"), btn = $("submitBtn");
  if (!cooldown("last_submit", 20)) { m.className = "msg bad"; m.textContent = "कृपया कुछ सेकंड बाद पुनः प्रयास करें।"; return; }
  const ref = newRef(), ash = ASHRAMS[Number(v.ashram)].name;
  btn.disabled = true; m.className = "msg"; m.textContent = "जमा हो रहा है…";
  try {
    await sendTelegram(`नया दान विवरण (लंबित, असत्यापित)\nसंदर्भ: ${ref}\nनाम: ${v.name}\nमोबाइल: ${v.mobile}\nराशि: ₹${v.amount}\nआश्रम: ${ash}\nउद्देश्य: ${$("fPurpose").value.trim() || "-"}\nसार्वजनिक सूची में अनाम: ${$("fAnon").checked ? "हाँ" : "नहीं"}\nसहमति: हाँ`);
    lastDonation = { ref };
    $("rRef").textContent = ref; $("rAmt").textContent = inr(v.amount); $("rAsh").textContent = ash;
    $("rUpi").href = upiUri(v.amount, ref);
    $("result").hidden = false; m.textContent = ""; $("donForm").reset();
    $("result").scrollIntoView({ behavior: "smooth" });
  } catch (x) {
    localStorage.removeItem("last_submit");
    m.className = "msg bad";
    m.textContent = x.message === "NOCONFIG" ? "सेटअप अधूरा है: Telegram जानकारी script.js में नहीं है।" : "विवरण भेजा नहीं जा सका। कृपया पुनः प्रयास करें।";
  }
  btn.disabled = false;
};
$("utrForm").onsubmit = async (e) => {
  e.preventDefault();
  const u = $("fUtr").value.trim().toUpperCase(), m = $("utrMsg");
  if (!/^[A-Z0-9]{6,30}$/.test(u)) { setErr("fUtr", "UTR में केवल 6–30 अक्षर/अंक होने चाहिए।"); return; }
  setErr("fUtr", ""); m.className = "msg"; m.textContent = "जमा हो रहा है…";
  try {
    await sendTelegram(`UTR प्राप्त (असत्यापित)\nसंदर्भ: ${lastDonation.ref}\nUTR: ${u}`);
    m.className = "msg good"; m.textContent = "UTR भेज दिया गया। संस्था द्वारा सत्यापन के बाद ही दान गिना जाएगा।";
  } catch { m.className = "msg bad"; m.textContent = "UTR भेजा नहीं जा सका। कृपया पुनः प्रयास करें।"; }
};

/* ---- स्टिकी CTA ---- */
const io = new IntersectionObserver((en) => $("stickyCta").classList.toggle("off", en.some((x) => x.isIntersecting)));
["qr", "donate"].forEach((id) => io.observe($(id)));

applySite(); renderAshrams(); renderStats(); buildTicker();
