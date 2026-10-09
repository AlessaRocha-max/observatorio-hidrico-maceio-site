/* Página "Apoio à decisão": formulário do método CPP-ROC-SORT (conta em cpp-roc-sort.js)
   com um exemplo montado a partir das chuvas extremas das estações (window.DADOS). */
(function () {
  "use strict";
  const O = window.OBS, D = O.D, M = window.CPPROCSORT;
  if (!D || !M) return;
  const { h, $, fmt } = O;
  const GUARDA = "decisao-v1";
  const mediana = O.mediana;
  const media = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  const copia = (x) => JSON.parse(JSON.stringify(x));

  // ------------------------------------------------------------------ exemplo de chuva (dados reais)
  const CRITERIOS_EXEMPLO = [
    { nome: "Chuva forte em 1 hora", campo: "max_1h", resumo: mediana, unidade: "mm",
      explica: "o valor do meio entre os anos da maior chuva em 1 hora" },
    { nome: "Chuva forte em 1 dia", campo: "max_dia", resumo: mediana, unidade: "mm",
      explica: "o valor do meio entre os anos da maior chuva em 1 dia" },
    { nome: "Dias com mais de 50 mm", campo: "dias_50", resumo: media, unidade: "dias/ano", casas: 1,
      explica: "a média por ano de dias com mais de 50 mm" },
  ];
  const ESTACOES = O.medicao.filter((e) => D.extremos.some((x) => x.id === e.id));
  const anosExtremos = D.extremos.map((x) => x.ano);
  const brutos = ESTACOES.map((e) => CRITERIOS_EXEMPLO.map((c) => {
    const v = D.extremos.filter((x) => x.id === e.id && x[c.campo] != null).map((x) => x[c.campo]);
    return v.length ? c.resumo(v) : null;
  }));

  function exemplo() {
    // a estação com o menor valor de cada critério ganha 1, a com o maior ganha 5, as outras ficam no meio
    const notas = brutos.map((linha) => linha.map((v, c) => {
      const col = brutos.map((l) => l[c]).filter((x) => x != null);
      const min = Math.min(...col), max = Math.max(...col);
      return v == null ? null : Math.round((1 + 4 * (max > min ? (v - min) / (max - min) : 0.5)) * 10) / 10;
    }));
    return {
      modo: "exemplo",
      classes: ["Menor", "Intermediária", "Maior"],
      criterios: CRITERIOS_EXEMPLO.map((c) => ({ nome: c.nome, desvio: 0.1 })),
      alternativas: ESTACOES.map((e) => e.nome),
      decisores: [{ nome: "Dados das estações", notas, fronteiras: [[2.3, 2.3, 2.3], [3.7, 3.7, 3.7]] }],
      epsilon: 0.1, aba: 0,
    };
  }
  function emBranco() {
    const notas = () => [[3, 3, 3], [3, 3, 3], [3, 3, 3]];
    return {
      modo: "branco",
      classes: ["C1", "C2", "C3"],
      criterios: [1, 2, 3].map((i) => ({ nome: `Critério ${i}`, desvio: 0.1 })),
      alternativas: ["Opção 1", "Opção 2", "Opção 3"],
      decisores: [1, 2].map((i) => ({ nome: `Decisor ${i}`, notas: notas(), fronteiras: [[2.3, 2.3, 2.3], [3.7, 3.7, 3.7]] })),
      epsilon: 0.1, aba: 0,
    };
  }

  let E = (() => {
    try {
      const g = JSON.parse(localStorage.getItem(GUARDA));
      if (g && g.classes && g.decisores && g.decisores.length) return g;
    } catch { /* sem armazenamento: começa do exemplo */ }
    return exemplo();
  })();
  const guardar = () => { try { localStorage.setItem(GUARDA, JSON.stringify(E)); } catch { /* tudo bem */ } };

  // ------------------------------------------------------------------ peças pequenas
  const ICONES = {
    subir: '<path d="M6 15l6-6 6 6"/>', descer: '<path d="M6 9l6 6 6-6"/>', tirar: '<path d="M6 6l12 12M18 6 6 18"/>',
  };
  const iconeBotao = (tipo, rotulo, acao, desligado) => {
    const b = h("button", { type: "button", class: "icone-botao", title: rotulo, "aria-label": rotulo,
      html: `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[tipo]}</svg>` });
    b.disabled = !!desligado;
    b.addEventListener("click", acao);
    return b;
  };
  const numero = (valor, aoMudar, attrs = {}) => {
    const i = h("input", { type: "number", class: "campo", step: "0.1", inputmode: "decimal", ...attrs });
    if (valor != null) i.value = valor;
    i.addEventListener("input", () => aoMudar(Number.isFinite(i.valueAsNumber) ? i.valueAsNumber : null));
    return i;
  };
  const texto = (valor, aoMudar, attrs = {}) => {
    const i = h("input", { type: "text", class: "campo", ...attrs });
    i.value = valor;
    i.addEventListener("input", () => aoMudar(i.value));
    return i;
  };
  /** Nível de azul (1 a 5) de cada classe, da menor para a maior. */
  const nivel = (pos) => (E.classes.length > 1 ? 1 + Math.round((pos * 4) / (E.classes.length - 1)) : 3);
  const chipClasse = (pos) => h("span", { class: `chip-classe f${nivel(pos)}`, text: E.classes[pos] || `C${pos + 1}` });
  const nomeFronteira = (p) => `${E.classes[p] || `C${p + 1}`} → ${E.classes[p + 1] || `C${p + 2}`}`;

  // mudanças de estrutura: o mesmo ajuste em todos os decisores
  const emTodos = (f) => E.decisores.forEach(f);
  function mudou(redesenhar) { guardar(); if (redesenhar) desenharTudo(); else calcular(); }

  // ------------------------------------------------------------------ 1. classes e critérios
  function desenharAjustes() {
    $("classes").replaceChildren(...E.classes.map((nome, i) => h("div", { class: "campo-linha" }, [
      h("span", { class: `marca-classe f${nivel(i)}`, "aria-hidden": "true" }),
      texto(nome, (v) => { E.classes[i] = v; guardar(); desenharNomes(); calcular(); }, { "aria-label": `Nome da classe ${i + 1}` }),
      iconeBotao("tirar", `Tirar a classe ${nome}`, () => {
        E.classes.splice(i, 1);
        emTodos((d) => d.fronteiras.splice(Math.max(0, i - 1), 1));
        mudou(true);
      }, E.classes.length <= 2),
    ])));

    $("criterios").replaceChildren(...E.criterios.map((c, i) => h("div", { class: "campo-linha criterio-linha" }, [
      h("span", { class: "posicao", text: `${i + 1}º` }),
      texto(c.nome, (v) => { c.nome = v; guardar(); desenharNomes(); calcular(); }, { "aria-label": `Nome do critério ${i + 1}` }),
      h("label", { class: "incerteza", title: "Incerteza da nota, na régua de 0 a 1 (0,1 = 10% da escala)" }, [
        h("span", { text: "incerteza" }),
        numero(c.desvio, (v) => { c.desvio = v; mudou(false); }, { min: "0", step: "0.05", "aria-label": `Incerteza do critério ${c.nome}` }),
      ]),
      iconeBotao("subir", `Subir ${c.nome} (mais importante)`, () => trocarCriterios(i, i - 1), i === 0),
      iconeBotao("descer", `Descer ${c.nome} (menos importante)`, () => trocarCriterios(i, i + 1), i === E.criterios.length - 1),
      iconeBotao("tirar", `Tirar o critério ${c.nome}`, () => {
        E.criterios.splice(i, 1);
        emTodos((d) => { d.notas.forEach((l) => l.splice(i, 1)); d.fronteiras.forEach((l) => l.splice(i, 1)); });
        mudou(true);
      }, E.criterios.length <= 1),
    ])));
    $("epsilon").value = E.epsilon;
  }
  function trocarCriterios(a, b) {
    const troca = (l) => { [l[a], l[b]] = [l[b], l[a]]; };
    troca(E.criterios);
    emTodos((d) => { d.notas.forEach(troca); d.fronteiras.forEach(troca); });
    mudou(true);
  }

  // ------------------------------------------------------------------ 2. notas
  function desenharAbas() {
    $("abas-decisores").replaceChildren(...E.decisores.map((d, i) => {
      const b = h("button", { type: "button", "aria-pressed": String(i === E.aba), text: d.nome || `Decisor ${i + 1}` });
      b.addEventListener("click", () => { E.aba = i; guardar(); desenharAbas(); desenharNotas(); });
      return b;
    }));
    const d = E.decisores[E.aba];
    $("nome-decisor").value = d.nome;
    $("tirar-decisor").disabled = E.decisores.length <= 1;
    $("nota-decisores").textContent = E.decisores.length === 1
      ? "Com um decisor só, o resultado é a opinião dele. Use “+ decisor”: o novo começa com uma cópia destas notas, para mudar o que achar."
      : `Os ${E.decisores.length} decisores pesam igual na opinião do grupo.`;
  }

  function desenharNotas() {
    const d = E.decisores[E.aba];
    const exemploIntacto = E.modo === "exemplo";
    const cab = h("tr", {}, [h("th", { text: "Opção" }), ...E.criterios.map((c, i) =>
      h("th", { class: "num" }, [h("span", { class: "sec", text: `${i + 1}º ` }), c.nome])), h("th", { text: "" })]);
    const linhas = E.alternativas.map((nome, a) => h("tr", {}, [
      h("td", {}, texto(nome, (v) => { E.alternativas[a] = v; guardar(); calcular(); },
        { class: "campo nome-opcao", "aria-label": `Nome da opção ${a + 1}` })),
      ...E.criterios.map((c, ci) => {
        const ent = numero(d.notas[a][ci], (v) => { d.notas[a][ci] = v; mudou(false); },
          { "aria-label": `${nome} — ${c.nome}` });
        // no exemplo, o valor medido aparece ao parar o mouse em cima da nota
        const crit = CRITERIOS_EXEMPLO.find((x) => x.nome === c.nome);
        const est = ESTACOES.findIndex((e) => e.nome === nome);
        if (exemploIntacto && crit && est >= 0 && brutos[est][CRITERIOS_EXEMPLO.indexOf(crit)] != null)
          ent.title = `Medido: ${fmt(brutos[est][CRITERIOS_EXEMPLO.indexOf(crit)], crit.casas ?? 1)} ${crit.unidade} (${crit.explica})`;
        return h("td", { class: "num" }, ent);
      }),
      h("td", {}, iconeBotao("tirar", `Tirar a opção ${nome}`, () => {
        E.alternativas.splice(a, 1);
        emTodos((dd) => dd.notas.splice(a, 1));
        mudou(true);
      }, E.alternativas.length <= 1)),
    ]));
    const fronteiras = d.fronteiras.map((linha, p) => h("tr", { class: "fronteira" }, [
      h("td", {}, [h("span", { class: "rotulo", text: "Fronteira" }), h("div", { text: nomeFronteira(p) })]),
      ...E.criterios.map((c, ci) => h("td", { class: "num" },
        numero(linha[ci], (v) => { linha[ci] = v; mudou(false); }, { "aria-label": `Fronteira ${nomeFronteira(p)} — ${c.nome}` }))),
      h("td", { text: "" }),
    ]));
    $("tabela-notas").replaceChildren(h("thead", {}, cab), h("tbody", {}, [...linhas, ...fronteiras]));
  }

  /** Atualiza só os nomes (de classes e critérios) sem refazer os campos em que a pessoa está digitando. */
  function desenharNomes() {
    const foco = document.activeElement && document.activeElement.closest("#tabela-notas");
    if (!foco) desenharNotas();
    E.classes.forEach((_, i) => { const m = $("classes").children[i]?.querySelector(".marca-classe"); if (m) m.className = `marca-classe f${nivel(i)}`; });
  }

  // ------------------------------------------------------------------ 3. resultado
  let ultimo = null;
  function problemas() {
    const p = [];
    if (E.classes.length < 2) p.push("é preciso pelo menos 2 classes");
    if (!E.alternativas.length) p.push("falta pelo menos uma opção");
    if (!E.criterios.length) p.push("falta pelo menos um critério");
    const vazio = E.decisores.some((d) => [...d.notas.flat(), ...d.fronteiras.flat()].some((v) => v == null));
    if (vazio) p.push("há nota ou fronteira em branco");
    if (E.criterios.some((c) => c.desvio == null || c.desvio < 0)) p.push("a incerteza de cada critério precisa ser um número, 0 ou mais");
    if (E.epsilon == null || E.epsilon < 0 || E.epsilon > 1) p.push("o limite de indiferença (ε) precisa estar entre 0 e 1");
    return p;
  }

  function calcular() {
    const tabela = $("tabela-resultado");
    O.legenda("legenda-classes", E.classes.map((c, i) => ["classe", `var(--seq-${nivel(i)})`, c]));
    const p = problemas();
    if (p.length) {
      ultimo = null;
      tabela.replaceChildren(h("tbody", {}, h("tr", {}, h("td", { class: "aviso-vazio", text: `Para calcular: ${p.join("; ")}.` }))));
      $("texto-pesos").textContent = "";
      return;
    }
    const r = M.classificar({
      alternativas: E.alternativas.map((a, i) => a || `Opção ${i + 1}`),
      criterios: E.criterios.map((c) => c.nome),
      classes: E.classes, desvios: E.criterios.map((c) => c.desvio), epsilon: E.epsilon,
      decisores: E.decisores.map((d) => ({ notas: d.notas, fronteiras: d.fronteiras })),
    });
    ultimo = r;

    const ordem = [...r.resultados].sort((a, b) =>
      b.pontual - a.pontual || media(b.deltas) - media(a.deltas));
    const nP = E.classes.length - 1;
    const cab = h("tr", {}, [h("th", { text: "Opção" }), h("th", { text: "Classe" }),
      ...Array.from({ length: nP }, (_, k) => h("th", { class: "num", text: `δ ${nomeFronteira(k)}` }))]);
    const linhas = ordem.map((x) => {
      const classe = x.intervalos.length
        ? h("span", { class: "entre" }, [chipClasse(x.intervalos[0][0]), h("span", { class: "sec", text: " ou " }),
          chipClasse(x.intervalos.at(-1)[1]), h("div", { class: "sec", text: `no limite · sem o limite: ${E.classes[x.pontual]}` })])
        : chipClasse(x.pontual);
      return h("tr", {}, [
        h("td", { text: x.alternativa }),
        h("td", {}, classe),
        ...x.deltas.map((d) => h("td", { class: "num" + (Math.abs(d) <= E.epsilon ? " no-limite" : "") },
          [(d > 0 ? "+" : d < 0 ? "−" : "") + fmt(Math.abs(d), 2)])),
      ]);
    });
    tabela.replaceChildren(h("thead", {}, cab), h("tbody", {}, linhas));

    $("texto-pesos").textContent = "Quanto mais importante o critério, mais ele pesa. Com " +
      `${E.criterios.length} critério${E.criterios.length > 1 ? "s" : ""}, os pesos ficam: ` +
      E.criterios.map((c, i) => `${c.nome} ${fmt(r.pesos[i] * 100)}%`).join(" · ") + ".";
  }

  // ------------------------------------------------------------------ montagem
  function desenharTudo() {
    E.aba = Math.min(E.aba, E.decisores.length - 1);
    desenharAjustes(); desenharAbas(); desenharNotas(); calcular();
  }

  const anoDe = Math.min(...anosExtremos), anoAte = Math.max(...anosExtremos);
  $("texto-exemplo").textContent = `As opções são as ${ESTACOES.length} estações que medem chuva em Maceió. ` +
    `As notas vêm dos dados de ${anoDe} a ${anoAte}: em cada critério, a estação com o menor valor ganha 1 e a com o maior ganha 5. ` +
    "Pare o mouse sobre uma nota para ver o valor medido. O exemplo classifica quanto cada ponto recebe de chuva forte. " +
    "Os anos com falhas de medição também entram, então algumas estações podem ficar com nota menor do que deveriam.";

  $("epsilon").addEventListener("input", (ev) => {
    E.epsilon = Number.isFinite(ev.target.valueAsNumber) ? ev.target.valueAsNumber : null; mudou(false);
  });
  $("mais-classe").addEventListener("click", () => {
    E.classes.push(`C${E.classes.length + 1}`);
    emTodos((d) => d.fronteiras.push([...d.fronteiras.at(-1)]));
    mudou(true);
  });
  $("mais-criterio").addEventListener("click", () => {
    E.criterios.push({ nome: `Critério ${E.criterios.length + 1}`, desvio: 0.1 });
    emTodos((d) => { d.notas.forEach((l) => l.push(3)); d.fronteiras.forEach((l, p) => l.push(d.fronteiras.length > 1 ? 2.3 + (1.4 * p) / (d.fronteiras.length - 1) : 3)); });
    mudou(true);
  });
  $("mais-alternativa").addEventListener("click", () => {
    E.alternativas.push(`Opção ${E.alternativas.length + 1}`);
    emTodos((d) => d.notas.push(E.criterios.map(() => 3)));
    mudou(true);
  });
  $("mais-decisor").addEventListener("click", () => {
    const base = E.decisores[E.aba];
    E.decisores.push({ nome: `Decisor ${E.decisores.length + 1}`, notas: copia(base.notas), fronteiras: copia(base.fronteiras) });
    E.aba = E.decisores.length - 1;
    mudou(true);
  });
  $("tirar-decisor").addEventListener("click", () => {
    if (E.decisores.length <= 1) return;
    E.decisores.splice(E.aba, 1);
    mudou(true);
  });
  $("nome-decisor").addEventListener("input", (ev) => {
    E.decisores[E.aba].nome = ev.target.value; guardar();
    const b = $("abas-decisores").children[E.aba]; if (b) b.textContent = ev.target.value || `Decisor ${E.aba + 1}`;
  });
  $("recomecar-exemplo").addEventListener("click", () => { E = exemplo(); mudou(true); });
  $("recomecar-branco").addEventListener("click", () => { E = emBranco(); mudou(true); });
  $("baixar-resultado").addEventListener("click", () => {
    if (!ultimo) return;
    const nP = E.classes.length - 1;
    O.baixarCSV("classificacao_cpp_roc_sort.csv", [
      ["opcao", "classe_final", "classe_pontual", "classe_intervalar", ...Array.from({ length: nP }, (_, k) => `delta_${nomeFronteira(k)}`)],
      ...ultimo.resultados.map((x) => [x.alternativa, x.nomeFinal, x.nomePontual, x.nomeIntervalar, ...x.deltas.map((d) => +d.toFixed(4))]),
    ]);
  });

  desenharTudo();
})();
