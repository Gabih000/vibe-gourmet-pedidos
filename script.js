const NUMERO_LOJA = "5519982098645";   // WhatsApp da Vibe Gourmet 

const CHAVE_ARMAZENAMENTO = "vibegourmet:dados";
const MAX_DIAS_HISTORICO = 60;


// Elementos da pagina
const campoNome = document.getElementById("nome");
const campoTelefone = document.getElementById("telefone");
const campoEndereco = document.getElementById("endereco");
const campoTroco = document.getElementById("troco");
const blocoTroco = document.getElementById("campo-troco");
const campoTaxa = document.getElementById("taxa");
const campoObservacoes = document.getElementById("observacoes");

const listaItens = document.getElementById("lista-itens");
const avisoVazio = document.getElementById("aviso-vazio");
const modeloLinha = document.getElementById("modelo-linha");
const modeloAdicional = document.getElementById("modelo-adicional");
const totalPedido = document.getElementById("total-pedido");
const contadorPedidos = document.getElementById("contador-pedidos");

const botaoEnviar = document.getElementById("botao-enviar");
const botaoExportar = document.getElementById("botao-exportar");
const botaoFecharDia = document.getElementById("botao-fechar-dia");

// Janela "Fechar o dia"
const janela = document.getElementById("janela-fechar-dia");
const janelaData = document.getElementById("janela-data");
const janelaPedidos = document.getElementById("janela-pedidos");
const janelaTotal = document.getElementById("janela-total");
const janelaTaxas = document.getElementById("janela-taxas");
const janelaAviso = document.getElementById("janela-aviso");
const janelaCancelar = document.getElementById("janela-cancelar");
const janelaConfirmar = document.getElementById("janela-confirmar");


// Estado do pedido
let formaPagamento = "Pix";

//funções uxiliares

// Converte texto digitado em número
function paraNumero(texto) {
  let limpo = String(texto).replace(/[^\d,.-]/g, "");
  if (limpo.includes(",")) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  }
  const numero = parseFloat(limpo);
  return isNaN(numero) ? 0 : numero;
}

// Converte número comum em dinheiro
function formatarMoeda(numero) {
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Converte número em texto de campo
function formatarCampo(numero) {
  return numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Aplica a máscara do telefone e limita a 11 dígitos
function formatarTelefone(texto) {
  const d = texto.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Data de hoje no formato AAAA-MM-DD 
function dataHoje() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

// "2026-10-14" -> "14/10/2026"
function dataBonita(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

// "2026-10-14" -> "Quarta-feira, 14 de outubro de 2026"
function dataExtenso(dataISO) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const texto = new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}



//ARMAZENAMENTO LOCAL Guarda: dia, pedidos, totalDia, taxasDia e o histórico dos dias fechados.

let dados = carregarDados();

function carregarDados() {
  let salvo = null;
  try {
    salvo = JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO));
  } catch (erro) {
    salvo = null;
  }
  if (!salvo || typeof salvo !== "object") {
    salvo = { dia: dataHoje(), pedidos: 0, totalDia: 0, taxasDia: 0, historico: [] };
  }
  if (!Array.isArray(salvo.historico)) salvo.historico = [];
  if (typeof salvo.taxasDia !== "number") salvo.taxasDia = 0;

  // Se o dia mudou desde a última vez, guarda o dia anterior e zera
  if (salvo.dia !== dataHoje()) {
    arquivarDia(salvo);
    salvo.dia = dataHoje();
    salvo.pedidos = 0;
    salvo.totalDia = 0;
    salvo.taxasDia = 0;
  }
  return salvo;
}

function salvarDados() {
  try {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(dados));
  } catch (erro) {
    console.warn("Não foi possível salvar os dados neste navegador.");
  }
}

// Coloca o dia atual no histórico (soma se o dia já estiver lá)
function arquivarDia(objeto) {
  if (objeto.pedidos <= 0) return;
  const existente = objeto.historico.find((item) => item.dia === objeto.dia);
  if (existente) {
    existente.pedidos += objeto.pedidos;
    existente.total += objeto.totalDia;
    existente.taxas = (existente.taxas || 0) + objeto.taxasDia;
  } else {
    objeto.historico.push({
      dia: objeto.dia,
      pedidos: objeto.pedidos,
      total: objeto.totalDia,
      taxas: objeto.taxasDia,
    });
  }
  objeto.historico = objeto.historico.slice(-MAX_DIAS_HISTORICO);
}

function mostrarContador() {
  contadorPedidos.textContent = dados.pedidos;
}


// Itens e Adicionais do pedido

// Cria um item novo a partir do molde 
function adicionarItem(nomeDoItem) {
  const item = modeloLinha.content.firstElementChild.cloneNode(true);
  const campoDescricao = item.querySelector(".linha-item__descricao");
  campoDescricao.value = nomeDoItem + " - ";
  listaItens.appendChild(item);

  // Foca no campo com o cursor no final
  campoDescricao.focus();
  const fim = campoDescricao.value.length;
  campoDescricao.setSelectionRange(fim, fim);
  atualizarResumo();
}

