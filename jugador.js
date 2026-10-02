/* Página de los JUGADORES: solo entrar con el PIN y responder desde el celular.
   Las preguntas y las respuestas correctas NO están aquí: las manda el
   presentador una por una, y la correcta solo al revelar. */

/* ---------- INICIO ---------- */
function renderHome(){
  mode = "home";
  const keep = {}; ["nickIn","pinIn"].forEach(id => { const el = document.getElementById(id); if (el) keep[id] = el.value; });
  const urlPin = (location.hash.match(/pin(\d{4})/) || [])[1] || "";
  $app.innerHTML = `
  <section class="hero">
    <div class="entra">
      <p class="etq">Trivia en vivo</p>
      <h1 style="margin-top:8px">Septiembre, cumpleaños y <em>datos curiosos</em></h1>
      <p class="lead">Escribe el PIN que aparece en la pantalla y responde desde tu celular. Gana quien responda bien y más rápido.</p>
      <div class="cake" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </div>
    <form class="panel entra" style="--i:1" id="joinForm" autocomplete="off">
      <h2>Únete a la partida</h2>
      <input id="pinIn" inputmode="numeric" maxlength="4" placeholder="PIN de la partida" aria-label="PIN de la partida">
      <input id="nickIn" maxlength="16" placeholder="Tu nombre o apodo" aria-label="Tu nombre o apodo">
      <button class="btn azul" type="submit">Entrar</button>
      <div class="err" id="joinErr">${hasPeer ? "" : "No se pudo cargar el módulo de conexión. Recarga la página."}</div>
    </form>
  </section>`;
  document.getElementById("pinIn").value = keep.pinIn || urlPin;
  document.getElementById("nickIn").value = keep.nickIn || "";
  document.getElementById("joinForm").onsubmit = e => { e.preventDefault(); joinGame(); };
  setStatus("Listo para jugar");
}
renderHome();

/* =================== JUGADOR =================== */
const P = { nick:"", pin:"", peer:null, conn:null, key:"", myAns:null, shownAt:0, tick:null, waitTimer:null, last:null, puntos:0 };

function joinGame(){
  if (!hasPeer) return;
  const pin = (document.getElementById("pinIn").value || "").replace(/\D/g,"");
  const nick = (document.getElementById("nickIn").value || "").trim().slice(0,16);
  const err = document.getElementById("joinErr");
  if (pin.length !== 4){ err.textContent = "El PIN tiene 4 números. Míralo en la pantalla del presentador."; return; }
  if (!nick){ err.textContent = "Escribe un nombre para que te vean en el ranking."; return; }
  P.nick = nick; P.pin = pin; P.key = ""; P.myAns = null; P.last = null; P.puntos = 0;
  mode = "player";
  renderPlayerWait("Entrando…", "Conectando con la partida " + pin + ".");
  try { P.peer && P.peer.destroy(); } catch {}
  const peer = new Peer(PEER_OPTS); P.peer = peer;
  peer.on("open", () => connectToHost());
  peer.on("disconnected", () => { try { peer.reconnect(); } catch {} });
  peer.on("error", e => {
    if (e.type === "peer-unavailable") renderPlayerWait("No encontramos esa partida", "Revisa que el PIN sea " + pin + " y que el presentador tenga la partida abierta.", true);
    else if (!P.last) renderPlayerWait("No pudimos conectarnos", "Revisa tu conexión a internet. Si estás en la wifi de la empresa, prueba con datos móviles.", true);
  });
}
function connectToHost(){
  const conn = P.peer.connect(ID_PREFIX + P.pin, { reliable:true });
  P.conn = conn;
  clearTimeout(P.waitTimer);
  P.waitTimer = setTimeout(() => { if (!P.last) renderPlayerWait("La conexión está tardando", "Puede que la red bloquee el juego. Prueba con datos móviles o con otra wifi.", true); }, 12000);
  conn.on("open", () => {
    conn.send({ t:"join", nick:P.nick }); setStatus(P.nick + " · PIN " + P.pin);
    // Señal de "sigo aquí" para el presentador (si se corta, saca el nombre de la sala)
    clearInterval(P.latido);
    P.latido = setInterval(() => { try { if (conn.open) conn.send({ t:"ping" }); } catch {} }, 4000);
  });
  conn.on("data", h => { if (h && h.t === "state"){ P.last = h; clearTimeout(P.waitTimer); onHostState(h); } });
  conn.on("close", () => { clearInterval(P.latido); if (mode === "player") renderPlayerWait("Se perdió la conexión", "El presentador cerró la partida o se cayó la red.", true); });
}
function onHostState(h){
  const key = h.phase + ":" + h.qi;
  if (key === P.key && h.phase === "question") return;
  P.key = key;
  renderPlayerPhase(h);
}
function renderPlayerWait(title, sub, retry){
  if (mode !== "player") return;
  clearInterval(P.tick);
  $app.innerHTML = `<div class="center entra"><div class="big">${esc(title)}</div><p class="muted" style="max-width:40ch">${esc(sub)}</p>${retry ? `<div class="row"><button class="btn" id="re">Reintentar</button><button class="btn ghost" id="out">Cambiar PIN</button></div>` : ""}</div>`;
  if (retry){
    document.getElementById("out").onclick = leavePlayer;
    document.getElementById("re").onclick = () => { renderHome(); document.getElementById("pinIn").value = P.pin; document.getElementById("nickIn").value = P.nick; joinGame(); };
  }
}
function despedirse(){ clearInterval(P.latido); try { if (P.conn && P.conn.open) P.conn.send({ t:"bye" }); } catch {} }
// Al cerrar la página o salir, el presentador lo sabe al instante
window.addEventListener("pagehide", despedirse);
function leavePlayer(){ clearInterval(P.tick); despedirse(); try { P.peer && P.peer.destroy(); } catch {} P.peer = null; renderHome(); document.getElementById("nickIn").value = P.nick; }

