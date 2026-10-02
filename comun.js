/* Piezas compartidas por la página de los jugadores y la del organizador. */
const ID_PREFIX = "sej-cajasan-2026-";
// STUN para la conexión directa y, de respaldo, los servidores TURN públicos de
// PeerJS (los mismos que trae la librería por defecto): se usan solo si el
// celular y el presentador están en redes que no se pueden conectar directo.
const PEER_OPTS = { debug: 0, config: { iceServers: [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: ["turn:eu-0.turn.peerjs.com:3478", "turn:us-0.turn.peerjs.com:3478"], username: "peerjs", credential: "peerjsp" }
], sdpSemantics: "unified-plan" } };

const SHAPES = [
  '<svg viewBox="0 0 32 32"><path d="M16 3 30 28H2z"/></svg>',
  '<svg viewBox="0 0 32 32"><path d="M16 2 30 16 16 30 2 16z"/></svg>',
  '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14"/></svg>',
  '<svg viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26" rx="3"/></svg>'
];
const LET = ["A","B","C","D"];
const $app = document.getElementById("app");
const $status = document.getElementById("status");
let mode = "home";
const esc = s => String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const setStatus = t => { $status.textContent = t; };
const hasPeer = typeof window.Peer === "function";
const movimientoReducido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Onda que sale desde el punto donde se tocó cualquier botón */
document.addEventListener("pointerdown", e => {
  const b = e.target.closest("button");
  if (!b || b.disabled || b.classList.contains("link")) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2;
  const s = document.createElement("span");
  s.className = "onda";
  s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d/2}px;top:${e.clientY - r.top - d/2}px`;
  b.appendChild(s);
  setTimeout(() => s.remove(), 650);
});

/* Cortina azul con el logo que cruza la pantalla entre una pregunta y otra.
   `cambio` se ejecuta cuando la pantalla está tapada. */
let enTransicion = false;
function transicion(titulo, sub, cambio){
  if (enTransicion) return;
  const c = document.getElementById("cortina");
  if (!c){ cambio(); return; }
  enTransicion = true;
  c.querySelector(".cortina-t").textContent = titulo;
  c.querySelector(".cortina-s").textContent = sub || "";
  c.hidden = false; c.className = "cortina entra-c";
  setTimeout(() => {
    try { cambio(); } finally {
      c.className = "cortina sale-c";
      setTimeout(() => { c.hidden = true; c.className = "cortina"; enTransicion = false; }, 470);
    }
  }, 900);
}

/* Números que suben contando (puntajes). Con setTimeout y no con
   requestAnimationFrame, para que el número final siempre quede puesto. */
function contar(el, desde, hasta, ms = 900){
  const t0 = Date.now();
  const paso = () => {
    const k = Math.min(1, (Date.now() - t0) / ms);
    el.textContent = Math.round(desde + (hasta - desde) * (1 - Math.pow(1 - k, 3))).toLocaleString("es-CO");
    if (k < 1) setTimeout(paso, 30);
  };
  paso();
}
function animarNumeros(raiz = $app){
  raiz.querySelectorAll("[data-hasta]").forEach(el => {
    const desde = +el.dataset.desde || 0, hasta = +el.dataset.hasta || 0;
    const espera = +el.dataset.espera || 0;
    el.textContent = desde.toLocaleString("es-CO");
    setTimeout(() => contar(el, desde, hasta), espera);
  });
}

/* Copas de oro, plata y bronce (dibujadas, con un brillo que las cruza) */
let idCopa = 0;
const METALES = {
  1: ["#fff3b8", "#f7c52b", "#b47b05", "#6e4a00"],
  2: ["#eef1f6", "#b4bdca", "#77839a", "#39424f"],
  3: ["#ffd8b6", "#dc8c46", "#9a541e", "#5a2e0c"]
};
function trofeo(lugar, i = 0){
  const [c1, c2, c3, txt] = METALES[lugar], id = "copa" + (++idCopa);
  const chispas = lugar === 1
    ? `<path class="chispa" d="M55 6l1.6 4 4 1.6-4 1.6L55 17l-1.6-3.8-4-1.6 4-1.6z" fill="#fff6c8"/><path class="chispa" d="M8 30l1.2 3 3 1.2-3 1.2L8 38.4l-1.2-3-3-1.2 3-1.2z" fill="#fff6c8"/>`
    : "";
  return `<svg class="trofeo t${lugar}" style="--i:${i}" viewBox="0 0 64 64" role="img" aria-label="Puesto ${lugar}">
  <defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
    <clipPath id="${id}c"><path d="M18 7h28v15c0 9.5-6.3 16.5-14 16.5S18 31.5 18 22z"/><rect x="28.5" y="37" width="7" height="9"/><path d="M22 46h20l2 6H20z"/><rect x="16" y="52" width="32" height="6" rx="2"/></clipPath>
  </defs>
  <path d="M18 11.5H10.5c0 9 4 14.5 10.5 15.5M46 11.5h7.5c0 9-4 14.5-10.5 15.5" fill="none" stroke="${c2}" stroke-width="4.2" stroke-linecap="round"/>
  <g clip-path="url(#${id}c)">
    <rect width="64" height="64" fill="url(#${id}g)"/>
    <g><animateTransform attributeName="transform" type="translate" values="-20 0;90 0;90 0" keyTimes="0;.45;1" dur="3.2s" begin="${0.8 + i * 0.15}s" repeatCount="indefinite"/>
      <rect x="0" y="-8" width="9" height="80" fill="#fff" opacity=".55" transform="skewX(-20)"/></g>
  </g>
  <text x="32" y="28.5" text-anchor="middle" font-family="Baloo 2, Trebuchet MS, sans-serif" font-weight="800" font-size="17" fill="${txt}">${lugar}</text>
  ${chispas}
</svg>`;
}
/* 1, 2 y 3 llevan copa; del 4 en adelante, el número */
function puesto(n, i = 0){ return n <= 3 ? trofeo(n, i) : `<span class="num">${n}</span>`; }

/* Confeti al final */
function confetti(){
  if (movimientoReducido()) return;
  const cv = document.getElementById("confetti"); cv.hidden = false;
  const ctx = cv.getContext("2d"); const W = cv.width = innerWidth, Hh = cv.height = innerHeight;
  const cols = ["#dc3f45","#1590d6","#d68c00","#1f9a52","#ffffff","#ffc21f"];
  const bits = Array.from({length:180}, () => ({x:Math.random()*W, y:-20-Math.random()*Hh*.5, vx:(Math.random()-.5)*3, vy:2+Math.random()*3, r:Math.random()*6.28, s:5+Math.random()*7, c:cols[Math.random()*cols.length|0]}));
  const t0 = performance.now();
  (function f(t){
    ctx.clearRect(0,0,W,Hh);
    bits.forEach(b => { b.x += b.vx; b.y += b.vy; b.r += .1; ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s/2,-b.s/4,b.s,b.s/2); ctx.restore(); });
    if (t - t0 < 4500) requestAnimationFrame(f); else { ctx.clearRect(0,0,W,Hh); cv.hidden = true; }
  })(t0);
}