// Cria um adicional dentro de um item específico
function adicionarAdicional(itemPedido) {
  const linha = modeloAdicional.content.firstElementChild.cloneNode(true);
  itemPedido.querySelector(".adicionais").appendChild(linha);
  linha.querySelector(".linha-adicional__descricao").focus();
  atualizarResumo();
}

// Lê todos os itens (com seus adicionais) e devolve uma lista de dados.
// O valor do item e dos adicionais é POR UNIDADE: o subtotal multiplica pela quantidade.
function lerItens() {
  const itens = listaItens.querySelectorAll(".item-pedido");
  return Array.from(itens).map((item) => {
    const qtd = parseInt(item.querySelector(".linha-item__qtd").value, 10) || 1;
    const descricao = item.querySelector(".linha-item__descricao").value.trim();
    const valor = paraNumero(item.querySelector(".linha-item__valor").value);

    const adicionais = Array.from(item.querySelectorAll(".linha-adicional")).map((linha) => ({
      descricao: linha.querySelector(".linha-adicional__descricao").value.trim(),
      valor: paraNumero(linha.querySelector(".linha-adicional__valor").value),
    }));
    const somaAdicionais = adicionais.reduce((soma, a) => soma + a.valor, 0);

    return { qtd, descricao, valor, adicionais, subtotal: qtd * (valor + somaAdicionais) };
  });
}

function calcularTotal(itens) {
  const somaItens = itens.reduce((soma, item) => soma + item.subtotal, 0);
  return somaItens + paraNumero(campoTaxa.value);
}

// Recalcula o total e mostra/esconde o aviso de lista vazia
function atualizarResumo() {
  const itens = lerItens();
  totalPedido.textContent = formatarMoeda(calcularTotal(itens));
  avisoVazio.hidden = itens.length > 0;
}


// Mensagens do Whatsapp

// Lista dos itens, com os adicionais logo abaixo de cada um
function textoItens(itens) {
  return itens.map((item) => {
    let texto = `- ${item.qtd}x ${item.descricao}`;
    item.adicionais
      .filter((adicional) => adicional.descricao)
      .forEach((adicional) => {
        texto += `\n   + ${adicional.descricao}`;
      });
    return texto;
  }).join("\n");
}

function mensagemPedido(numeroPedido, itens) {
  let texto = `*PEDIDO #${numeroPedido}*\n\n`;

  texto += `*Cliente:* ${campoNome.value.trim()}\n`;
  if (campoTelefone.value.trim()) {
    texto += `*Telefone:* ${campoTelefone.value.trim()}\n`;
  }
  texto += `*Endereço:* ${campoEndereco.value.trim()}\n\n`;

  texto += `*Itens:*\n${textoItens(itens)}\n\n`;

  if (campoObservacoes.value.trim()) {
    texto += `*Obs:* ${campoObservacoes.value.trim()}\n\n`;
  }

  texto += `*Pagamento:* ${formaPagamento}\n`;
  if (formaPagamento === "Dinheiro" && campoTroco.value.trim()) {
    texto += `*Troco para:* ${formatarMoeda(paraNumero(campoTroco.value))}\n`;
  }
  texto += `*Taxa de entrega:* ${formatarMoeda(paraNumero(campoTaxa.value))}\n\n`;

  texto += `*TOTAL: ${formatarMoeda(calcularTotal(itens))}*`;
  return texto;
}

// Monta o link: https://wa.me/NUMERO?text=MENSAGEM
function montarLink(numero, mensagem) {
  const soDigitos = numero.replace(/\D/g, "");
  return `https://wa.me/${soDigitos}?text=${encodeURIComponent(mensagem)}`;
}

function numeroConfigurado(numero) {
  return /^\d{12,13}$/.test(numero.replace(/\D/g, ""));
}


// Envio do pedido

function enviarPedido() {
  const itens = lerItens();

  // Validações antes de enviar
  if (itens.length === 0) {
    alert("Adicione pelo menos um item ao pedido.");
    return;
  }
  if (!campoNome.value.trim() || !campoEndereco.value.trim()) {
    alert("Preencha o nome e o endereço do cliente.");
    return;
  }
  const digitosTelefone = campoTelefone.value.replace(/\D/g, "");
  if (digitosTelefone && digitosTelefone.length < 10) {
    alert("O telefone está incompleto. Informe o DDD e o número.");
    return;
  }
  if (!numeroConfigurado(NUMERO_LOJA)) {
    alert("Configure o número de WhatsApp da loja no começo do arquivo script.js.");
    return;
  }

  const numeroPedido = dados.pedidos + 1;

  // Abre o WhatsApp da loja com o pedido completo
  window.open(montarLink(NUMERO_LOJA, mensagemPedido(numeroPedido, itens)), "_blank");

  // Pedido concluído: soma no contador, no total do dia e no total de taxas
  dados.pedidos = numeroPedido;
  dados.totalDia += calcularTotal(itens);
  dados.taxasDia += paraNumero(campoTaxa.value);
  salvarDados();
  mostrarContador();
  limparPedido();
}