const ICONO_BIEN = '<svg class="icono" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="rgba(255,255,255,.2)"/><path d="M18 33l9 9 19-20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONO_MAL = '<svg class="icono" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="rgba(255,255,255,.2)"/><path d="M22 22l20 20M42 22 22 42" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>';
const ICONO_RELOJ = '<svg class="icono" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#eef4fc"/><circle cx="32" cy="34" r="16" fill="none" stroke="#004d9d" stroke-width="5"/><path d="M32 26v9l6 4M27 12h10" fill="none" stroke="#004d9d" stroke-width="5" stroke-linecap="round"/></svg>';

function tickJugador(dur){
  const left = Math.max(0, dur*1000 - (Date.now() - P.shownAt));
  const s = Math.ceil(left/1000), p = left/(dur*1000)*100;
  const t = document.getElementById("ptimer"), bar = document.getElementById("pbarra");
  if (t){
    t.style.setProperty("--p", p + "%");
    const b = t.querySelector("b");
    if (b.textContent !== String(s)){ b.textContent = s; if (s <= 5 && s > 0){ b.classList.remove("late"); void b.offsetWidth; b.classList.add("late"); } }
    t.classList.toggle("urgente", s <= 5);
  }
  if (bar){ bar.style.setProperty("--p", p + "%"); bar.classList.toggle("urgente", s <= 5); }
}

