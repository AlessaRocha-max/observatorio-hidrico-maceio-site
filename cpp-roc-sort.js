/* Método CPP-ROC-SORT — a mesma conta do software de Roger (github.com/Rogerleite1305/CPP-ROC-SORT,
   arquivo modelo_cpp_roc_sort.py), reescrita em JavaScript para rodar no site sem servidor.
   Não depende da página: pode ser testada sozinha (node) contra o original em Python. */
(function (raiz) {
  "use strict";

  /** Distribuição normal acumulada (o norm.cdf do SciPy), via erf com precisão de ~1e-15. */
  function erf(x) {
    // série de Taylor perto de zero, fração contínua (erfc) longe dele
    const ax = Math.abs(x);
    if (ax < 2.5) {
      let soma = x, termo = x, n = 0;
      while (Math.abs(termo) > 1e-17 * Math.abs(soma)) {
        n++;
        termo *= -x * x / n;
        soma += termo / (2 * n + 1);
      }
      return (2 / Math.sqrt(Math.PI)) * soma;
    }
    if (ax > 27) return Math.sign(x);
    let f = 0;
    for (let k = 60; k >= 1; k--) f = (k / 2) / (ax + f);
    const erfc = Math.exp(-ax * ax) / Math.sqrt(Math.PI) / (ax + f);
    return Math.sign(x) * (1 - erfc);
  }
  const normalAcumulada = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

  /** Pesos ROC: o critério na posição r (1 = mais importante) de m critérios pesa (1/m)·Σ_{j=r..m} 1/j. */
  function pesosROC(m) {
    return Array.from({ length: m }, (_, i) => {
      let s = 0;
      for (let j = i + 1; j <= m; j++) s += 1 / j;
      return s / m;
    });
  }

  /**
   * Classifica as alternativas.
   * entrada = {
   *   alternativas: [nome], criterios: [nome] (em ordem de importância), classes: [nome] (da menor para a maior),
   *   desvios: [número por critério], epsilon: número,
   *   decisores: [{ notas: [[nota por critério] por alternativa], fronteiras: [[nota por critério] por fronteira] }],
   *   pesosDecisores?: [número por decisor]  (sem isso, todos pesam igual)
   * }
   * Fronteiras = classes − 1. Como no app original, as fronteiras usadas são a média entre os decisores.
   */
  function classificar(entrada) {
    const { alternativas, criterios, classes, desvios, decisores } = entrada;
    const epsilon = +entrada.epsilon;
    const nA = alternativas.length, nC = criterios.length, nP = classes.length - 1, nD = decisores.length;

    // fronteiras = média entre os decisores
    const fronteiras = Array.from({ length: nP }, (_, p) =>
      Array.from({ length: nC }, (_, c) => decisores.reduce((s, d) => s + d.fronteiras[p][c], 0) / nD));

    // normalização conjunta [0, 1]: notas de todos os decisores e fronteiras na mesma régua
    const todos = [...decisores.flatMap((d) => d.notas.flat()), ...fronteiras.flat()];
    const min = Math.min(...todos), max = Math.max(...todos);
    const amplitude = max !== min ? max - min : 1;
    const norm = (v) => (v - min) / amplitude;

    const pesos = pesosROC(nC);
    let pesosDec = entrada.pesosDecisores;
    const somaPD = pesosDec ? pesosDec.reduce((a, b) => a + b, 0) : 0;
    pesosDec = somaPD ? pesosDec.map((p) => p / somaPD) : decisores.map(() => 1 / nD);

    // probabilidade de superação e agregação por decisor e em grupo
    const individual = decisores.map((d) => d.notas.map((linha) => fronteiras.map((fr) => {
      let soma = 0;
      for (let c = 0; c < nC; c++) {
        const V = desvios[c] ** 2;
        const dp = V > 0 ? Math.sqrt(2 * V) : 0.001;
        soma += pesos[c] * normalAcumulada((norm(linha[c]) - norm(fr[c])) / dp);
      }
      return soma;
    })));
    const grupo = alternativas.map((_, a) => fronteiras.map((_, p) =>
      individual.reduce((s, ind, d) => s + pesosDec[d] * ind[a][p], 0)));
    const deltas = grupo.map((linha) => linha.map((A) => 2 * A - 1));

    // classificação pontual (sinais do δ nas fronteiras) e intervalar (|δ| ≤ ε)
    const resultados = alternativas.map((nome, a) => {
      const d = deltas[a];
      let pontual = 0;
      if (d[0] < 0) pontual = 0;
      else if (d[nP - 1] >= 0) pontual = nP;
      else for (let i = 0; i < nP - 1; i++) if (d[i] >= 0 && d[i + 1] < 0) { pontual = i + 1; break; }
      const intervalos = [];
      d.forEach((v, i) => { if (Math.abs(v) <= epsilon && i < classes.length - 1) intervalos.push([i, i + 1]); });
      return {
        alternativa: nome,
        deltas: d,
        indices: grupo[a],
        pontual,                       // posição da classe (0 = menor)
        intervalos,                    // pares de posições [i, i+1]
        nomePontual: classes[pontual],
        nomeIntervalar: intervalos.length ? intervalos.map(([i, j]) => `[${classes[i]} , ${classes[j]}]`).join(" / ") : "-",
        nomeFinal: intervalos.length ? intervalos.map(([i, j]) => `[${classes[i]} , ${classes[j]}]`).join(" / ") : classes[pontual],
      };
    });

    return { pesos, pesosDecisores: pesosDec, fronteiras, min, max, resultados };
  }

  const api = { classificar, pesosROC, normalAcumulada };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.CPPROCSORT = api;
})(this);