// Esvazia o formulário para o próximo pedido
function limparPedido() {
  campoNome.value = "";
  campoTelefone.value = "";
  campoEndereco.value = "";
  campoTroco.value = "";
  campoTaxa.value = "0,00";
  campoObservacoes.value = "";
  listaItens.querySelectorAll(".item-pedido").forEach((item) => item.remove());
  definirPagamento("Pix");
  atualizarResumo();
}


//Pagamento

function definirPagamento(forma) {
  formaPagamento = forma;
  document.querySelectorAll(".botao-opcao").forEach((botao) => {
    botao.classList.toggle("ativo", botao.dataset.pagamento === forma);
  });

  const dinheiro = forma === "Dinheiro";
  blocoTroco.hidden = !dinheiro;
  if (!dinheiro) campoTroco.value = "";
}


//Fechamento do dia

// Abre a janela com o resumo do dia
function abrirJanelaFecharDia() {
  const temPedidos = dados.pedidos > 0;

  janelaData.textContent = dataExtenso(dados.dia);
  janelaPedidos.textContent = dados.pedidos;
  janelaTotal.textContent = formatarMoeda(dados.totalDia);
  janelaTaxas.textContent = formatarMoeda(dados.taxasDia);
  janelaConfirmar.disabled = !temPedidos;
  janelaAviso.textContent = temPedidos
    ? "Ao fechar, o contador do dia volta para zero e o resumo é guardado no histórico."
    : "Ainda não há pedidos hoje.";

  janela.showModal();
}

// Confirma: guarda o dia no histórico e zera os números
function confirmarFecharDia() {
  arquivarDia(dados);
  dados.pedidos = 0;
  dados.totalDia = 0;
  dados.taxasDia = 0;
  salvarDados();
  mostrarContador();
  janela.close();
}

function exportarResumo() {
  let texto = "VIBE GOURMET - RESUMO DE PEDIDOS\n\n";
  texto += `Hoje (${dataBonita(dados.dia)}): ${dados.pedidos} pedidos - ${formatarMoeda(dados.totalDia)} - taxas ${formatarMoeda(dados.taxasDia)}\n\n`;
  texto += "Dias anteriores:\n";
  if (dados.historico.length === 0) {
    texto += "(nenhum dia fechado ainda)\n";
  }
  dados.historico.slice().reverse().forEach((item) => {
    texto += `${dataBonita(item.dia)} - ${item.pedidos} pedidos - ${formatarMoeda(item.total)} - taxas ${formatarMoeda(item.taxas || 0)}\n`;
  });

  // Baixa o resumo como arquivo de texto
  const arquivo = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(arquivo);
  link.download = `resumo-vibe-gourmet-${dados.dia}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}


// Botões de item 
document.querySelectorAll(".botao-item").forEach((botao) => {
  botao.addEventListener("click", () => adicionarItem(botao.dataset.item));
});

// Botões de pagamento
document.querySelectorAll(".botao-opcao").forEach((botao) => {
  botao.addEventListener("click", () => definirPagamento(botao.dataset.pagamento));
});

// Telefone: aplica a máscara e limita os dígitos a cada tecla
campoTelefone.addEventListener("input", () => {
  campoTelefone.value = formatarTelefone(campoTelefone.value);
});

// Digitou na lista (quantidade, valores): recalcula o total
listaItens.addEventListener("input", atualizarResumo);

// Cliques dentro da lista: remover item, remover adicional ou adicionar adicional
listaItens.addEventListener("click", (evento) => {
  const removerItem = evento.target.closest(".linha-item__remover");
  if (removerItem) {
    removerItem.closest(".item-pedido").remove();
    atualizarResumo();
    return;
  }

  const removerAdicional = evento.target.closest(".linha-adicional__remover");
  if (removerAdicional) {
    removerAdicional.closest(".linha-adicional").remove();
    atualizarResumo();
    return;
  }

  const botaoAdicional = evento.target.closest(".botao-adicional");
  if (botaoAdicional) {
    adicionarAdicional(botaoAdicional.closest(".item-pedido"));
  }
});

// Mudou a taxa de entrega: recalcula o total
campoTaxa.addEventListener("input", atualizarResumo);

// Ao sair de um campo de valor, padroniza para o formato 0,00
document.addEventListener("focusout", (evento) => {
  const campo = evento.target;
  if (campo.matches(".campo__entrada--valor") && campo.value.trim() !== "") {
    campo.value = formatarCampo(paraNumero(campo.value));
    atualizarResumo();
  }
});

botaoEnviar.addEventListener("click", enviarPedido);
botaoExportar.addEventListener("click", exportarResumo);

// Fechar o dia: abre a janela; "Voltar" ou clique fora dela fecha sem mudar nada
botaoFecharDia.addEventListener("click", abrirJanelaFecharDia);
janelaCancelar.addEventListener("click", () => janela.close());
janelaConfirmar.addEventListener("click", confirmarFecharDia);
janela.addEventListener("click", (evento) => {
  if (evento.target === janela) janela.close();
});


definirPagamento("Pix");
mostrarContador();
atualizarResumo();
salvarDados();