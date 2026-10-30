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

  /** Ano completo mais chuvoso dentro dos anos escolhidos (null se houver menos de 2 anos completos). */
  function anoMaisChuvoso() {
    const fechados = anosAtuais().map((a) => ({ a, ...O.anoSerie(estado.serie, a) }))
      .filter((r) => r.total != null && !r.andamento && !r.aviso);
    if (fechados.length < 2) return null;
    return fechados.reduce((x, y) => (y.total > x.total ? y : x)).a;
  }

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

    const topoAno = anoMaisChuvoso();
    if (topoAno) {
      const k = anosV.indexOf(topoAno);
      el("rect", { x: xDe(k * 12) - 2, y: m.t - 4, width: banda * 12 + 4, height: ih + 4, rx: 6,
        style: "fill: var(--mais-chuvoso-suave)" }, svg);
    }

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
      el("text", { x: cx, y: H - 26, "text-anchor": "middle", class: "eixo-forte",
        style: a === topoAno ? "fill: var(--mais-chuvoso)" : null }, svg).textContent = a === topoAno ? `★ ${a}` : a;
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
    if (anoMaisChuvoso()) itens.push(["", "var(--mais-chuvoso)", `★ ano mais chuvoso (${anoMaisChuvoso()})`]);
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
  // faixas de chuva no mês (limite superior, nome); a cor vai do azul mais fraco ao mais forte
  const FAIXAS = O.FAIXAS_MES;
  const faixa = (v) => FAIXAS.findIndex(([lim]) => v < lim) + 1;
  function calor() {
    const grade = $("calor");
    const topoAno = anoMaisChuvoso();
    const anosV = anosAtuais();
    // cabeçalho: meses + total do ano; destacados quando o mouse passa num quadrado
    const cabs = MESES.map((m) => h("div", { class: "cab", text: m }));
    const filhos = [h("div", { class: "cab" }), ...cabs, h("div", { class: "cab tot", text: "Total do ano" })];
    const acender = (rotuloAno, k, liga) => { rotuloAno.classList.toggle("ativo", liga); cabs[k].classList.toggle("ativo", liga); };

    for (const a of anosV) {
      const rotuloAno = h("div", { class: `ano${a === topoAno ? " mais-chuvoso" : ""}`, text: a,
        title: a === topoAno ? "Ano mais chuvoso do período escolhido" : null });
      filhos.push(rotuloAno);
      O.mesesDoAno(a).forEach((p, k) => {
        if (p > D.ultimo_mes || p < D.primeiro_mes) { filhos.push(h("div", { class: "cel futuro", title: "Ainda sem dado (mês futuro)" })); return; }
        const x = O.valorSerie(estado.serie, p);
        const c = x.v == null
          ? h("div", { class: "cel sem", tabindex: 0, text: "—", "aria-label": `${nomeMes(p)}: sem total` })
          : h("div", { class: `cel f${faixa(x.v)}`, tabindex: 0, text: fmt(x.v), "aria-label": `${nomeMes(p)}: ${fmt(x.v)} mm` });
        c.setAttribute("role", "button");
        if (p === estado.mes) c.classList.add("escolhida");
        const escolher = () => {
          estado.mes = p;
          for (const z of grade.querySelectorAll(".escolhida")) z.classList.remove("escolhida");
          c.classList.add("escolhida");
          painelMes();
        };
        c.addEventListener("click", escolher);
        c.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); escolher(); } });
        for (const [ev, liga] of [["pointerenter", true], ["focus", true], ["pointerleave", false], ["blur", false]])
          c.addEventListener(ev, () => acender(rotuloAno, k, liga));
        O.comDica(c, () => x.v != null
          ? [O.nomeMesLongo(p), [{ valor: `${fmt(x.v, 1)} mm`, nome: descreverFonte(x) }],
            `Faixa: ${FAIXAS[faixa(x.v) - 1][1].toLowerCase()}. Clique para comparar com o mesmo mês dos outros anos.`]
          : [O.nomeMesLongo(p), [{ valor: "sem total", nome: "" }],
            x.bruto ? `${O.STATUS[x.bruto[3]].nome}` + (x.bruto[2] != null ? ` — ${fmt(x.bruto[2])}% dos dias medidos.` : ".") : "Sem dado neste mês."]);
        filhos.push(c);
      });
      // total do ano
      const r = O.anoSerie(estado.serie, a);
      const tot = r.total != null
        ? h("div", { class: `tot${a === topoAno ? " mais-chuvoso" : ""}` }, [h("strong", { text: fmt(r.total) }), h("small", { text: r.andamento ? "até agora" : "mm" })])
        : h("div", { class: "tot vazio" }, [h("strong", { text: "—" }),
          h("small", { text: r.andamento ? "em andamento" : r.aviso ? "mês suspeito" : `falta${r.faltam.length > 1 ? "m" : ""} ${r.faltam.length}` })]);
      filhos.push(tot);
    }

    // última linha: média de cada mês nos anos mostrados
    filhos.push(h("div", { class: "ano media", text: "Média" }));
    for (let k = 1; k <= 12; k++) {
      const vals = anosV.map((a) => O.valorSerie(estado.serie, O.anoMes(a, k)).v).filter((v) => v != null);
      const med = vals.length ? vals.reduce((t, v) => t + v, 0) / vals.length : null;
      filhos.push(h("div", { class: "media", text: med != null ? fmt(med) : "—",
        title: med != null ? `${MESES_LONGOS[k - 1]}: média de ${vals.length} ${vals.length > 1 ? "anos" : "ano"}` : "sem dado" }));
    }
    filhos.push(h("div", { class: "media tot-vazio" }));
    grade.replaceChildren(...filhos);

    // legenda: uma régua só, do mais seco ao mais chuvoso
    $("legenda-calor").replaceChildren(h("div", { class: "escala-calor", "aria-label": "Faixas de chuva no mês" },
      FAIXAS.map(([, nome, txt], i) => h("div", {}, [h("span", { class: `bloco f${i + 1}` }), h("strong", { text: nome }), h("small", { text: `${txt} mm` })]))),
      h("div", { class: "legenda" }, [
        h("span", {}, [h("span", { class: "chave hachura" }), "sem total (faltou medir)"]),
        h("span", {}, [h("span", { class: "chave vazio-futuro" }), "ainda não aconteceu"]),
        topoAno ? h("span", { style: "color: var(--mais-chuvoso); font-weight: 600", text: `★ ano mais chuvoso (${topoAno})` }) : null,
      ].filter(Boolean)));
    $("nota-calor").textContent = (estado.serie === "COMBINADA"
      ? "Série combinada: passe o mouse num quadrado para ver se o valor veio do INMET ou da mediana do CEMADEN. " : "") +
      "\"Sem total\": faltaram mais de 10% dos dias, ou o mês é suspeito. A média de cada mês usa só os anos com total.";
  }

  // ------------------------------------------------------------------ o mês clicado, em todos os anos
  estado.mes = [...O.todosMeses].reverse().find((p) => O.valorSerie(estado.serie, p).v != null) || D.ultimo_mes;
  const caixaMes = $("grafico-mes");
  function painelMes() {
    const p = estado.mes, mm = +p.slice(5, 7), anoClicado = +p.slice(0, 4);
    const nomeM = MESES_LONGOS[mm - 1], NomeM = nomeM[0].toUpperCase() + nomeM.slice(1);
    const pontos = O.anos.map((a) => ({ a, p: O.anoMes(a, mm) }))
      .filter((x) => x.p >= D.primeiro_mes && x.p <= D.ultimo_mes)
      .map((x) => ({ ...x, ...O.valorSerie(estado.serie, x.p) }));
    const comValor = pontos.filter((x) => x.v != null);
    const media = comValor.length ? comValor.reduce((t, x) => t + x.v, 0) / comValor.length : null;
    const atual = pontos.find((x) => x.a === anoClicado);

    $("titulo-mes").textContent = `${NomeM} em todos os anos`;
    let texto = `Chuva de ${nomeM} em cada ano (${serieAtual().curto}). O ano clicado aparece em destaque.`;
    if (atual?.v != null && media && comValor.length > 1) {
      const dif = (atual.v / media - 1) * 100;
      texto = `Em ${nomeM} de ${anoClicado} choveu ${fmt(atual.v)} mm — ` +
        (Math.abs(dif) < 5 ? "perto da" : `${fmt(Math.abs(dif))}% ${dif > 0 ? "acima" : "abaixo"} da`) +
        ` média de ${nomeM} (${fmt(media)} mm, ${comValor.length} anos com total).`;
    } else if (atual) texto = `${NomeM} de ${anoClicado} não tem total válido nesta série. ` + texto;
    $("texto-mes").textContent = texto;

    // barras: um ano por barra
    const W = Math.max(300, caixaMes.clientWidth), H = 240;
    const m = { t: 24, r: 8, b: 26, l: 40 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const banda = iw / Math.max(1, pontos.length), larg = Math.min(46, banda * 0.62);
    const maxV = Math.max(100, ...comValor.map((x) => x.v));
    const { topo, ticks } = O.escalaBonita(maxV, maxV > 400 ? 100 : 50);
    const y = (v) => m.t + ih - (v / topo) * ih;
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${NomeM} em cada ano` });
    const defs = el("defs", {}, svg);
    const pad = el("pattern", { id: "hachura-mes", width: 5, height: 5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    el("rect", { width: 5, height: 5, style: "fill: var(--superficie)" }, pad);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 5, style: "stroke: var(--eixo); stroke-width: 2" }, pad);
    for (const t of ticks) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t ? "linha-grade" : "linha-base" }, svg);
      el("text", { x: m.l - 6, y: y(t) + 4, "text-anchor": "end", class: "eixo-texto" }, svg).textContent = fmt(t);
    }
    el("text", { x: m.l - 6, y: m.t - 12, "text-anchor": "end", class: "eixo-texto" }, svg).textContent = "mm";
    pontos.forEach((x, i) => {
      const cx = m.l + banda * i + banda / 2, x0 = cx - larg / 2, eAtual = x.a === anoClicado;
      if (x.v == null) {
        el("rect", { x: x0, y: m.t, width: larg, height: ih, fill: "url(#hachura-mes)", opacity: .7 }, svg);
      } else {
        const y1 = y(x.v), y0 = m.t + ih, r = Math.min(4, larg / 2, (y0 - y1) / 2);
        el("path", { d: `M${x0},${y0} V${y1 + r} Q${x0},${y1} ${x0 + r},${y1} H${x0 + larg - r} Q${x0 + larg},${y1} ${x0 + larg},${y1 + r} V${y0} Z`,
          style: `fill: ${eAtual ? "var(--primaria)" : "var(--seq-2)"}` }, svg);
        el("text", { x: cx, y: y1 - 6, "text-anchor": "middle", class: eAtual ? "rotulo-dado" : "eixo-texto" }, svg).textContent = fmt(x.v);
      }
      el("text", { x: cx, y: H - 8, "text-anchor": "middle", class: eAtual ? "eixo-forte" : "eixo-texto" }, svg).textContent = x.a;
      const alvo = el("rect", { x: m.l + banda * i, y: m.t, width: banda, height: ih, class: "alvo", tabindex: 0,
        "aria-label": `${nomeM} de ${x.a}: ${x.v != null ? fmt(x.v) + " mm" : "sem total"}` }, svg);
      O.comDica(alvo, () => [`${NomeM} de ${x.a}`, [{ valor: x.v != null ? `${fmt(x.v, 1)} mm` : "sem total", nome: x.v != null ? descreverFonte(x) : "" }],
        x.v != null && media ? `Média de ${nomeM}: ${fmt(media, 1)} mm.` : ""]);
      alvo.addEventListener("click", () => { estado.mes = x.p; calor(); painelMes(); });
    });
    if (media) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(media), y2: y(media), style: "stroke: var(--tinta-2); stroke-width: 1.5; stroke-dasharray: 5 4" }, svg);
    }
    caixaMes.replaceChildren(svg);
    O.legenda("legenda-mes", [["", "var(--primaria)", `${anoClicado} (clicado)`], ["", "var(--seq-2)", "outros anos"],
      ["linha", "var(--tinta-2)", media ? `média do mês (${fmt(media)} mm)` : "média do mês"], ["hachura", "transparent", "sem total"]]);

    // cada estação no mês clicado
    $("titulo-estacoes-mes").textContent = `Cada estação em ${nomeM} de ${anoClicado}`;
    const linhas = O.medicao.map((e) => ({ e, b: D.mensal[e.id]?.[p] }))
      .map((x) => ({ ...x, v: x.b && x.b[3] === "ok" ? x.b[0] : null }))
      .sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
    const maxE = Math.max(1, ...linhas.map((x) => x.v ?? 0));
    $("estacoes-mes").replaceChildren(...linhas.map((x) => {
      const barra = h("i", {}, x.v != null ? h("b", { style: `width:${(x.v / maxE) * 100}%; background:${O.COR_REDE[x.e.rede]}` }) : null);
      const valor = x.v != null ? h("span", { class: "num", text: `${fmt(x.v)} mm` })
        : h("span", { class: "num sem", text: x.b ? (x.b[3] === "incompleto" ? "incompleto" : "suspeito") : "sem dado",
          title: x.b ? O.STATUS[x.b[3]].nome : "A estação não mandou dado neste mês." });
      return h("div", { class: "linha" }, [h("span", { text: x.e.nome, title: `${x.e.nome} (${x.e.rede})` }), barra, valor]);
    }));
  }

  // ------------------------------------------------------------------ tabela anual
  const ICONE_BAIXAR = '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>';
  function tabelaAnual() {
    const linhasAno = anosAtuais().map((a) => ({ a, ...O.anoSerie(estado.serie, a) }));
    const fechados = linhasAno.filter((r) => r.total != null && !r.andamento && !r.aviso);
    const topoAno = anoMaisChuvoso();
    const cab = h("tr", {}, [h("th", { text: "Ano" }), h("th", { class: "num", text: "Chuva total" }), h("th", { text: "Cobertura" }),
      h("th", { text: "Situação" }), h("th", { text: "Origem" }), h("th", { text: "", "aria-label": "Baixar" })]);
    const linhas = linhasAno.map((r) => {
      let pil;
      if (r.andamento) pil = h("span", { class: "pilula info", text: `Em andamento (até ${MESES[+D.ultimo_mes.slice(5) - 1]})` });
      else if (r.aviso) pil = h("span", { class: "pilula critico", text: "Contém mês suspeito" });
      else if (r.total == null) pil = h("span", { class: "pilula parcial",
        text: `Parcial (falta${r.faltam.length > 1 ? "m" : ""} ${r.faltam.length > 3 ? r.faltam.length + " meses" : r.faltam.map((p) => MESES[+p.slice(5) - 1]).join(", ")})` });
      else if (r.a === topoAno) pil = h("span", { class: "pilula mais-chuvoso", text: "★ Ano mais chuvoso" });
      else pil = h("span", { class: "pilula ok", text: "Completo" });
      const cor = r.cobertura >= 90 ? "var(--primaria)" : "var(--atencao)";
      const barra = h("span", { class: "barrinha" }, [h("i", {}, h("b", { style: `width:${Math.min(100, r.cobertura)}%; background:${cor}` })), `${fmt(r.cobertura, 1)}%`]);
      const totalTxt = r.total != null ? `${fmt(r.total, 1)} mm` : "—";
      const baixar = h("button", { type: "button", class: "icone-botao", title: `Baixar os meses de ${r.a} (CSV)`, "aria-label": `Baixar os meses de ${r.a}`, html: ICONE_BAIXAR });
      baixar.addEventListener("click", () => baixar_(r.a, r.a));
      return h("tr", { class: r.a === topoAno ? "linha-mais-chuvoso" : null }, [
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
  function desenharTudo() { cabecalho(); legendaMensal(); desenharMensal(); recorde(); calor(); painelMes(); tabelaAnual(); }
  desenharTudo();
  O.aoRedimensionar(caixa, desenharMensal);
  O.aoRedimensionar(caixaMes, painelMes);
})();
