/* Página "Monitoramento": chuva em cada estação nos últimos dias com dados. */
(function () {
  "use strict";
  const O = window.OBS, D = O.D;
  if (!D) return;
  const { h, el, $, fmt, dataCurta, dataLonga, mediana } = O;

  // ⚠ FAIXAS PROVISÓRIAS (rascunho do Stitch), em mm por 24 horas. Quando a Defesa Civil
  // definir os níveis oficiais, troque só esta lista (limite superior de cada faixa).
  const FAIXAS = [
    { ate: 10, nome: "Normalidade", cor: "var(--bom)", classe: "ok" },
    { ate: 30, nome: "Observação", cor: "var(--primaria)", classe: "info" },
    { ate: 60, nome: "Atenção", cor: "#e0a800", classe: "parcial" },
    { ate: 100, nome: "Alerta", cor: "var(--serie-cemaden)", classe: "laranja" },
    { ate: Infinity, nome: "Alerta máximo", cor: "var(--critico)", classe: "critico" },
  ];
  const faixaDe = (v) => FAIXAS.find((f) => v < f.ate);
  const textoFaixa = (f, i) => i === 0 ? `menos de ${f.ate} mm` : f.ate === Infinity ? `${FAIXAS[i - 1].ate} mm ou mais` : `${FAIXAS[i - 1].ate} a ${f.ate} mm`;

  const JANELAS = [[1, "1 dia"], [3, "72 h"], [7, "7 dias"], [30, "30 dias"]];

  // ------------------------------------------------------------------ dia a dia por estação
  const porEstacao = {};                        // id -> { "2026-09-03": total }
  for (const [id, lista] of Object.entries(D.diario || {})) {
    porEstacao[id] = Object.fromEntries(lista.map(([dia, v]) => [dia, v]));
  }
  const dias = [...new Set(Object.values(D.diario || {}).flatMap((l) => l.map(([d]) => d)))].sort();
  if (!dias.length) { $("cartoes").textContent = "Sem dados diários."; return; }
  const mes = D.ultimo_mes;
  const medianaDia = (d) => {
    const v = O.medicao.map((e) => porEstacao[e.id]?.[d]).filter((x) => x != null);
    return v.length ? mediana(v) : null;
  };

  const pedido = new URLSearchParams(location.search).get("dia");   // ex.: monitoramento.html?dia=2026-09-18
  const estado = { dia: dias.includes(pedido) ? pedido : dias.at(-1), janela: 1, comparar: [] };

  $("subtitulo").textContent = `A chuva em cada pluviômetro de ${dataLonga(dias[0])} a ${dataLonga(dias.at(-1))}, os últimos 30 dias com dados. ` +
    "Não é tempo real: os dados do CEMADEN chegam uma vez por mês e os do INMET, uma vez por ano.";

  // ------------------------------------------------------------------ filtros
  const selDia = $("dia");
  for (const d of [...dias].reverse()) selDia.append(h("option", { value: d, text: `${dataCurta(d)}/${d.slice(0, 4)}` }));
  selDia.value = estado.dia;
  selDia.addEventListener("change", () => { estado.dia = selDia.value; desenhar(); });
  const botoesJanela = JANELAS.map(([n, t]) => {
    const b = h("button", { type: "button", "aria-pressed": String(n === estado.janela), text: t });
    b.addEventListener("click", () => {
      estado.janela = n;
      for (const x of botoesJanela) x.setAttribute("aria-pressed", String(x === b));
      desenhar();
    });
    return b;
  });
  // atalho: o dia mais chuvoso do período (chuva típica da cidade)
  const maisChuvoso = dias.reduce((a, b) => ((medianaDia(b) ?? -1) > (medianaDia(a) ?? -1) ? b : a));
  const atalho = h("button", { type: "button", class: "botao claro", text: `Ir para o dia mais chuvoso (${dataCurta(maisChuvoso)})` });
  atalho.addEventListener("click", () => {
    estado.dia = maisChuvoso; selDia.value = maisChuvoso;
    estado.janela = 1; botoesJanela.forEach((x, i) => x.setAttribute("aria-pressed", String(i === 0)));
    desenhar();
  });
  $("janela").replaceChildren(...botoesJanela);
  $("janela").parentElement.after(atalho);

  /** Chuva de uma estação na janela que termina no dia escolhido. */
  function naJanela(id) {
    const fim = dias.indexOf(estado.dia);
    const janela = dias.slice(Math.max(0, fim - estado.janela + 1), fim + 1);
    const vals = janela.map((d) => porEstacao[id]?.[d]);
    const medidos = vals.filter((v) => v != null);
    const ultimo = Object.keys(porEstacao[id] || {}).filter((d) => porEstacao[id][d] != null && d <= estado.dia).sort().at(-1);
    return { soma: medidos.length ? medidos.reduce((s, v) => s + v, 0) : null,
      completo: medidos.length === janela.length, faltam: janela.length - medidos.length, n: janela.length, ultimo };
  }
  const nomeJanela = () => estado.janela === 1 ? `em ${dataLonga(estado.dia)}`
    : `nos ${estado.janela === 3 ? "3" : estado.janela} dias até ${dataCurta(estado.dia)}`;

  // ------------------------------------------------------------------ régua
  function regua() {
    const caixa = $("regua");
    if (estado.janela !== 1) {
      $("texto-regua").textContent = "As faixas valem para a chuva de um dia. Escolha a janela de 1 dia para ver a régua.";
      caixa.replaceChildren(); $("legenda-regua").replaceChildren();
      return;
    }
    const lista = O.medicao.map((e) => ({ e, v: porEstacao[e.id]?.[estado.dia] })).filter((x) => x.v != null);
    $("texto-regua").textContent = lista.length
      ? `Chuva em ${dataLonga(estado.dia)}: a típica da cidade (mediana de ${lista.length} estações) e a estação que mais choveu.`
      : `Nenhuma estação mediu o dia ${dataLonga(estado.dia)} inteiro.`;
    if (!lista.length) { caixa.replaceChildren(); return; }
    const tipica = mediana(lista.map((x) => x.v));
    const pico = lista.reduce((a, b) => (b.v > a.v ? b : a));
    // cada faixa ocupa a mesma largura; dentro dela a posição é proporcional
    const pos = (v) => {
      const i = FAIXAS.indexOf(faixaDe(v)), de = i ? FAIXAS[i - 1].ate : 0;
      const ate = FAIXAS[i].ate === Infinity ? de * 1.5 : FAIXAS[i].ate;
      return ((i + Math.min(1, (v - de) / (ate - de))) / FAIXAS.length) * 100;
    };
    const marcador = (v, texto, classe) => {
      const m = h("div", { class: `regua-marca ${classe}` }, [h("span", { text: `${texto}: ${fmt(v, 1)} mm` })]);
      m.style.left = `${pos(v)}%`;
      // etiqueta não sai pela borda
      m.firstChild.style.transform = pos(v) < 12 ? "translateX(-10px)" : pos(v) > 88 ? "translateX(calc(-100% + 10px))" : "translateX(-50%)";
      return m;
    };
    caixa.replaceChildren(h("div", { class: "regua" }, [
      h("div", { class: "regua-faixas" }, FAIXAS.map((f, i) => {
        const s = h("div", { title: `${f.nome}: ${textoFaixa(f, i)}` }); s.style.background = f.cor; return s;
      })),
      h("div", { class: "regua-escala" }, FAIXAS.slice(0, -1).map((f, i) => {
        const s = h("span", { text: `${f.ate} mm` }); s.style.left = `${((i + 1) / FAIXAS.length) * 100}%`; return s;
      })),
      marcador(tipica, "Típica", "tipica"),
      marcador(pico.v, `Mais chuva: ${pico.e.nome}`, "pico"),
    ]));
    O.legenda("legenda-regua", [["ponto", "var(--tinta)", `típica: ${fmt(tipica, 1)} mm (${faixaDe(tipica).nome})`],
      ["ponto", "var(--serie-cemaden)", `pico: ${fmt(pico.v, 1)} mm, ${pico.e.nome}`]]);
  }

  // ------------------------------------------------------------------ cartões das estações
  function pilulaStatus(e) {
    const b = D.mensal[e.id]?.[mes];
    if (!b) return h("span", { class: "pilula sem-ponto", text: "— sem dado" });
    if (b[3] === "ok") return h("span", { class: "pilula ok", text: "mês completo" });
    if (b[3] === "incompleto") return h("span", { class: "pilula parcial", text: "mês incompleto" });
    return h("span", { class: "pilula critico", text: "mês suspeito" });
  }
  function cartoes() {
    const lista = O.medicao.map((e) => ({ e, ...naJanela(e.id), b: D.mensal[e.id]?.[mes] }))
      .sort((a, b) => (b.soma ?? -1) - (a.soma ?? -1));
    $("nota-cartoes").textContent = `Chuva ${nomeJanela()}`;
    $("cartoes").replaceChildren(...lista.map((x) => {
      const sem = x.soma == null;
      const pil = sem ? pilulaStatus(x.e)
        : estado.janela === 1 ? (() => { const f = faixaDe(x.soma); return h("span", { class: `pilula ${f.classe}`, text: f.nome }); })()
        : pilulaStatus(x.e);
      const cob = x.b && x.b[2] != null ? x.b[2] : 0;
      return h("article", { class: `cartao cartao-estacao${sem ? " apagado" : ""}` }, [
        h("div", { class: "topo-cartao" }, [h("h3", { text: x.e.nome }), pil]),
        h("p", { class: "valor" }, sem ? [h("span", { class: "traco" }), h("small", { text: x.b && x.b[3].startsWith("suspeito") ? "dado suspeito, fora das contas" : "sem dado nesta janela" })]
          : [fmt(x.soma, 1), h("small", { text: x.completo ? "mm" : "mm*" })]),
        !sem && !x.completo ? h("p", { class: "nota", style: "margin:0 0 .4rem", text: `* falta${x.faltam > 1 ? "m" : ""} ${x.faltam} de ${x.n} dias` }) : null,
        h("div", { class: "linha-cob" }, [h("span", { text: `Cobertura em ${O.nomeMes(mes)}` }), h("span", { text: x.b ? `${fmt(cob, 1)}%` : "—" })]),
        h("i", { class: "cob" }, h("b", { style: `width:${cob}%; background:${cob >= 90 ? "var(--primaria)" : "var(--atencao)"}` })),
        h("p", { class: "ultimo" }, [h("span", { class: "ponto-status", style: `background:${x.ultimo ? "var(--bom)" : "var(--eixo)"}` }),
          x.ultimo ? `Último dia com dado: ${dataCurta(x.ultimo)}` : `Sem dado desde antes de ${dataCurta(dias[0])}`]),
      ].filter(Boolean));
    }));
  }

  // ------------------------------------------------------------------ faixas e cobertura da rede
  $("faixas").replaceChildren(...FAIXAS.map((f, i) => h("div", { class: "faixa" }, [
    h("span", { class: "ponto-status", style: `background:${f.cor}` }), h("strong", { text: f.nome }), h("span", { text: textoFaixa(f, i) })])));
  (function coberturaRede() {
    const ok = O.medicao.filter((e) => D.mensal[e.id]?.[mes]?.[3] === "ok").length;
    const comDado = O.medicao.filter((e) => D.mensal[e.id]?.[mes]).length;
    const pct = (ok / O.medicao.length) * 100;
    $("cobertura-rede").replaceChildren(
      h("div", { class: "linha-cob" }, [h("span", { class: "rotulo", text: `Estações em ${O.nomeMes(mes)}` }),
        h("strong", { style: "color: var(--bom)", text: `${ok} de ${O.medicao.length} com o mês completo` })]),
      h("i", { class: "cob", style: "height:8px;margin:.6rem 0" }, h("b", { style: `width:${pct}%; background: var(--bom)` })),
      h("div", { class: "linha-cob" }, [h("span", { text: `${comDado - ok} com o mês incompleto ou suspeito` }),
        h("span", { text: `${O.medicao.length - comDado} sem dado` })]));
  })();

  // ------------------------------------------------------------------ comparar estações
  const CORES = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)"];
  const comDado = O.medicao.filter((e) => porEstacao[e.id]);
  const total30 = (id) => Object.values(porEstacao[id] || {}).reduce((s, v) => s + (v ?? 0), 0);
  estado.comparar = [...comDado].sort((a, b) => total30(b.id) - total30(a.id)).slice(0, 3).map((e) => e.id);
  const chipsComparar = comDado.map((e) => {
    const b = h("button", { type: "button", "aria-pressed": "false", text: e.nome });
    b.addEventListener("click", () => {
      const i = estado.comparar.indexOf(e.id);
      if (i >= 0) estado.comparar.splice(i, 1);
      else { if (estado.comparar.length >= 3) estado.comparar.shift(); estado.comparar.push(e.id); }
      desenharComparar();
    });
    b.dataset.id = e.id;
    return b;
  });
  $("escolha-comparar").replaceChildren(...chipsComparar);

  const caixaComp = $("grafico-comparar");
  function desenharComparar() {
    for (const b of chipsComparar) b.setAttribute("aria-pressed", String(estado.comparar.includes(b.dataset.id)));
    const series = estado.comparar.map((id, k) => ({ e: O.porId[id], cor: CORES[k] }));
    O.legenda("legenda-comparar", [...series.map((s) => ["cheia", s.cor, s.e.nome]), ["linha", "var(--tinta-3)", "típica do dia"]]);
    const W = Math.max(320, caixaComp.clientWidth), H = 280;
    const m = { t: 26, r: W < 500 ? 12 : 120, b: 28, l: 36 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const maxV = Math.max(10, ...series.flatMap((s) => dias.map((d) => porEstacao[s.e.id]?.[d] ?? 0)));
    const { topo, ticks } = O.escalaBonita(maxV, maxV > 60 ? 20 : maxV > 25 ? 10 : 5);
    const x = (i) => m.l + (i / (dias.length - 1)) * iw;
    const y = (v) => m.t + ih - (v / topo) * ih;
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img",
      "aria-label": `Chuva por dia: ${series.map((s) => s.e.nome).join(", ")}` });
    for (const t of ticks) {
      el("line", { x1: m.l, x2: m.l + iw, y1: y(t), y2: y(t), class: t ? "linha-grade" : "linha-base" }, svg);
      el("text", { x: m.l - 6, y: y(t) + 4, "text-anchor": "end", class: "eixo-texto" }, svg).textContent = fmt(t);
    }
    el("text", { x: m.l - 6, y: m.t - 14, "text-anchor": "end", class: "eixo-texto" }, svg).textContent = "mm";
    const passo = W < 500 ? 7 : 3;
    dias.forEach((d, i) => {
      if (i % passo === 0 || i === dias.length - 1)
        el("text", { x: x(i), y: H - 8, "text-anchor": "middle", class: "eixo-texto" }, svg).textContent = dataCurta(d);
    });
    // linha com buracos: dia sem dado interrompe
    const caminho = (valores) => {
      let dd = "", aberto = false;
      valores.forEach((v, i) => {
        if (v == null) { aberto = false; return; }
        dd += `${aberto ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; aberto = true;
      });
      return dd;
    };
    el("path", { d: caminho(dias.map(medianaDia)), fill: "none", style: "stroke: var(--tinta-3); stroke-width: 1.5; stroke-dasharray: 4 4" }, svg);
    const finais = [];
    for (const s of series) {
      const vals = dias.map((d) => porEstacao[s.e.id]?.[d] ?? null);
      el("path", { d: caminho(vals), fill: "none", style: `stroke: ${s.cor}; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round` }, svg);
      const iu = vals.findLastIndex((v) => v != null);
      if (iu >= 0 && m.r > 60) finais.push({ s, yy: y(vals[iu]), xx: x(iu) });
    }
    // rótulos no fim das linhas, sem se sobrepor
    finais.sort((a, b) => a.yy - b.yy);
    for (let i = 1; i < finais.length; i++) finais[i].yy = Math.max(finais[i].yy, finais[i - 1].yy + 14);
    const desce = finais.length ? finais.at(-1).yy - (m.t + ih) : 0;   // não passar do eixo
    if (desce > 0) for (const f of finais) f.yy -= desce;
    for (const f of finais) {
      el("circle", { cx: f.xx, cy: y(porEstacao[f.s.e.id][dias.findLast((d) => porEstacao[f.s.e.id]?.[d] != null)]), r: 3.5,
        style: `fill: ${f.s.cor}; stroke: var(--superficie); stroke-width: 2` }, svg);
      el("text", { x: m.l + iw + 8, y: f.yy + 4, class: "eixo-texto", style: "fill: var(--tinta-2)" }, svg).textContent = f.s.e.nome;
    }
    // mira (crosshair) + dica
    const mira = el("line", { y1: m.t, y2: m.t + ih, style: "stroke: var(--eixo); stroke-width: 1", visibility: "hidden" }, svg);
    const alvo = el("rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent", tabindex: 0,
      "aria-label": "Passe o mouse para ver a chuva de cada dia" }, svg);
    let iAtual = dias.length - 1;
    O.comDica(alvo, () => {
      const d = dias[iAtual];
      mira.setAttribute("x1", x(iAtual)); mira.setAttribute("x2", x(iAtual)); mira.setAttribute("visibility", "visible");
      return [dataLonga(d), [...series.map((s) => ({ cor: s.cor, valor: porEstacao[s.e.id]?.[d] != null ? `${fmt(porEstacao[s.e.id][d], 1)} mm` : "sem dado", nome: s.e.nome })),
        { cor: "var(--tinta-3)", valor: medianaDia(d) != null ? `${fmt(medianaDia(d), 1)} mm` : "—", nome: "típica do dia" }]];
    });
    alvo.addEventListener("pointermove", (ev) => {
      const r = alvo.getBoundingClientRect();
      iAtual = Math.max(0, Math.min(dias.length - 1, Math.round(((ev.clientX - r.left) / r.width) * (dias.length - 1))));
    }, { capture: true });
    alvo.addEventListener("pointerleave", () => mira.setAttribute("visibility", "hidden"));
    caixaComp.replaceChildren(svg);
  }

  // ------------------------------------------------------------------ baixar CSV
  $("baixar").addEventListener("click", () => {
    const linhas = [["dia", ...O.medicao.map((e) => e.nome), "tipica_mediana"]];
    for (const d of dias) linhas.push([d, ...O.medicao.map((e) => porEstacao[e.id]?.[d] ?? null),
      medianaDia(d) != null ? Math.round(medianaDia(d) * 10) / 10 : null]);
    O.baixarCSV(`chuva_diaria_${dias[0]}_a_${dias.at(-1)}.csv`, linhas);
  });

  function desenhar() { regua(); cartoes(); }
  desenhar();
  desenharComparar();
  O.aoRedimensionar(caixaComp, desenharComparar);
})();
