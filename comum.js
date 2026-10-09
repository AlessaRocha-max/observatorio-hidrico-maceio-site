/* Observatório de Chuva de Maceió — peças usadas por todas as páginas (topo, rodapé, contas, dica).
   Os números vêm de window.DADOS (dados.js, gerado por gerar_site.py). */
(function () {
  "use strict";

  const D = window.DADOS;
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
    "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const NS = "http://www.w3.org/2000/svg";
  const INMET = "A303";

  // ------------------------------------------------------------------ desenho de elementos
  function el(tag, attrs = {}, pai) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
    if (pai) pai.appendChild(n);
    return n;
  }
  function h(tag, props = {}, filhos = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null) continue;
      if (k === "class") n.className = v; else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v; else n.setAttribute(k, v);
    }
    for (const f of [].concat(filhos)) if (f != null) n.append(f);
    return n;
  }
  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------------ números e datas
  const fmt = (n, casas = 0) =>
    n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const nomeMes = (p) => `${MESES[+p.slice(5, 7) - 1]}/${p.slice(0, 4)}`;
  const nomeMesLongo = (p) => `${MESES_LONGOS[+p.slice(5, 7) - 1]} de ${p.slice(0, 4)}`;
  const dataCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const dataLonga = (iso) => `${+iso.slice(8, 10)} de ${MESES_LONGOS[+iso.slice(5, 7) - 1]} de ${iso.slice(0, 4)}`;
  const anoMes = (a, m) => `${a}-${String(m).padStart(2, "0")}`;
  const mediana = (v) => {
    const s = [...v].sort((a, b) => a - b), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  function escalaBonita(max, passo) {
    const topo = Math.max(passo, Math.ceil(max / passo) * passo);
    return { topo, ticks: Array.from({ length: topo / passo + 1 }, (_, i) => i * passo) };
  }

  // ------------------------------------------------------------------ estações e séries
  const estacoes = D ? D.estacoes : [];
  const porId = Object.fromEntries(estacoes.map((e) => [e.id, e]));
  const medicao = estacoes.filter((e) => e.rede !== "OPEN-METEO");
  const cemaden = estacoes.filter((e) => e.rede === "CEMADEN");
  const anoInicial = D ? +D.primeiro_mes.slice(0, 4) : 0;
  const anoFinal = D ? +D.ultimo_mes.slice(0, 4) : 0;
  const anos = Array.from({ length: anoFinal - anoInicial + 1 }, (_, i) => anoInicial + i);
  const mesesDoAno = (a) => MESES.map((_, i) => anoMes(a, i + 1));
  const todosMeses = anos.flatMap(mesesDoAno).filter((p) => D && p >= D.primeiro_mes && p <= D.ultimo_mes);

  const STATUS = {
    ok: { cor: "var(--bom)", nome: "completo" },
    incompleto: { cor: "var(--atencao)", nome: "incompleto (menos de 90% dos dias)" },
    suspeito_zero: { cor: "var(--critico)", nome: "suspeito: zero o mês todo" },
    suspeito_baixo: { cor: "var(--critico)", nome: "suspeito: muito abaixo do esperado" },
  };
  const COR_REDE = { INMET: "var(--serie-inmet)", CEMADEN: "var(--serie-cemaden)", "OPEN-METEO": "var(--serie-om)" };

  /** Total de um mês numa estação, só se o mês estiver completo e coerente. */
  const totalOk = (id, p) => { const v = D.mensal[id]?.[p]; return v && v[3] === "ok" ? v[0] : null; };

  /** Mediana das estações do CEMADEN com o mês completo. */
  function medianaCemaden(p) {
    const vals = cemaden.map((e) => [e, totalOk(e.id, p)]).filter(([, v]) => v != null);
    if (!vals.length) return null;
    const tot = vals.map(([, v]) => v);
    const min = Math.min(...tot), max = Math.max(...tot);
    return { v: mediana(tot), n: vals.length, min, max,
      minNome: vals.find(([, v]) => v === min)[0].nome, maxNome: vals.find(([, v]) => v === max)[0].nome };
  }

  /** Séries que dá para escolher na página "Série histórica". */
  const SERIES = [
    { id: "COMBINADA", nome: "Maceió combinada (proposta)", curto: "Maceió combinada",
      desc: "INMET quando o mês está completo; nos meses em que o INMET falhou, a mediana das estações do CEMADEN.",
      proposta: true },
    { id: "A303", nome: "INMET A303 (UFAL) — estação oficial", curto: "INMET A303" },
    { id: "MEDIANA", nome: "Mediana das estações do CEMADEN", curto: "Mediana CEMADEN",
      desc: "Em cada mês, o valor do meio entre as estações do CEMADEN com o mês completo." },
    ...cemaden.map((e) => ({ id: e.id, nome: `CEMADEN — ${e.nome}`, curto: e.nome })),
  ];

  /** Valor de uma série num mês: { v, fonte, n?, status } (v = null quando não há total). */
  function valorSerie(serie, p) {
    if (serie === "MEDIANA" || serie === "COMBINADA") {
      if (serie === "COMBINADA") {
        const vi = totalOk(INMET, p);
        if (vi != null) return { v: vi, fonte: "INMET" };
      }
      const m = medianaCemaden(p);
      return m ? { v: m.v, fonte: "CEMADEN", n: m.n } : { v: null, fonte: null };
    }
    const bruto = D.mensal[serie]?.[p];
    const e = porId[serie];
    return { v: totalOk(serie, p), fonte: e ? e.rede : null, status: bruto ? bruto[3] : null, bruto };
  }

  /** Total do ano numa série: { total, meses, esperados, andamento, aviso, fontes }. */
  function anoSerie(serie, a) {
    const ps = mesesDoAno(a).filter((p) => p >= D.primeiro_mes && p <= D.ultimo_mes);
    const vals = ps.map((p) => valorSerie(serie, p));
    const comValor = vals.filter((x) => x.v != null);
    const andamento = a === anoFinal && ps.length < 12;
    const fontes = [...new Set(comValor.map((x) => x.fonte))];
    let total = null, cobertura, aviso = "";
    if (serie === "COMBINADA" || serie === "MEDIANA") {
      cobertura = ps.length ? (comValor.length / ps.length) * 100 : 0;
      if (comValor.length === ps.length && ps.length) total = comValor.reduce((s, x) => s + x.v, 0);
    } else {
      const an = D.anual[serie]?.[a];
      cobertura = an ? an[2] : 0;
      if (an && an[0] != null && !an[3]) total = an[0];
      else if (an && an[3] === "em_andamento" && comValor.length === ps.length) total = an[1];
      if (an && an[3] === "contem_suspeito") aviso = "suspeito";
    }
    const faltam = ps.filter((p, i) => vals[i].v == null);
    return { total, cobertura, andamento, faltam, aviso, fontes, n: ps.length };
  }

  /** Extremos (recordes) — de uma estação, ou de todas quando a série é composta. */
  function extremosDe(serie, anoDe = anoInicial, anoAte = anoFinal) {
    const ids = porId[serie] ? [serie] : medicao.map((e) => e.id);
    return D.extremos.filter((x) => ids.includes(x.id) && x.ano >= anoDe && x.ano <= anoAte);
  }

  // ------------------------------------------------------------------ dica (tooltip)
  let dica;
  function mostrarDica(evento, titulo, linhas, obs) {
    if (!dica) { dica = h("div", { class: "dica", role: "status" }); dica.hidden = true; document.body.append(dica); }
    dica.replaceChildren(h("div", { class: "titulo", text: titulo }));
    for (const l of linhas) {
      const chave = l.cor ? h("span", { class: "chave" }) : null;
      if (chave) chave.style.background = l.cor;
      dica.append(h("div", { class: "linha" }, [chave, h("strong", { text: l.valor }), h("span", { class: "sec", text: l.nome || "" })]));
    }
    if (obs) dica.append(h("div", { class: "obs", text: obs }));
    dica.hidden = false;
    let x, y;
    if (evento.clientX != null && evento.type !== "focus") { x = evento.clientX; y = evento.clientY; }
    else { const r = evento.target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top; }
    const w = dica.offsetWidth, hh = dica.offsetHeight;
    let left = x + 14, top = y - hh - 12;
    if (left + w > innerWidth - 8) left = x - w - 14;
    if (top < 8) top = y + 18;
    dica.style.left = Math.max(8, left) + "px";
    dica.style.top = top + "px";
  }
  const esconderDica = () => { if (dica) dica.hidden = true; };
  function comDica(alvo, montar) {
    const abrir = (e) => { const r = montar(); if (r) mostrarDica(e, ...r); };
    alvo.addEventListener("pointermove", abrir);
    alvo.addEventListener("focus", abrir);
    alvo.addEventListener("pointerleave", esconderDica);
    alvo.addEventListener("blur", esconderDica);
  }
  addEventListener("scroll", esconderDica, { passive: true });

  function legenda(alvo, itens) {
    (typeof alvo === "string" ? $(alvo) : alvo).replaceChildren(...itens.map(([tipo, cor, texto]) => {
      const c = h("span", { class: "chave " + tipo }); c.style.background = cor; c.style.borderColor = cor;
      return h("span", {}, [c, texto]);
    }));
  }
  const bolinha = (rede) => { const b = h("span", { class: "marca-rede" }); b.style.background = COR_REDE[rede]; return b; };

  /** Redesenha ao mudar a largura da janela. */
  function aoRedimensionar(alvo, desenhar) {
    let espera, largura = 0;
    new ResizeObserver(() => {
      if (alvo.clientWidth === largura) return;
      largura = alvo.clientWidth;
      clearTimeout(espera); espera = setTimeout(desenhar, 100);
    }).observe(alvo);
  }

  /** Arquivo para baixar, montado na hora (funciona com a página aberta do computador). */
  function baixarCSV(nome, linhas) {
    const texto = "﻿" + linhas.map((l) => l.map((c) => {
      const s = c == null ? "" : typeof c === "number" ? String(c).replace(".", ",") : String(c);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
    const a = h("a", { href: url, download: nome });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ------------------------------------------------------------------ topo e rodapé
  const PAGINAS = [
    ["inicio", "index.html", "Visão geral", '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
    ["monitoramento", "monitoramento.html", "Monitoramento", '<path d="M3 12h4l3-8 4 16 3-8h4"/>'],
    ["historico", "historico.html", "Série histórica", '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/>'],
    ["estacoes", "estacoes.html", "Estações", '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'],
    ["decisao", "decisao.html", "Apoio à decisão", '<path d="M4 6h10M4 12h7M4 18h4"/><path d="m14 15 2.5 2.5L21 12"/>'],
    ["sobre", "sobre.html", "Dados e método", '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'],
  ];
  const icone = (caminho) => `<svg viewBox="0 0 24 24" aria-hidden="true">${caminho}</svg>`;
  const GOTA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c-.3 0-.6.2-.8.4C9.6 5 5 11 5 14.8A7 7 0 0 0 19 14.8C19 11 14.4 5 12.8 2.9a1 1 0 0 0-.8-.4z"/></svg>';
  const marca = () => h("a", { class: "marca", href: "index.html" }, [
    h("span", { class: "marca-icone", html: GOTA }),
    h("span", {}, [h("strong", { text: "Observatório de Chuva" }), h("small", { text: "MACEIÓ • ALAGOAS" })]),
  ]);

  /** Monta a barra lateral, a faixa azul do topo e o rodapé em volta do <main> da página. */
  function montarTopo() {
    const pagina = document.body.dataset.pagina;
    const main = document.querySelector("main");

    const recolher = h("button", { type: "button", class: "recolher", title: "Recolher o menu", "aria-label": "Recolher o menu",
      html: icone('<path d="M15 6l-6 6 6 6"/>') + "<span>Recolher menu</span>" });
    const guardado = (() => { try { return localStorage.getItem("menu-recolhido") === "1"; } catch { return false; } })();
    const recolhido = (sim) => {
      document.body.classList.toggle("lateral-recolhida", sim);
      recolher.title = sim ? "Abrir o menu" : "Recolher o menu";
      recolher.setAttribute("aria-label", recolher.title);
      try { localStorage.setItem("menu-recolhido", sim ? "1" : "0"); } catch { /* sem armazenamento: tudo bem */ }
    };
    if (guardado) recolhido(true);
    recolher.addEventListener("click", () => recolhido(!document.body.classList.contains("lateral-recolhida")));
    const lateral = h("aside", { class: "lateral", id: "lateral", "aria-label": "Menu" }, [
      marca(),
      h("a", { class: "botao-destaque", href: "sobre.html#baixar",
        html: icone('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>') + "<span>Baixar os dados</span>" }),
      h("nav", { class: "menu-lateral", "aria-label": "Páginas" }, PAGINAS.map(([id, href, nome, ic]) =>
        h("a", { href, title: nome, "aria-current": id === pagina ? "page" : null, html: icone(ic) + `<span>${nome}</span>` }))),
      recolher,
      h("div", { class: "lateral-pe" }, [
        D ? h("div", { class: "situacao-dados" }, [h("span", { class: "ponto-status" }),
          h("div", {}, [h("strong", { text: `Dados até ${nomeMes(D.ultimo_mes)}` }), h("small", { text: `gerado em ${D.gerado_em.slice(0, 10)}` })])]) : null,
        h("p", { class: "emergencia-lateral" }, [h("strong", { text: "Emergência: 199" }), h("br"), "Defesa Civil de Maceió"]),
      ]),
    ]);

    const abrir = h("button", { type: "button", class: "abrir-menu", "aria-controls": "lateral", "aria-expanded": "false",
      "aria-label": "Abrir o menu", html: icone('<path d="M4 6h16M4 12h16M4 18h16"/>') });
    const sombra = h("div", { class: "sombra-menu" });
    const alternar = (aberto) => {
      document.body.classList.toggle("menu-aberto", aberto);
      abrir.setAttribute("aria-expanded", String(aberto));
    };
    abrir.addEventListener("click", () => alternar(!document.body.classList.contains("menu-aberto")));
    sombra.addEventListener("click", () => alternar(false));
    addEventListener("keydown", (e) => { if (e.key === "Escape") alternar(false); });

    const cabecalho = main ? main.querySelector(".cabecalho") : null;
    const faixa = h("header", { class: "faixa-topo" }, h("div", { class: "largura" }, [
      h("div", { class: "faixa-movel" }, [abrir, marca()]),
      cabecalho,
    ]));

    const rodape = h("footer", { class: "rodape" }, h("div", { class: "largura" }, [
      h("div", { class: "colunas" }, [
        h("div", {}, [h("h3", { text: "Fontes" }), h("ul", {}, [
          h("li", { text: "INMET — estação automática A303 (UFAL)" }),
          h("li", { text: "CEMADEN — 13 pluviômetros em Maceió" }),
          h("li", { text: "Open-Meteo — só para comparação (modelo)" })])]),
        h("div", {}, [h("h3", { text: "Páginas" }), h("ul", {}, PAGINAS.map(([, href, nome]) => h("li", {}, h("a", { href, text: nome }))))]),
        h("div", { class: "emergencia" }, [h("h3", { text: "Emergência" }),
          h("p", { text: "Em caso de emergência, ligue para a Defesa Civil: 199." })]),
      ]),
      h("p", { class: "aviso" }, [h("strong", { text: "Aviso: " }),
        "versão preliminar, em validação pela equipe. Este site organiza dados de chuva já medidos; não emite alertas. " +
        "Alertas e ordens de evacuação são da Defesa Civil de Maceió (199)."]),
      h("div", { class: "final" }, [
        h("span", { text: "Observatório de Segurança Hídrica de Maceió · Projeto PIBITI PVFE4749-2026" }),
        h("span", { text: "UFAL · INMET · CEMADEN" })]),
    ]));

    const painel = h("div", { class: "painel" }, [main, rodape]);
    const principal = h("div", { class: "principal" }, [faixa, painel]);
    document.body.prepend(lateral, sombra, principal);
  }
  montarTopo();

  // ------------------------------------------------------------------ movimento suave
  const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // troca de página: o conteúdo some suavemente antes de abrir a próxima
  document.addEventListener("click", (ev) => {
    const a = ev.target.closest("a[href]");
    if (!a || semMovimento || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const destino = new URL(a.href, location.href);
    const mesmaPagina = destino.pathname === location.pathname && destino.search === location.search;
    if (!/\.html$/.test(destino.pathname) || destino.protocol !== location.protocol || mesmaPagina) return;
    ev.preventDefault();
    document.body.classList.add("saindo");
    setTimeout(() => { location.href = destino.href; }, 200);
  });
  // ao voltar pelo botão "voltar" do navegador, a página precisa reaparecer
  addEventListener("pageshow", () => document.body.classList.remove("saindo"));

  // onda de luz saindo do ponto do clique
  const COM_ONDA = ".botao, .botao-destaque, .chips button, .segmentos button, .menu-lateral a, .icone-botao, .baixar a";
  document.addEventListener("pointerdown", (ev) => {
    const alvo = ev.target.closest(COM_ONDA);
    if (!alvo || semMovimento) return;
    const r = alvo.getBoundingClientRect();
    const tam = Math.max(r.width, r.height) * 2.2;
    const onda = h("span", { class: "onda" });
    Object.assign(onda.style, { width: `${tam}px`, height: `${tam}px`, left: `${ev.clientX - r.left}px`, top: `${ev.clientY - r.top}px` });
    alvo.append(onda);
    onda.addEventListener("animationend", () => onda.remove());
  });

  if (!D) {
    const m = document.querySelector("main");
    if (m) m.replaceChildren(h("p", { class: "cabecalho", text: "Não encontrei os dados (dados.js). Rode: py gerar_site.py" }));
  }

  window.OBS = {
    D, MESES, MESES_LONGOS, INMET, STATUS, COR_REDE, SERIES,
    el, h, $, fmt, nomeMes, nomeMesLongo, dataCurta, dataLonga, anoMes, mediana, escalaBonita,
    estacoes, porId, medicao, cemaden, anoInicial, anoFinal, anos, mesesDoAno, todosMeses,
    totalOk, medianaCemaden, valorSerie, anoSerie, extremosDe,
    comDica, mostrarDica, esconderDica, legenda, bolinha, aoRedimensionar, baixarCSV,
  };
})();