function renderPlayerPhase(h){
  clearInterval(P.tick);
  const qi = h.qi|0;
  const cur = h.cur && typeof h.cur === "object" ? h.cur : {};
  const q = { q:String(cur.q||""), o:(Array.isArray(cur.o)?cur.o:[]).slice(0,4).map(String), c:cur.c };
  const dur = Math.max(5, Math.min(120, h.dur|0 || 20));
  const r = (h.res && P.peer && h.res[P.peer.id]) || null;
  if (h.phase === "lobby"){
    P.myAns = null; P.puntos = 0;
    if (!document.getElementById("sala")){
      $app.innerHTML = `<div class="center sala" id="sala">
        <p class="etq entra">Estás dentro</p><div class="big entra" style="--i:1">${esc(P.nick)}</div>
        <p class="muted entra" style="--i:2;max-width:36ch;margin:0">El juego empieza cuando el presentador lo indique.</p>
        <div class="sala-jug entra" style="--i:3"><p class="sala-titulo" id="salaCuenta"></p><div class="players" id="salaLista"></div></div>
        <div class="cake" aria-hidden="true" style="display:flex"><i></i><i></i><i></i></div></div>`;
    }
    pintarSala(Array.isArray(h.jug) ? h.jug : []);
    return;
  }
  if (h.phase === "question"){
    if (P.myAns && P.myAns.q === qi) return;
    P.myAns = null; P.shownAt = Date.now();
    $app.innerHTML = `
      <div class="q-cab"><span class="chip">Pregunta ${qi+1} de ${h.n}</span><span class="chip">${esc(P.nick)}</span></div>
      <div class="q-zona">
        <div class="reloj" id="ptimer" role="timer" aria-label="Segundos restantes"><b>${dur}</b><small>SEGUNDOS</small></div>
        <h2 class="pregunta">${esc(q.q)}</h2>
      </div>
      <div class="barra-tiempo" id="pbarra"><i></i></div>
      <div class="answers">${q.o.map((o,i) => `<button class="ans c${i}" style="--i:${i}" data-i="${i}" aria-label="${LET[i]}: ${esc(o)}"><span class="sh">${SHAPES[i]}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
    $app.querySelectorAll(".answers button").forEach(b => b.onclick = () => answer(qi, +b.dataset.i));
    P.tick = setInterval(() => tickJugador(dur), 200);
    return;
  }
  if (h.phase === "reveal" || h.phase === "board"){
    const ok = r ? r[3] : -1;
    const cls = ok === 1 ? "ok" : ok === 0 ? "bad" : "none";
    const msg = ok === 1 ? "¡Correcto!" : ok === 0 ? "Incorrecto" : "Sin respuesta";
    const icono = ok === 1 ? ICONO_BIEN : ok === 0 ? ICONO_MAL : ICONO_RELOJ;
    const total = r ? r[0] : 0, antes = h.phase === "reveal" ? total - (r ? r[1] : 0) : total;
    $app.innerHTML = `<div class="center">
      <div class="result ${cls}">${icono}<div class="big">${msg}</div>${ok === 1 ? `<div class="score">+${r[1]}</div>` : (q.o[q.c] != null ? `<p style="margin:6px 0 0">Era: <b>${esc(q.o[q.c])}</b></p>` : "")}</div>
      <p class="etq entra" style="--i:2">Tu puntaje</p><div class="score entra" style="--i:2" data-desde="${antes}" data-hasta="${total}" data-espera="350">${total}</div>
      ${r ? `<p class="mi-puesto entra" style="--i:3">${r[2] <= 3 ? trofeo(r[2]) : ""}<span>Vas en el puesto ${r[2]} de ${h.total}</span></p>` : ""}</div>`;
    animarNumeros();
    return;
  }
  if (h.phase === "end"){
    const place = r ? r[2] : 0;
    $app.innerHTML = `<div class="center final"><p class="etq entra">Resultado final</p>
      ${place && place <= 3 ? trofeo(place) : ""}
      <div class="big entra" style="--i:1">${place === 1 ? "¡Ganaste!" : place && place <= 3 ? "¡Al podio!" : "¡Buen juego!"}</div>
      <div class="score entra" style="--i:2">${r ? r[0].toLocaleString("es-CO") : 0} pts</div><p class="muted entra" style="--i:3">${place ? "Puesto " + place + " de " + h.total : ""}</p></div>`;
    if (place && place <= 3) confetti();
  }
}
// Los nombres de la sala: solo se agregan los que llegan y se quitan los que se van,
// así cada nombre nuevo "salta" al entrar sin repetir la animación de los demás.
function pintarSala(jug){
  const lista = document.getElementById("salaLista"); if (!lista) return;
  const yo = P.peer && P.peer.id;
  const ids = new Set(jug.map(j => String(j[0])));
  lista.querySelectorAll(".pl").forEach(ch => { if (!ids.has(ch.dataset.id)) ch.remove(); });
  for (const [id, nick] of jug){
    let ch = [...lista.querySelectorAll(".pl")].find(x => x.dataset.id === String(id));
    if (!ch){
      ch = document.createElement("span"); ch.className = "pl" + (id === yo ? " yo" : ""); ch.dataset.id = String(id);
      lista.appendChild(ch);
    }
    const texto = String(nick || "Jugador").slice(0,16) + (id === yo ? " (tú)" : "");
    if (ch.textContent !== texto) ch.textContent = texto;
  }
  const n = jug.length;
  document.getElementById("salaCuenta").textContent = n === 1 ? "Por ahora solo estás tú" : n + " jugadores en la partida";
}

function answer(qi, i){
  if (P.myAns || !P.conn) return;
  const ms = Date.now() - P.shownAt;
  P.myAns = { q:qi, c:i };
  try { P.conn.send({ t:"ans", q:qi, c:i, ms }); } catch {}
  clearInterval(P.tick);
  $app.innerHTML = `<div class="center"><div class="enviada c${i}">${SHAPES[i]}</div>
    <div class="big entra" style="--i:1">Respuesta enviada</div><p class="muted entra" style="--i:2">Espera a que termine el tiempo.</p></div>`;
}
