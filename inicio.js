/* Página inicial (Visão geral). */
(function () {
  "use strict";
  const O = window.OBS, D = O.D;
  if (!D) return;
  const { h, el, $, fmt, nomeMes, nomeMesLongo, dataCurta, dataLonga, mediana } = O;

  const mes = D.ultimo_mes;                     // último mês com dados
  const nomeDoMes = O.MESES_LONGOS[+mes.slice(5) - 1];
  const doMes = (iso) => iso.startsWith(mes);

  // ------------------------------------------------------------------ números do projeto
  (function numeros() {
    const ICONES = {
      ano: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
      gota: '<path d="M12 3c-3 4.5-6 7.6-6 11a6 6 0 0 0 12 0c0-3.4-3-6.5-6-11z"/>',
      mes: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    };
    const cobertos = O.todosMeses.filter((p) => O.medicao.some((e) => O.totalOk(e.id, p) != null));
    const itens = [
      ["ano", O.anos.length, "anos de dados", `${O.anoInicial} a ${O.anoFinal}`],
      ["gota", O.medicao.length, "pluviômetros", `${O.cemaden.length} do CEMADEN e 1 do INMET`],
      ["mes", O.todosMeses.length, "meses verificados", `${cobertos.length} com medição completa`],
    ];
    $("numeros").replaceChildren(...itens.map(([ic, n, rot, dica]) =>
      h("li", { title: dica }, [h("span", { class: "chip-icone", html: `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[ic]}</svg>` }),
        h("strong", { text: fmt(n) }), ` ${rot}`])));
  })();

  // ------------------------------------------------------------------ dia a dia (dados.js → diario)
  const porDia = {};                            // "2026-09-03" -> [{ e, v, a72 }]
  for (const [id, lista] of Object.entries(D.diario || {})) {
    for (const [dia, v, a72] of lista) (porDia[dia] ||= []).push({ e: O.porId[id], v, a72 });
  }
  const dias = Object.keys(porDia).sort();
  const maiorDoMes = (campo, id) => {
    let melhor = null;
    for (const d of dias.filter(doMes)) for (const x of porDia[d]) {
      if (id && x.e.id !== id) continue;
      if (x[campo] != null && (!melhor || x[campo] > melhor.valor)) melhor = { valor: x[campo], dia: d, e: x.e };
    }
    return melhor;
  };
  const medianaDia = (d) => { const v = (porDia[d] || []).map((x) => x.v).filter((x) => x != null); return v.length ? mediana(v) : null; };

  // ------------------------------------------------------------------ síntese do último mês
  (function sintese() {
    const m = O.medianaCemaden(mes);
    const inmet = O.totalOk(O.INMET, mes);
    if (!m) { $("sintese-valor").textContent = "—"; return; }
    $("sintese-valor").replaceChildren(fmt(m.v), h("small", { text: "mm" }));
    $("sintese-desc").textContent = `Chuva típica em Maceió em ${nomeMesLongo(mes)}`;
    // comparação com o mesmo mês dos anos anteriores (série combinada)
    const antes = O.anos.filter((a) => a < +mes.slice(0, 4))
      .map((a) => O.valorSerie("COMBINADA", O.anoMes(a, +mes.slice(5))).v).filter((v) => v != null);
    if (antes.length >= 3) {
      const media = antes.reduce((s, v) => s + v, 0) / antes.length;
      const dif = Math.round((m.v / media - 1) * 100);
      $("sintese-comparacao").textContent = Math.abs(dif) < 5
        ? `Perto da média de ${nomeDoMes} dos anos anteriores (${fmt(media)} mm, ${antes.length} anos).`
        : `${fmt(Math.abs(dif))}% ${dif > 0 ? "acima" : "abaixo"} da média de ${nomeDoMes} dos anos anteriores (${fmt(media)} mm, ${antes.length} anos).`;
    }
    $("sintese-par").replaceChildren(
      h("div", {}, [h("p", { class: "rotulo", text: "Mais chuva no mês" }), h("strong", { text: m.maxNome }),
        h("span", { class: "sec", text: `${fmt(m.max, 1)} mm · CEMADEN` })]),
      h("div", {}, [h("p", { class: "rotulo", text: "Menos chuva no mês" }), h("strong", { text: m.minNome }),
        h("span", { class: "sec", text: `${fmt(m.min, 1)} mm · CEMADEN` })]));
    $("sintese-nota").textContent = `Mediana das ${m.n} estações do CEMADEN com o mês completo` +
      (inmet != null ? `; o INMET A303 marcou ${fmt(inmet, 1)} mm.` : `. O INMET ainda não publicou ${nomeDoMes}.`) +
      " Estações com o mês incompleto ou suspeito ficam de fora.";
  })();

  // ------------------------------------------------------------------ cartões pequenos com faísca
  function faisca(valores, destaque) {
    const W = 120, H = 36, max = Math.max(1, ...valores.map((v) => v ?? 0));
    const svg = el("svg", { class: "faisca", viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" });
    const bw = W / valores.length;
    valores.forEach((v, i) => {
      if (v == null) return;
      const alt = Math.max(1, (v / max) * (H - 2));
      el("rect", { x: i * bw + .5, y: H - alt, width: Math.max(1, bw - 1), height: alt, rx: 1,
        style: `fill: ${i === destaque ? "var(--primaria)" : "var(--seq-2)"}` }, svg);
    });
    return svg;
  }
  (function mini() {
    const diasMes = dias.filter(doMes);
    const cartoes = [
      ["Maior chuva em um dia", maiorDoMes("v"), "v"],
      ["Maior chuva em 72 horas", maiorDoMes("a72"), "a72"],
    ].filter(([, x]) => x).map(([rot, x, campo]) => {
      const serie = diasMes.map((d) => campo === "v" ? medianaDia(d)
        : (porDia[d].find((y) => y.e.id === x.e.id) || {}).a72 ?? null);
      return h("div", { class: "cartao" }, [
        h("div", {}, [h("p", { class: "rotulo", text: `${rot} · ${nomeMes(mes)}` }),
          h("p", { class: "valor" }, [fmt(x.valor, 1), h("small", { text: "mm" })])]),
        faisca(serie, diasMes.indexOf(x.dia)),
        h("p", { class: "sec", text: `${x.e.nome}, ${campo === "v" ? "em" : "terminando em"} ${dataLonga(x.dia)}` }),
      ]);
    });
    $("mini").replaceChildren(...cartoes);
  })();

  // ------------------------------------------------------------------ mapa
  const FAIXAS = [[50, "#e8f0fc"], [150, "#b9d2f6"], [250, "#78a9ec"], [350, "#2f74d6"], [Infinity, "#163f85"]];
  const corDoTotal = (v) => (v == null ? "#5b6577" : FAIXAS.find(([lim]) => v < lim)[1]);
  const marcadores = {};
  let mapa = null, selecionada = null;

  function infoEstacao(e) {
    const bruto = D.mensal[e.id]?.[mes];
    const total = O.totalOk(e.id, mes);
    return { bruto, total, status: bruto ? bruto[3] : null,
      dia: maiorDoMes("v", e.id), a72: maiorDoMes("a72", e.id) };
  }

  function rotuloMapa(e, comNome) {
    const t = O.totalOk(e.id, mes);
    const v = t != null ? `${fmt(t)} mm` : "sem total no mês";
    return comNome ? `${e.nome}: ${v}` : v;
  }

  function mostrarPainel(e) {
    selecionada = e;
    const i = infoEstacao(e);
    const pilula = !i.bruto ? h("span", { class: "pilula critico", text: O.semDadoPorque(e, mes).curto, title: O.semDadoPorque(e, mes).longo })
      : i.status === "ok" ? h("span", { class: "pilula ok", text: "mês completo" })
      : i.status === "incompleto" ? h("span", { class: "pilula parcial", text: `incompleto (${fmt(i.bruto[2])}% dos dias)` })
      : h("span", { class: "pilula critico", text: "mês suspeito" });
    const total = i.total != null ? fmt(i.total, 1) : i.bruto && i.status === "incompleto" ? `${fmt(i.bruto[1], 1)}*` : "—";
    $("painel").replaceChildren(...[
      h("p", { class: "rotulo", text: "Estação selecionada" }),
      h("h3", { text: e.nome }),
      h("p", { class: "tipo", text: e.rede === "INMET" ? "Estação meteorológica automática · INMET A303" : `Pluviômetro automático · CEMADEN ${e.id}` }),
      pilula,
      h("div", { class: "par", style: "margin-top:.75rem" }, [
        h("div", {}, [h("span", { class: "sec", text: `Total em ${nomeMes(mes)}` }), h("strong", {}, [total, h("small", { text: " mm" })])]),
        h("div", {}, [h("span", { class: "sec", text: "Maior em 1 dia" }), h("strong", {}, [i.dia ? fmt(i.dia.valor, 1) : "—", h("small", { text: " mm" })])]),
      ]),
      i.dia ? h("p", { class: "nota", text: `Dia mais chuvoso: ${dataLonga(i.dia.dia)}.` + (i.a72 ? ` Maior em 72 h: ${fmt(i.a72.valor, 1)} mm.` : "") }) : null,
      i.status === "incompleto" ? h("p", { class: "nota", text: "* soma dos dias medidos, não é o total do mês." }) : null,
      h("a", { class: "botao", href: `historico.html?serie=${encodeURIComponent(e.id)}`, text: "Ver a série desta estação →" }),
    ].filter(Boolean));
    for (const [id, m] of Object.entries(marcadores)) {
      m.setStyle({ weight: id === e.id ? 4 : 2, color: id === e.id ? "#f0b43c" : "#ffffff" });
      m.setTooltipContent(rotuloMapa(O.porId[id], id === e.id));
      if (id === e.id) m.bringToFront();
    }
    const sel = $("escolha-estacao");
    if (sel && sel.value !== e.id && sel.options.length) { sel.value = e.id; $("ver-serie").href = `historico.html?serie=${encodeURIComponent(e.id)}`; }
  }

  (function montarMapa() {
    $("mapa-mes").textContent = nomeMesLongo(mes);
    const caixa = $("mapa");
    const comLugar = O.medicao.filter((e) => e.lat != null);
    // estação inicial: a que mais choveu no mês
    const inicial = comLugar.reduce((a, b) => ((O.totalOk(b.id, mes) ?? -1) > (O.totalOk(a.id, mes) ?? -1) ? b : a), comLugar[0]);
    if (!window.L) {
      caixa.classList.add("mapa-falhou");
      caixa.style.color = "#b8cbe6";
      caixa.textContent = "O mapa precisa de internet para carregar. Use a busca acima para escolher uma estação.";
      mostrarPainel(inicial);
      return;
    }
    mapa = L.map(caixa, { scrollWheelZoom: false, zoomControl: true, zoomSnap: 0.25 });
    // Esri: aceita a página aberta direto do computador (os servidores do OSM e da CARTO recusam)
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 16, attribution: "Mapa base &copy; Esri, HERE, Garmin, &copy; colaboradores do OpenStreetMap" }).addTo(mapa);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 16 }).addTo(mapa);
    for (const e of comLugar) {
      const i = infoEstacao(e);
      const vizinhaAntes = comLugar.find((o) => o !== e && o.nome < e.nome && Math.hypot(o.lat - e.lat, o.lon - e.lon) < 0.02);
      const m = L.circleMarker([e.lat, e.lon], {
        radius: e.rede === "INMET" ? 9 : 8, color: "#ffffff", weight: 2,
        fillColor: corDoTotal(i.total), fillOpacity: 1, dashArray: i.total == null ? "3 3" : null,
      }).addTo(mapa);
      m.bindTooltip(rotuloMapa(e, false), {
        permanent: i.total != null, direction: vizinhaAntes ? "left" : "right", offset: [vizinhaAntes ? -8 : 8, 0], className: "rotulo-mapa" });
      m.on("click", () => mostrarPainel(e));
      m.on("mouseover", () => m.setTooltipContent(rotuloMapa(e, true)));
      m.on("mouseout", () => m.setTooltipContent(rotuloMapa(e, e === selecionada)));
      marcadores[e.id] = m;
    }
    mapa.fitBounds(comLugar.map((e) => [e.lat, e.lon]), { paddingTopLeft: [20, 20], paddingBottomRight: [innerWidth > 600 ? 290 : 20, 20] });
    mostrarPainel(inicial);
  })();

  O.legenda("legenda-mapa", [
    ...O.FAIXAS_MES.map(([, nome, txt], i) => ["ponto", FAIXAS[i][1], `${nome} (${txt} mm)`]),
    ["ponto", "#5b6577", "sem total no mês"],
  ]);

  // ------------------------------------------------------------------ "Qual estação você quer ver?"
  (function escolha() {
    const lista = [...O.medicao].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const sel = $("escolha-estacao");
    const m = O.medianaCemaden(mes);
    const maisChuva = m ? O.cemaden.find((e) => e.nome === m.maxNome) : lista[0];
    sel.replaceChildren(...lista.map((e) => h("option", { value: e.id,
      text: `${e.nome}${e === maisChuva ? ` — mais chuva em ${nomeMes(mes)}` : ""}` })));
    sel.value = (selecionada || maisChuva).id;
    const atualizar = () => { $("ver-serie").href = `historico.html?serie=${encodeURIComponent(sel.value)}`; };
    sel.addEventListener("change", () => { mostrarPainel(O.porId[sel.value]); atualizar(); });
    $("ver-no-mapa").addEventListener("click", () => {
      const e = O.porId[sel.value];
      mostrarPainel(e);
      if (mapa && e.lat != null) mapa.panTo([e.lat, e.lon]);
      $("mapa-secao").scrollIntoView({ block: "start" });
    });
    atualizar();
  })();

  // ------------------------------------------------------------------ estações monitoradas
  (function monitoradas() {
    const lista = [...O.medicao].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const ok = lista.filter((e) => D.mensal[e.id]?.[mes]?.[3] === "ok").length;
    $("texto-monitoradas").textContent = `${lista.length} pluviômetros automáticos dentro de Maceió. ` +
      `Em ${nomeMesLongo(mes)}, ${ok} tiveram o mês completo.`;
    $("monitoradas").replaceChildren(...lista.map((e) => {
      const ps = Object.keys(D.mensal[e.id] || {}).sort();
      const b = D.mensal[e.id]?.[mes];
      const porque = O.semDadoPorque(e, mes);
      const pil = !b ? h("span", { class: `pilula ${porque.curto.startsWith("parou") ? "critico" : "sem-ponto"}`, text: porque.curto, title: porque.longo })
        : b[3] === "ok" ? h("span", { class: "pilula ok", text: `${fmt(b[0])} mm em ${O.MESES[+mes.slice(5) - 1]}` })
        : b[3] === "incompleto" ? h("span", { class: "pilula parcial", text: "mês incompleto" })
        : h("span", { class: "pilula critico", text: "mês suspeito" });
      return h("a", { class: "cartao estacao-item", href: `historico.html?serie=${encodeURIComponent(e.id)}` }, [
        h("span", { class: `rede-selo ${e.rede.toLowerCase()}`, text: e.rede }),
        h("h3", { text: e.nome }),
        h("p", { class: "nota", style: "margin:0", text: porque?.curto.startsWith("parou")
          ? `Mediu de ${nomeMes(ps[0])} a ${nomeMes(ps.at(-1))}` : `Mede desde ${nomeMes(ps[0])}` }),
        pil,
      ]);
    }));
  })();

  // ------------------------------------------------------------------ gráfico dia a dia
  const REFS = [[30, "var(--atencao)", "30 mm"], [50, "var(--serie-cemaden)", "50 mm"], [100, "var(--critico)", "100 mm"]];
  const caixaDia = $("grafico-diario");
  const ultimos = dias.slice(-30);
  if (ultimos.length) {
    $("diario-texto").textContent = `De ${dataLonga(ultimos[0])} a ${dataLonga(ultimos.at(-1))}. Cada barra é a chuva típica do dia ` +
      `(mediana das estações com o dia completo).`;
  }

  function desenharDiario() {
    if (!ultimos.length) { caixaDia.textContent = "Sem dados diários."; return; }
    const W = Math.max(320, caixaDia.clientWidth), H = 260;
    const m = { t: 26, r: 44, b: 28, l: 36 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const dados = ultimos.map((d) => ({ d, v: medianaDia(d), lista: (porDia[d] || []).filter((x) => x.v != null) }));
    const maxV = Math.max(...dados.map((x) => x.v ?? 0));
    const { topo, ticks } = O.escalaBonita(Math.max(maxV * 1.15, 10), maxV > 60 ? 25 : maxV > 25 ? 10 : 5);
    // linhas de 30, 50 e 100 mm só aparecem quando a escala chega nelas
    const refsVisiveis = REFS.filter(([v]) => v <= topo);
    O.legenda("legenda-diario", [["", "var(--seq-3)", "chuva típica do dia"], ...refsVisiveis.map(([, cor, t]) => ["linha", cor, t])]);
    // (com o index.html antigo no cache do navegador, o espaço da nota pode não existir)
    if ($("nota-diario")) $("nota-diario").textContent = refsVisiveis.length
      ? "As linhas tracejadas marcam chuva forte em um dia — só referências, não são níveis de alerta."
      : `O dia mais chuvoso teve ${fmt(maxV, 1)} mm na cidade — as referências de chuva forte (30, 50 e 100 mm) ficam fora da escala.`;
    const y = (v) => m.t + ih - (Math.min(v, topo) / topo) * ih;
    const banda = iw / dados.length;
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img",
      "aria-label": "Chuva típica por dia nos últimos 30 dias com dados" });
    for (const t of ticks) {
      el("line", { x1: m.l, x2: m.l + iw, y1: y(t), y2: y(t), class: t ? "linha-grade" : "linha-base" }, svg);
      el("text", { x: m.l - 6, y: y(t) + 4, "text-anchor": "end", class: "eixo-texto" }, svg).textContent = fmt(t);
    }
    el("text", { x: m.l - 6, y: m.t - 14, "text-anchor": "end", class: "eixo-texto" }, svg).textContent = "mm";
    for (const [v, cor, t] of REFS) {
      if (v > topo) continue;
      el("line", { x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v), class: "linha-ref", style: `stroke: ${cor}` }, svg);
      el("text", { x: m.l + iw + 4, y: y(v) + 4, class: "eixo-texto" }, svg).textContent = t;
    }
    const pico = dados.reduce((a, b) => ((b.v ?? -1) > (a.v ?? -1) ? b : a));
    const larg = Math.max(2, Math.min(18, banda - 3));
    const cadaQuantos = banda < 40 ? (banda < 14 ? 7 : 3) : 1;
    dados.forEach((x, i) => {
      const cx = m.l + banda * i + banda / 2;
      if (i % cadaQuantos === 0 || i === dados.length - 1)
        el("text", { x: cx, y: H - 8, "text-anchor": "middle", class: "eixo-texto" }, svg).textContent = dataCurta(x.d);
      if (x.v != null && x.v > 0) {
        const y1 = y(x.v), y0 = m.t + ih, r = Math.min(3, (y0 - y1) / 2, larg / 2);
        el("path", { d: `M${cx - larg / 2},${y0} V${y1 + r} Q${cx - larg / 2},${y1} ${cx - larg / 2 + r},${y1} H${cx + larg / 2 - r} Q${cx + larg / 2},${y1} ${cx + larg / 2},${y1 + r} V${y0} Z`,
          style: `fill: ${x === pico ? "var(--seq-4)" : "var(--seq-3)"}` }, svg);
        if (x === pico) el("text", { x: cx, y: y1 - 6, "text-anchor": "middle", class: "rotulo-dado" }, svg).textContent = `${fmt(x.v, 1)} mm`;
      }
      const alvo = el("rect", { x: m.l + banda * i, y: m.t, width: banda, height: ih, class: "alvo", tabindex: 0,
        "aria-label": `${dataLonga(x.d)}: ${x.v != null ? fmt(x.v, 1) + " mm" : "sem dado"}` }, svg);
      O.comDica(alvo, () => {
        if (!x.lista.length) return [dataLonga(x.d), [{ valor: "sem dado", nome: "nenhuma estação com o dia completo" }]];
        const ord = [...x.lista].sort((a, b) => b.v - a.v);
        return [dataLonga(x.d), [
          { cor: "var(--seq-3)", valor: `${fmt(x.v, 1)} mm`, nome: `típica (${x.lista.length} estações)` },
          { valor: `${fmt(ord[0].v, 1)} mm`, nome: `maior: ${ord[0].e.nome}` },
          { valor: `${fmt(ord.at(-1).v, 1)} mm`, nome: `menor: ${ord.at(-1).e.nome}` }]];
      });
    });
    caixaDia.replaceChildren(svg);
  }
  desenharDiario();
  O.aoRedimensionar(caixaDia, desenharDiario);
})();
