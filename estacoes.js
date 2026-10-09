/* Página "Estações": mapa, tabela das estações, extremos e qualidade. */
(function () {
  "use strict";
  const O = window.OBS, D = O.D;
  if (!D) return;
  const { h, el, $, fmt, nomeMes, MESES } = O;

  const anoValido = (id, a) => { const v = D.anual[id]?.[a]; return v && v[0] != null && !v[3] ? v[0] : null; };
  function resumoEstacao(e) {
    const ps = Object.keys(D.mensal[e.id] || {}).sort();
    const ok = Object.values(D.mensal[e.id] || {}).filter((v) => v[3] === "ok").length;
    return { de: ps[0], ate: ps.at(-1), ok };
  }

  O.legenda("legenda-rede", [["ponto", O.COR_REDE.INMET, "INMET"], ["ponto", O.COR_REDE.CEMADEN, "CEMADEN"],
    ["ponto", O.COR_REDE["OPEN-METEO"], "Open-Meteo (modelo)"]]);

  // ------------------------------------------------------------------ tabela das estações
  (function tabelaEstacoes() {
    const cab = h("tr", {}, [h("th", { text: "Estação" }), h("th", { text: "Dados" }), h("th", { class: "num", text: "Meses ok" }), h("th", { text: "" })]);
    const linhas = O.estacoes.map((e) => {
      const r = resumoEstacao(e);
      return h("tr", {}, [
        h("td", {}, [O.bolinha(e.rede), e.nome, h("div", { class: "sec", text: e.rede === "OPEN-METEO" ? "modelo (estimativa)" : `${e.rede} ${e.id}` })]),
        h("td", { text: `${nomeMes(r.de)} a ${nomeMes(r.ate)}` }),
        h("td", { class: "num", text: e.rede === "OPEN-METEO" ? "—" : `${r.ok}` }),
        h("td", {}, e.rede === "OPEN-METEO" ? null : h("a", { href: `historico.html?serie=${e.id}`, text: "série →" })),
      ]);
    });
    $("tabela-estacoes").replaceChildren(h("thead", {}, cab), h("tbody", {}, linhas));
  })();

  // ------------------------------------------------------------------ mapa
  (function mapa() {
    const caixa = $("mapa");
    if (!window.L) {
      caixa.classList.add("mapa-falhou");
      caixa.textContent = "O mapa precisa de internet para carregar. A lista das estações está ao lado.";
      return;
    }
    const m = L.map(caixa, { scrollWheelZoom: false, zoomSnap: 0.25 });
    // Esri: aceita a página aberta direto do computador (os servidores do OSM e da CARTO recusam)
    const escuro = getComputedStyle(document.documentElement).colorScheme === "dark";
    const base = escuro ? "Canvas/World_Dark_Gray_Base" : "Canvas/World_Light_Gray_Base";
    L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${base}/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 16, attribution: "Mapa base &copy; Esri, HERE, Garmin, &copy; colaboradores do OpenStreetMap" }).addTo(m);
    L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${base.replace("Base", "Reference")}/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 16 }).addTo(m);
    const cores = getComputedStyle(document.documentElement);
    const limites = [];
    for (const e of O.estacoes) {
      if (e.lat == null) continue;
      const cor = cores.getPropertyValue({ INMET: "--serie-inmet", CEMADEN: "--serie-cemaden", "OPEN-METEO": "--serie-om" }[e.rede]).trim();
      const ponto = L.circleMarker([e.lat, e.lon], {
        radius: e.rede === "INMET" ? 9 : 7, color: "#ffffff", weight: 2, fillColor: cor,
        fillOpacity: e.rede === "OPEN-METEO" ? 0.5 : 1, dashArray: e.rede === "OPEN-METEO" ? "3 3" : null,
      }).addTo(m);
      const r = resumoEstacao(e);
      const ult = [...O.anos].reverse().find((a) => anoValido(e.id, a) != null);
      ponto.bindPopup(h("div", {}, [h("strong", { text: e.nome }), h("br"),
        e.rede === "OPEN-METEO" ? "Ponto de modelo (estimativa)" : `${e.rede} ${e.id}`, h("br"),
        `Dados de ${nomeMes(r.de)} a ${nomeMes(r.ate)}`,
        ult ? h("br") : null, ult ? `Total de ${ult}: ${fmt(anoValido(e.id, ult))} mm` : null,
        e.rede === "OPEN-METEO" ? null : h("br"),
        e.rede === "OPEN-METEO" ? null : h("a", { href: `historico.html?serie=${e.id}`, text: "Ver a série →" })].filter(Boolean)));
      ponto.bindTooltip(e.nome);
      limites.push([e.lat, e.lon]);
    }
    if (limites.length) m.fitBounds(limites, { padding: [24, 24] });
  })();

  // ------------------------------------------------------------------ extremos
  (function tabelaExtremos() {
    const melhor = (lista, campo) => lista.reduce((a, b) => ((b[campo] ?? -1) > (a?.[campo] ?? -1) ? b : a), null);
    const cel = (r, campo, quando) => r && r[campo] != null
      ? h("td", { class: "num" }, [h("strong", { text: `${fmt(r[campo], 1)} mm` }), h("div", { class: "sec", text: `${O.porId[r.id].nome} · ${r[quando]}` })])
      : h("td", { class: "num", text: "—" });
    const cab = h("tr", {}, [h("th", { text: "Ano" }), h("th", { class: "num", text: "Em 1 hora" }),
      h("th", { class: "num", text: "Em 1 dia" }), h("th", { class: "num", text: "Em 72 horas" }),
      h("th", { class: "num", text: "Dias com 50 mm ou mais" })]);
    const linhas = O.anos.map((a) => {
      const doAno = D.extremos.filter((x) => x.ano === a);
      const d50 = melhor(doAno, "dias_50");
      return h("tr", {}, [h("td", {}, h("strong", { text: a === O.anoFinal ? `${a} (até ${MESES[+D.ultimo_mes.slice(5) - 1]})` : String(a) })),
        cel(melhor(doAno, "max_1h"), "max_1h", "quando_1h"),
        cel(melhor(doAno, "max_dia"), "max_dia", "quando_dia"),
        cel(melhor(doAno, "max_72h"), "max_72h", "quando_72h"),
        d50 ? h("td", { class: "num" }, [h("strong", { text: String(d50.dias_50) }), h("div", { class: "sec", text: `na estação ${O.porId[d50.id].nome}` })])
          : h("td", { class: "num", text: "—" })]);
    });
    $("tabela-extremos").replaceChildren(h("thead", {}, cab), h("tbody", {}, linhas));
  })();

  // ------------------------------------------------------------------ qualidade
  (function qualidade() {
    const meses = O.todosMeses;
    const cw = 10, ch = 18, gap = 2, esq = 170, topo = 22;
    const W = esq + meses.length * (cw + gap) + 8, H = topo + O.medicao.length * (ch + gap) + 4;
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img",
      "aria-label": "Qualidade dos dados: um quadrado por mês e por estação" });
    meses.forEach((p, j) => {
      if (p.endsWith("-01")) el("text", { x: esq + j * (cw + gap), y: 14, class: "eixo-texto" }, svg).textContent = p.slice(0, 4);
    });
    O.medicao.forEach((e, i) => {
      const yy = topo + i * (ch + gap);
      el("text", { x: esq - 10, y: yy + ch - 5, "text-anchor": "end", class: "eixo-texto" }, svg).textContent = e.nome;
      meses.forEach((p, j) => {
        const v = D.mensal[e.id]?.[p];
        const r = el("rect", { x: esq + j * (cw + gap), y: yy, width: cw, height: ch, rx: 2, class: "celula", tabindex: 0,
          style: `fill: ${v ? O.STATUS[v[3]].cor : "var(--vazio)"}` }, svg);
        O.comDica(r, () => {
          if (!v) return [`${e.nome} · ${nomeMes(p)}`, [{ valor: "sem dado", nome: "" }]];
          const linhas = [{ cor: O.STATUS[v[3]].cor, valor: O.STATUS[v[3]].nome, nome: "" }];
          linhas.push({ valor: v[0] != null ? `${fmt(v[0], 1)} mm` : `${fmt(v[1], 1)} mm`, nome: v[0] != null ? "no mês" : "soma parcial (não é o total)" });
          if (v[2] != null) linhas.push({ valor: `${fmt(v[2])}%`, nome: "dos dias medidos" });
          return [`${e.nome} · ${nomeMes(p)}`, linhas];
        });
      });
    });
    $("grafico-qualidade").replaceChildren(svg);
    O.legenda("legenda-qualidade", [["", "var(--bom)", "completo e coerente"], ["", "var(--atencao)", "incompleto"],
      ["", "var(--critico)", "suspeito"], ["", "var(--vazio)", "sem dado"]]);
  })();
})();
