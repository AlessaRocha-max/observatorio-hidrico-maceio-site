/* Página "Série histórica". */
(function () {
  "use strict";
  const O = window.OBS, D = O.D;
  if (!D) return;
  const { h, el, $, fmt, nomeMes, MESES, MESES_LONGOS } = O;

  // ------------------------------------------------------------------ escolhas (filtros)
  const params = new URLSearchParams(location.search);
  const estado = {
    serie: O.SERIES.some((s) => s.id === params.get("serie")) ? params.get("serie") : "COMBINADA",
    de: O.anoInicial, ate: O.anoFinal,
  };
  const selDe = $("ano-de"), selAte = $("ano-ate"), selSerie = $("serie");
  for (const a of O.anos) { selDe.append(h("option", { value: a, text: a })); selAte.append(h("option", { value: a, text: a === O.anoFinal ? `${a} (em andamento)` : a })); }
  const grupos = [["Maceió", ["COMBINADA", "A303", "MEDIANA"]], ["Estações do CEMADEN", O.cemaden.map((e) => e.id)]];
  for (const [rot, ids] of grupos) {
    selSerie.append(h("optgroup", { label: rot }, ids.map((id) => h("option", { value: id, text: O.SERIES.find((s) => s.id === id).nome }))));
  }
  selDe.value = estado.de; selAte.value = estado.ate; selSerie.value = estado.serie;
  const mudou = () => {
    estado.de = +selDe.value; estado.ate = Math.max(+selAte.value, estado.de); selAte.value = estado.ate;
    estado.serie = selSerie.value;
    const url = new URL(location.href);
    if (estado.serie === "COMBINADA") url.searchParams.delete("serie"); else url.searchParams.set("serie", estado.serie);
    history.replaceState(null, "", url);
    desenharTudo();
  };
  for (const s of [selDe, selAte, selSerie]) s.addEventListener("change", mudou);

  const serieAtual = () => O.SERIES.find((s) => s.id === estado.serie);
  const anosAtuais = () => O.anos.filter((a) => a >= estado.de && a <= estado.ate);
  const mesesAtuais = () => anosAtuais().flatMap(O.mesesDoAno);
  const corFonte = (f) => (f === "INMET" ? "var(--serie-inmet)" : "var(--serie-cemaden)");
  const descreverFonte = (x) => (x.fonte === "INMET" ? "INMET A303"
    : x.n ? `mediana de ${x.n} estações do CEMADEN` : `CEMADEN — ${serieAtual().curto}`);

  // ------------------------------------------------------------------ cabeçalho
  function cabecalho() {
    const s = serieAtual();
    $("titulo").textContent = `Chuva em Maceió — ${estado.de === estado.ate ? estado.de : `${estado.de} a ${estado.ate}`}`;
    $("subtitulo").textContent = `${s.nome}. ${s.desc || (porIdSerie() ? "Uma estação só: mostra a chuva naquele ponto da cidade." : "")}`;
    const ps = mesesAtuais().filter((p) => p >= D.primeiro_mes && p <= D.ultimo_mes);
    const com = ps.filter((p) => O.valorSerie(estado.serie, p).v != null).length;
    $("selo-meses").textContent = `${com} de ${ps.length} meses com total`;
    const aviso = $("aviso-serie");
    aviso.hidden = !s.proposta;
    aviso.textContent = "⚠ Série combinada: proposta em discussão no grupo, ainda não é a série oficial do projeto. " +
      "As barras laranja são meses em que o INMET falhou e entra a mediana do CEMADEN.";
  }
  const porIdSerie = () => O.porId[estado.serie];

  // ------------------------------------------------------------------ gráfico mês a mês
  const caixa = $("grafico-mensal");
  function desenharMensal() {
    const s = serieAtual();
    const meses = mesesAtuais().map((p) => ({ p, futuro: p > D.ultimo_mes, ...O.valorSerie(estado.serie, p) }));
    const anosV = anosAtuais();
    const W = Math.max(320, caixa.clientWidth), H = 330;
    const m = { t: 30, r: 6, b: 48, l: 42 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const espacoAno = Math.min(14, iw * 0.02);
    const banda = (iw - espacoAno * (anosV.length - 1)) / (anosV.length * 12);
    const maxV = Math.max(100, ...meses.map((x) => x.v ?? 0));
    const { topo, ticks } = O.escalaBonita(maxV, maxV > 400 ? 125 : 100);
    const y = (v) => m.t + ih - (v / topo) * ih;
    const xDe = (i) => m.l + Math.floor(i / 12) * espacoAno + i * banda;

    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img",
      "aria-label": `Chuva mensal, ${s.nome}, ${estado.de} a ${estado.ate}` });
    const defs = el("defs", {}, svg);
    const pad = el("pattern", { id: "hachura", width: 5, height: 5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    el("rect", { width: 5, height: 5, style: "fill: var(--superficie)" }, pad);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 5, style: "stroke: var(--eixo); stroke-width: 2" }, pad);

    for (const t of ticks) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t ? "linha-grade" : "linha-base" }, svg);
      el("text", { x: m.l - 6, y: y(t) + 4, "text-anchor": "end", class: "eixo-texto" }, svg).textContent = fmt(t);
    }
    el("text", { x: m.l - 6, y: m.t - 14, "text-anchor": "end", class: "eixo-texto" }, svg).textContent = "mm";

    const pico = meses.reduce((a, b) => ((b.v ?? -1) > (a.v ?? -1) ? b : a));
    const larg = Math.max(1.5, banda - Math.min(3, banda * 0.25));
    meses.forEach((x, i) => {
      const x0 = xDe(i) + (banda - larg) / 2;
      if (x.futuro) return;
      if (x.v == null) {
        el("rect", { x: x0, y: m.t, width: larg, height: ih, fill: "url(#hachura)", opacity: .7 }, svg);
      } else {
        const y1 = y(x.v), y0 = m.t + ih, r = Math.min(3, larg / 2, (y0 - y1) / 2);
        el("path", { d: `M${x0},${y0} V${y1 + r} Q${x0},${y1} ${x0 + r},${y1} H${x0 + larg - r} Q${x0 + larg},${y1} ${x0 + larg},${y1 + r} V${y0} Z`,
          style: `fill: ${corFonte(x.fonte)}` }, svg);
        if (x === pico) {
          el("text", { x: x0 + larg / 2, y: y1 - 6, "text-anchor": "middle", class: "rotulo-dado" }, svg)
            .textContent = `${fmt(x.v)} mm · ${nomeMes(x.p)}`;
        }
      }
      const alvo = el("rect", { x: xDe(i), y: m.t, width: banda, height: ih, class: "alvo", tabindex: 0,
        "aria-label": `${nomeMes(x.p)}: ${x.v != null ? fmt(x.v) + " mm" : "sem total"}` }, svg);
      O.comDica(alvo, () => {
        if (x.v != null) return [O.nomeMesLongo(x.p), [{ cor: corFonte(x.fonte), valor: `${fmt(x.v, 1)} mm`, nome: descreverFonte(x) }],
          x === pico ? "O mês mais chuvoso do período escolhido." : ""];
        let obs = "Sem total válido neste mês.";
        if (x.bruto) obs = `${O.STATUS[x.bruto[3]].nome}` + (x.bruto[2] != null ? ` — ${fmt(x.bruto[2])}% dos dias medidos.` : ".");
        return [O.nomeMesLongo(x.p), [{ valor: "sem total", nome: "" }], obs];
      });
    });

    // ano embaixo de cada grupo de 12 barras, com a cobertura
    anosV.forEach((a, k) => {
      const cx = xDe(k * 12) + banda * 6;
      const r = O.anoSerie(estado.serie, a);
      el("text", { x: cx, y: H - 26, "text-anchor": "middle", class: "eixo-forte" }, svg).textContent = a;
      if (banda * 12 < 46) return;  // pouco espaço: só o ano
      const nota = r.andamento ? `até ${MESES[+D.ultimo_mes.slice(5) - 1]}`
        : r.faltam.length ? `${r.faltam.length === 1 ? "falta 1 mês" : `faltam ${r.faltam.length} meses`}` : "completo";
      el("text", { x: cx, y: H - 10, "text-anchor": "middle", class: "eixo-texto",
        style: r.faltam.length && !r.andamento ? "fill: var(--atencao)" : null }, svg).textContent = nota;
    });
    caixa.replaceChildren(svg);
  }

  function legendaMensal() {
    const s = serieAtual(), itens = [];
    if (estado.serie === "COMBINADA") itens.push(["", "var(--serie-inmet)", "INMET A303"], ["", "var(--serie-cemaden)", "mediana CEMADEN (INMET falhou)"]);
    else itens.push(["", corFonte(estado.serie === "A303" ? "INMET" : "CEMADEN"), s.curto]);
    itens.push(["hachura", "transparent", "sem total"]);
    O.legenda("legenda-mensal", itens);
    $("texto-mensal").textContent = "Total de chuva de cada mês. Mês sem total aparece hachurado — preferimos deixar o buraco a mostrar um número errado.";
  }

  // ------------------------------------------------------------------ recorde
  const ICONE = {
    data: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
    lugar: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    chuva: '<svg viewBox="0 0 24 24"><path d="M7 15a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17.5 15H7zM8 19l-1 2M12 19l-1 2M16 19l-1 2"/></svg>',
  };
  function recorde() {
    const lista = O.extremosDe(estado.serie, estado.de, estado.ate).filter((x) => x.max_dia != null);
    const caixaR = $("recorde");
    if (!lista.length) { caixaR.replaceChildren(h("p", { class: "texto", text: "Sem recordes para este período." })); return; }
    const ord = [...lista].sort((a, b) => b.max_dia - a.max_dia);
    const r1 = ord[0], r2 = ord.find((x) => x.quando_dia !== r1.quando_dia);
    const m72 = lista.reduce((a, b) => ((b.max_72h ?? -1) > (a.max_72h ?? -1) ? b : a));
    const [dd, mm, aa] = r1.quando_dia.split("/");
    // comparação: chuva típica do mês inteiro (média da série combinada naquele mês do ano)
    const doMes = O.anos.map((a) => O.valorSerie("COMBINADA", O.anoMes(a, +mm)).v).filter((v) => v != null);
    const mediaMes = doMes.length ? doMes.reduce((s, v) => s + v, 0) / doMes.length : null;
    const composto = !porIdSerie();
    const periodo = estado.de === estado.ate ? `${estado.de}` : `${estado.de}–${estado.ate}`;
    caixaR.replaceChildren(...[
      h("div", { class: "cartao-cabeca", style: "margin-bottom:.5rem" }, [
        h("span", { class: "pilula parcial sem-ponto", text: `★ Recorde do período (${periodo})` })]),
      h("p", { class: "rotulo", text: composto ? "Maior chuva em um dia, em qualquer estação" : "Maior chuva em um dia nesta estação" }),
      h("p", { class: "grande" }, [fmt(r1.max_dia, 1), h("small", { text: " mm/dia" })]),
      h("ul", { class: "detalhes" }, [
        h("li", {}, [h("i", { html: ICONE.data }), h("div", {}, [h("span", { text: "Data" }), `${+dd} de ${MESES_LONGOS[+mm - 1]} de ${aa}`])]),
        h("li", {}, [h("i", { html: ICONE.lugar }), h("div", {}, [h("span", { text: "Estação" }),
          `${O.porId[r1.id].nome} (${O.porId[r1.id].rede})`])]),
        h("li", {}, [h("i", { html: ICONE.chuva }), h("div", {}, [h("span", { text: "Maior em 72 horas no período" }),
          `${fmt(m72.max_72h, 1)} mm · ${O.porId[m72.id].nome}, terminando em ${m72.quando_72h}`])]),
      ]),
      mediaMes ? h("p", { class: "comparacao",
        text: `Só nesse dia choveu ${fmt(r1.max_dia / mediaMes * 100)}% do que costuma chover em ${MESES_LONGOS[+mm - 1]} inteiro (${fmt(mediaMes)} mm, média ${O.anoInicial}–${O.anoFinal}).` }) : null,
      r2 ? h("div", { class: "segundo" }, [
        h("div", {}, [h("p", { class: "rotulo", text: "2º maior dia" }), h("strong", { text: `${fmt(r2.max_dia, 1)} mm` })]),
        h("div", { style: "text-align:right" }, [h("span", { class: "sec", text: `${O.porId[r2.id].nome}` }), h("br"),
          h("span", { class: "sec", text: r2.quando_dia })])]) : null,
    ].filter(Boolean));
  }

  // ------------------------------------------------------------------ mapa de calor
  const FAIXAS = [[50, 1, "até 50"], [150, 2, "50–150"], [250, 3, "150–250"], [350, 4, "250–350"], [Infinity, 5, "mais de 350 mm"]];
  const faixa = (v) => FAIXAS.find(([lim]) => v < lim)[1];
  function calor() {
    const grade = $("calor");
    const filhos = [h("div", { class: "cab", text: "" }), ...MESES.map((m) => h("div", { class: "cab", text: m }))];
    for (const a of anosAtuais()) {
      filhos.push(h("div", { class: "ano", text: a }));
      for (const p of O.mesesDoAno(a)) {
        if (p > D.ultimo_mes || p < D.primeiro_mes) { filhos.push(h("div", { class: "cel futuro", text: "" })); continue; }
        const x = O.valorSerie(estado.serie, p);
        const c = x.v == null
          ? h("div", { class: "cel sem", tabindex: 0, text: "—", "aria-label": `${nomeMes(p)}: sem total` })
          : h("div", { class: `cel f${faixa(x.v)}${estado.serie === "COMBINADA" && x.fonte === "CEMADEN" ? " cemaden" : ""}`,
            tabindex: 0, text: fmt(x.v), "aria-label": `${nomeMes(p)}: ${fmt(x.v)} mm` });
        O.comDica(c, () => x.v != null
          ? [O.nomeMesLongo(p), [{ valor: `${fmt(x.v, 1)} mm`, nome: descreverFonte(x) }]]
          : [O.nomeMesLongo(p), [{ valor: "sem total", nome: "" }],
            x.bruto ? `${O.STATUS[x.bruto[3]].nome}` + (x.bruto[2] != null ? ` — ${fmt(x.bruto[2])}% dos dias medidos.` : ".") : "Sem dado neste mês."]);
        filhos.push(c);
      }
    }
    grade.replaceChildren(...filhos);
    const itens = FAIXAS.map(([, n, t]) => ["", `var(--seq-${n})`, t]);
    itens.push(["hachura", "transparent", "sem total"]);
    if (estado.serie === "COMBINADA") itens.push(["cheia", "var(--serie-cemaden)", "veio do CEMADEN"]);
    O.legenda("legenda-calor", itens);
  }

  // ------------------------------------------------------------------ tabela anual
  const ICONE_BAIXAR = '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>';
  function tabelaAnual() {
    const linhasAno = anosAtuais().map((a) => ({ a, ...O.anoSerie(estado.serie, a) }));
    const fechados = linhasAno.filter((r) => r.total != null && !r.andamento && !r.aviso);
    const maisChuvoso = fechados.reduce((a, b) => (!a || b.total > a.total ? b : a), null);
    const cab = h("tr", {}, [h("th", { text: "Ano" }), h("th", { class: "num", text: "Chuva total" }), h("th", { text: "Cobertura" }),
      h("th", { text: "Situação" }), h("th", { text: "Origem" }), h("th", { text: "", "aria-label": "Baixar" })]);
    const linhas = linhasAno.map((r) => {
      let pil;
      if (r.andamento) pil = h("span", { class: "pilula info", text: `Em andamento (até ${MESES[+D.ultimo_mes.slice(5) - 1]})` });
      else if (r.aviso) pil = h("span", { class: "pilula critico", text: "Contém mês suspeito" });
      else if (r.total == null) pil = h("span", { class: "pilula parcial",
        text: `Parcial (falta${r.faltam.length > 1 ? "m" : ""} ${r.faltam.length > 3 ? r.faltam.length + " meses" : r.faltam.map((p) => MESES[+p.slice(5) - 1]).join(", ")})` });
      else pil = h("span", { class: "pilula ok", text: r === maisChuvoso && fechados.length > 1 ? "Completo · ano mais chuvoso" : "Completo" });
      const cor = r.cobertura >= 90 ? "var(--primaria)" : "var(--atencao)";
      const barra = h("span", { class: "barrinha" }, [h("i", {}, h("b", { style: `width:${Math.min(100, r.cobertura)}%; background:${cor}` })), `${fmt(r.cobertura, 1)}%`]);
      const totalTxt = r.total != null ? `${fmt(r.total, 1)} mm` : "—";
      const baixar = h("button", { type: "button", class: "icone-botao", title: `Baixar os meses de ${r.a} (CSV)`, "aria-label": `Baixar os meses de ${r.a}`, html: ICONE_BAIXAR });
      baixar.addEventListener("click", () => baixar_(r.a, r.a));
      return h("tr", {}, [
        h("td", {}, h("strong", { text: r.a })),
        h("td", { class: "num" }, [h("strong", { text: totalTxt }),
          r.andamento && r.total != null ? h("div", { class: "sec", text: "até agora" }) : null]),
        h("td", {}, barra), h("td", {}, pil),
        h("td", {}, r.fontes.map((f) => h("span", { class: `fonte ${f.toLowerCase()}`, text: f }))),
        h("td", {}, baixar),
      ]);
    });
    $("tabela-anual").replaceChildren(h("thead", {}, cab), h("tbody", {}, linhas));
    const media = fechados.length ? fechados.reduce((s, r) => s + r.total, 0) / fechados.length : null;
    $("rodape-anual").textContent = media
      ? `Média dos anos completos: ${fmt(media)} mm por ano (${fechados.length} ${fechados.length > 1 ? "anos" : "ano"}). Anos parciais não entram na média.`
      : "Nenhum ano completo neste período para calcular a média.";
  }

  // ------------------------------------------------------------------ baixar CSV
  function baixar_(de, ate) {
    const s = serieAtual();
    const linhas = [["mes", "chuva_mm", "origem", "estacoes_cemaden_na_mediana", "situacao", "serie"]];
    for (let a = de; a <= ate; a++) for (const p of O.mesesDoAno(a)) {
      if (p > D.ultimo_mes || p < D.primeiro_mes) continue;
      const x = O.valorSerie(estado.serie, p);
      const sit = x.v != null ? "completo" : x.bruto ? O.STATUS[x.bruto[3]].nome : "sem dado";
      linhas.push([p, x.v != null ? Math.round(x.v * 10) / 10 : null, x.v != null ? x.fonte : "", x.n ?? "", sit, s.nome]);
    }
    const nome = `chuva_maceio_${s.id.toLowerCase()}_${de}${ate !== de ? "-" + ate : ""}.csv`;
    O.baixarCSV(nome, linhas);
  }
  $("baixar").addEventListener("click", () => baixar_(estado.de, estado.ate));

  // ------------------------------------------------------------------ tudo junto
  function desenharTudo() { cabecalho(); legendaMensal(); desenharMensal(); recorde(); calor(); tabelaAnual(); }
  desenharTudo();
  O.aoRedimensionar(caixa, desenharMensal);
})();
