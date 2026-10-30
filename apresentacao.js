/* Apresentação de primeiro acesso: 4 telas curtas, em tela cheia por cima da Visão geral.
   Aparece só na primeira visita (o navegador lembra) ou com index.html?apresentacao=1 ("Ver apresentação" no menu).
   Personagens: a Pingo (gotinha que guia) e pessoas simples nas cenas — desenhos próprios, em SVG. */
(function () {
  "use strict";
  const O = window.OBS;
  if (!O) return;
  const { h } = O;
  const CHAVE = "apresentacao-vista";

  const pedida = new URLSearchParams(location.search).has("apresentacao");
  const jaViu = (() => { try { return localStorage.getItem(CHAVE) === "1"; } catch { return false; } })();
  if (!pedida && jaViu) return;

  // ------------------------------------------------------------------ desenhos
  // a Pingo: a gota do logo, com olhos, sorriso e bracinhos
  const pingo = (acao = "") => `
    <svg class="pingo ${acao}" viewBox="0 0 120 140" aria-hidden="true">
      <defs><linearGradient id="pingo-cor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd2ff"/><stop offset="1" stop-color="#2f74d6"/></linearGradient></defs>
      <ellipse cx="60" cy="132" rx="30" ry="5" fill="#000" opacity=".2"/>
      <g class="pingo-corpo">
        <path class="braco-esq" d="M28 82 q-14 4 -18 -10" stroke="#9fd2ff" stroke-width="6" stroke-linecap="round" fill="none"/>
        <path class="braco-dir" d="M92 82 q14 -2 18 -16" stroke="#9fd2ff" stroke-width="6" stroke-linecap="round" fill="none"/>
        <path d="M60 8c-10 16-36 42-36 70a36 36 0 0 0 72 0c0-28-26-54-36-70z" fill="url(#pingo-cor)"/>
        <path d="M44 56c-4 6-6 12-6 18" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round" fill="none"/>
        <g class="olhos"><ellipse cx="49" cy="78" rx="5.5" ry="7" fill="#fff"/><ellipse cx="71" cy="78" rx="5.5" ry="7" fill="#fff"/>
          <circle cx="50" cy="80" r="3" fill="#0f1b2d"/><circle cx="72" cy="80" r="3" fill="#0f1b2d"/></g>
        <path d="M51 94q9 8 18 0" stroke="#0f1b2d" stroke-width="3" stroke-linecap="round" fill="none"/>
        <circle cx="42" cy="91" r="4" fill="#ff9db0" opacity=".55"/><circle cx="78" cy="91" r="4" fill="#ff9db0" opacity=".55"/>
      </g>
    </svg>`;

  // pessoa simples: cabeça, cabelo, corpo, pernas (cor da roupa varia)
  const pessoa = (x, y, roupa, extra = "", cabelo = "#3b2a20") => `
    <g transform="translate(${x} ${y})">
      <path d="M-7 46v20M7 46v20" stroke="#24324a" stroke-width="5" stroke-linecap="round"/>
      <rect x="-13" y="14" width="26" height="36" rx="11" fill="${roupa}"/>
      <circle cx="0" cy="2" r="11" fill="#e8b48f"/>
      <path d="M-11 0a11 11 0 0 1 22 0q-6 -5 -11 -3q-6 -2 -11 3z" fill="${cabelo}"/>
      ${extra}
    </g>`;

  const gotasChuva = (n, larg, alt, dx = 0) => Array.from({ length: n }, (_, i) =>
    `<path class="chuva-gota" style="animation-delay:${(i * 0.37) % 1.6}s" d="M${dx + 12 + (i * 53) % larg} ${-10 - (i * 29) % 40}l-3 9" stroke="#bfe0ff" stroke-width="2.4" stroke-linecap="round"/>`).join("");

  // cena 1: chuva caindo no pluviômetro + moradora de guarda-chuva
  const cena1 = () => `
    <svg viewBox="0 0 320 240" aria-hidden="true">
      <defs>
        <linearGradient id="ap-agua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc0ff"/><stop offset="1" stop-color="#2f74d6"/></linearGradient>
        <clipPath id="ap-tubo"><rect x="178" y="92" width="64" height="120" rx="10"/></clipPath>
      </defs>
      <g class="chuva">${gotasChuva(14, 300, 200)}</g>
      <ellipse cx="160" cy="226" rx="140" ry="8" fill="#000" opacity=".15"/>
      <path d="M164 76h92l-22 20h-48z" fill="#fff" opacity=".92"/>
      <g clip-path="url(#ap-tubo)"><rect x="178" y="92" width="64" height="120" fill="#fff" opacity=".08"/>
        <g class="ap-nivel"><rect x="178" y="150" width="64" height="70" fill="url(#ap-agua)"/>
          <path class="onda-agua" d="M170 150q8 -5 16 0t16 0t16 0t16 0t16 0t16 0v10h-96z" fill="#9fd0ff" opacity=".7"/></g></g>
      <rect x="178" y="92" width="64" height="120" rx="10" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="3"/>
      <g stroke="#fff" stroke-opacity=".7" stroke-width="2"><path d="M222 112h14M228 132h8M222 152h14M228 172h8M222 192h14"/></g>
      <text x="210" y="232" text-anchor="middle" class="ap-rotulo">pluviômetro</text>
      ${pessoa(88, 150, "#eb6834", `
        <path d="M10 22l14 -40" stroke="#24324a" stroke-width="3" stroke-linecap="round"/>
        <path class="guarda-chuva" d="M-26 -18a50 34 0 0 1 100 0q-12 -8 -25 0q-12 -8 -25 0q-12 -8 -25 0q-12 -8 -25 0z" fill="#ffffff"/>`)}
    </svg>`;

  // cena 2: os pluviômetros acendendo no mapa (posições reais das estações) + técnica com prancheta
  function cena2() {
    const pts = O.medicao.filter((e) => e.lat != null);
    const lat = pts.map((e) => e.lat), lon = pts.map((e) => e.lon);
    const [la0, la1, lo0, lo1] = [Math.min(...lat), Math.max(...lat), Math.min(...lon), Math.max(...lon)];
    const px = (e) => 70 + ((e.lon - lo0) / (lo1 - lo0 || 1)) * 200;
    const py = (e) => 30 + ((la1 - e.lat) / (la1 - la0 || 1)) * 170;
    const pontos = pts.map((e, i) => `
      <g class="ponto-estacao" style="animation-delay:${0.25 + i * 0.12}s">
        <circle cx="${px(e).toFixed(1)}" cy="${py(e).toFixed(1)}" r="12" fill="${e.rede === "INMET" ? "#7cc0ff" : "#ff9a6b"}" opacity=".25" class="halo"/>
        <circle cx="${px(e).toFixed(1)}" cy="${py(e).toFixed(1)}" r="5.5" fill="${e.rede === "INMET" ? "#4d8fe8" : "#eb6834"}" stroke="#fff" stroke-width="2"/>
      </g>`).join("");
    return `
    <svg viewBox="0 0 320 240" aria-hidden="true">
      <path d="M40 8H298C290 22 286 34 276 44C256 64 236 80 214 102C196 120 182 136 166 152C146 172 128 192 112 214C106 222 100 230 94 236H40Z"
        fill="#ffffff" opacity=".08"/>
      <path d="M298 8C290 22 286 34 276 44C256 64 236 80 214 102C196 120 182 136 166 152C146 172 128 192 112 214C106 222 100 230 94 236"
        fill="none" stroke="#9fd2ff" stroke-opacity=".55" stroke-width="2"/>
      <path d="M298 8C290 22 286 34 276 44C256 64 236 80 214 102C196 120 182 136 166 152C146 172 128 192 112 214C106 222 100 230 94 236H320V0H298Z"
        fill="#0d2a66" opacity=".45"/>
      <path d="M60 168c10-12 26-10 34 2c6 10 4 26-6 36c-10 10-26 8-32-4c-4-10-4-24 4-34z" fill="#0d2a66" opacity=".55"/>
      <text x="76" y="232" text-anchor="middle" class="ap-rotulo" opacity=".7">lagoa</text>
      <text x="300" y="226" text-anchor="end" class="ap-rotulo" opacity=".7">oceano</text>
      <text x="52" y="28" class="ap-rotulo" opacity=".8">Maceió</text>
      ${pontos}
      ${pessoa(20, 150, "#1baf7a", `
        <rect x="8" y="18" width="18" height="24" rx="3" fill="#fff"/><path d="M12 25h10M12 31h10M12 37h6" stroke="#9aa6b8" stroke-width="2"/>`, "#1b1b1b")}
    </svg>`;
  }

  // cena 3: o robô arquiva os meses e marca ✓ (bom), ! (incompleto) e ✕ (suspeito)
  function cena3() {
    const marcas = ["ok", "ok", "ok", "inc", "ok", "ok", "sus", "ok", "ok", "ok", "inc", "ok"];
    const cor = { ok: "#22b45a", inc: "#f0a92a", sus: "#e5534b" };
    const sinal = { ok: "M-4 0l3 3 5-6", inc: "M0 -5v5M0 4v.5", sus: "M-3.5 -3.5l7 7M3.5 -3.5l-7 7" };
    const grade = marcas.map((m, i) => {
      const x = 188 + (i % 4) * 30, y = 58 + Math.floor(i / 4) * 30;
      return `<g transform="translate(${x} ${y})"><g class="mes-marca" style="animation-delay:${0.3 + i * 0.15}s">
        <rect x="-12" y="-12" width="24" height="24" rx="6" fill="${cor[m]}"/>
        <path d="${sinal[m]}" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g></g>`;
    }).join("");
    return `
    <svg viewBox="0 0 320 240" aria-hidden="true">
      <ellipse cx="160" cy="226" rx="140" ry="8" fill="#000" opacity=".15"/>
      <g class="robo">
        <line x1="78" y1="54" x2="78" y2="38" stroke="#bfe0ff" stroke-width="3"/><circle class="antena" cx="78" cy="34" r="6" fill="#7cc0ff"/>
        <rect x="44" y="54" width="68" height="52" rx="16" fill="#e8f0fc"/>
        <rect x="54" y="66" width="48" height="26" rx="10" fill="#0f2257"/>
        <circle class="olho-robo" cx="68" cy="79" r="5" fill="#7cc0ff"/><circle class="olho-robo" cx="88" cy="79" r="5" fill="#7cc0ff"/>
        <rect x="50" y="112" width="56" height="64" rx="14" fill="#b9d2f6"/>
        <rect x="64" y="126" width="28" height="18" rx="4" fill="#fff"/><path d="M70 133h16M70 138h10" stroke="#9aa6b8" stroke-width="2"/>
        <path d="M50 128q-18 6 -16 26" stroke="#b9d2f6" stroke-width="9" stroke-linecap="round" fill="none"/>
        <path class="braco-robo" d="M106 128q22 -4 40 -22" stroke="#b9d2f6" stroke-width="9" stroke-linecap="round" fill="none"/>
        <rect x="56" y="176" width="16" height="36" rx="6" fill="#8fb3e8"/><rect x="84" y="176" width="16" height="36" rx="6" fill="#8fb3e8"/>
      </g>
      <g class="folha-voando"><rect x="140" y="86" width="22" height="28" rx="3" fill="#fff"/><path d="M145 94h12M145 100h12M145 106h8" stroke="#9aa6b8" stroke-width="2"/></g>
      ${grade}
      <text x="233" y="168" text-anchor="middle" class="ap-rotulo">cada quadrado é um mês</text>
    </svg>`;
  }

  // cena 4: a Pingo acenando junto com uma pessoa
  const cena4 = () => `
    <svg viewBox="0 0 320 240" aria-hidden="true">
      <ellipse cx="160" cy="226" rx="140" ry="8" fill="#000" opacity=".15"/>
      <g class="sol"><circle cx="252" cy="54" r="22" fill="#ffd166"/>
        <g stroke="#ffd166" stroke-width="3" stroke-linecap="round"><path d="M252 18v-8M252 98v-8M216 54h-8M296 54h-8M227 29l-6-6M283 85l-6-6M227 79l-6 6M283 23l-6 6"/></g></g>
      ${pessoa(214, 156, "#7b52c7", `<path class="aceno" d="M13 22q14 -10 16 -30" stroke="#e8b48f" stroke-width="6" stroke-linecap="round" fill="none"/>`, "#6b3f1d")}
    </svg>`;

  const CENAS = [
    { desenho: cena1, titulo: "Toda chuva vira um número",
      texto: "Oi! Eu sou a Pingo. Quando chove, o pluviômetro junta a água e mede quantos milímetros caíram. 1 mm é 1 litro de água em cada metro quadrado." },
    { desenho: cena2, titulo: `${O.medicao.length} pluviômetros por Maceió`,
      texto: `São ${O.cemaden.length} do CEMADEN e 1 do INMET, no campus da UFAL. Juntos, eles mostram onde chove mais na cidade, desde ${O.anoInicial}.` },
    { desenho: cena3, titulo: "Um robô guarda e confere tudo",
      texto: "Ele baixa os dados, guarda cada arquivo com data e origem e marca os meses com falha. Preferimos deixar um buraco a mostrar um número errado." },
    { desenho: cena4, titulo: "Agora é com você!", texto: "Escolha por onde começar — ou entre direto no site.", final: true },
  ];
  const DESTINOS = [
    ["monitoramento.html", "Chuva recente", "Quanto choveu em cada estação"],
    ["historico.html", "Série histórica", "Mês a mês, desde 2020"],
    ["estacoes.html", "Estações", "Mapa e qualidade dos dados"],
  ];

  // ------------------------------------------------------------------ montagem
  let atual = 0;
  const palco = h("div", { class: "ap-palco" });
  const pontos = CENAS.map((_, i) => {
    const b = h("button", { type: "button", class: "ap-ponto", "aria-label": `Ir para a tela ${i + 1}` });
    b.addEventListener("click", () => ir(i));
    return b;
  });
  const voltar = h("button", { type: "button", class: "ap-botao claro", text: "Voltar" });
  const proximo = h("button", { type: "button", class: "ap-botao", text: "Próximo →" });
  const pular = h("button", { type: "button", class: "ap-pular", text: "Pular apresentação" });
  const tela = h("div", { class: "apresentacao", role: "dialog", "aria-modal": "true", "aria-label": "Apresentação do Observatório de Chuva" }, [
    h("div", { class: "ap-topo" }, [
      h("span", { class: "ap-marca", html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c-.3 0-.6.2-.8.4C9.6 5 5 11 5 14.8A7 7 0 0 0 19 14.8C19 11 14.4 5 12.8 2.9a1 1 0 0 0-.8-.4z"/></svg><strong>Observatório de Chuva</strong><small>MACEIÓ • ALAGOAS</small>' }),
      pular]),
    palco,
    h("div", { class: "ap-base" }, [voltar, h("div", { class: "ap-pontos" }, pontos), proximo]),
  ]);

  function ir(i) {
    atual = Math.max(0, Math.min(CENAS.length - 1, i));
    const c = CENAS[atual];
    const fala = h("div", { class: "ap-fala" }, [
      h("p", { class: "ap-passo", text: `${atual + 1} de ${CENAS.length}` }),
      h("h2", { text: c.titulo }),
      h("p", { class: "ap-texto", text: c.texto }),
      c.final ? h("div", { class: "ap-destinos" }, DESTINOS.map(([href, nome, sub]) =>
        h("a", { href, class: "ap-destino" }, [h("strong", { text: nome }), h("small", { text: sub })]))) : null,
    ]);
    for (const a of fala.querySelectorAll("a")) a.addEventListener("click", lembrar);
    palco.replaceChildren(h("div", { class: "ap-cena", "data-cena": atual + 1 }, [
      h("div", { class: "ap-desenho", html: c.desenho() }),
      h("div", { class: "ap-conversa" }, [h("div", { class: "ap-guia", html: pingo(c.final ? "acenando" : "") }), fala]),
    ]));
    pontos.forEach((p, k) => p.setAttribute("aria-current", k === atual ? "step" : "false"));
    voltar.disabled = atual === 0;
    proximo.textContent = c.final ? "Entrar no site" : "Próximo →";
    proximo.focus({ preventScroll: true });
  }

  function lembrar() { try { localStorage.setItem(CHAVE, "1"); } catch { /* sem armazenamento: tudo bem */ } }
  function fechar() {
    lembrar();
    tela.classList.add("saindo");
    document.documentElement.classList.remove("ap-aberta");
    setTimeout(() => tela.remove(), 350);
    if (pedida) { const u = new URL(location.href); u.searchParams.delete("apresentacao"); history.replaceState(null, "", u); }
  }

  voltar.addEventListener("click", () => ir(atual - 1));
  proximo.addEventListener("click", () => (CENAS[atual].final ? fechar() : ir(atual + 1)));
  pular.addEventListener("click", fechar);
  tela.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowRight") ir(atual + 1);
    else if (ev.key === "ArrowLeft") ir(atual - 1);
    else if (ev.key === "Escape") fechar();
    else if (ev.key === "Tab") {   // o foco não sai da apresentação
      const f = [...tela.querySelectorAll("button:not(:disabled), a[href]")];
      if (ev.shiftKey && document.activeElement === f[0]) { ev.preventDefault(); f.at(-1).focus(); }
      else if (!ev.shiftKey && document.activeElement === f.at(-1)) { ev.preventDefault(); f[0].focus(); }
    }
  });
  // deslizar o dedo para os lados no celular
  let x0 = null;
  palco.addEventListener("pointerdown", (ev) => { x0 = ev.clientX; });
  palco.addEventListener("pointerup", (ev) => {
    if (x0 == null) return;
    const dx = ev.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) ir(atual + (dx < 0 ? 1 : -1));
  });

  document.documentElement.classList.add("ap-aberta");
  document.body.append(tela);
  ir(0);
})();
