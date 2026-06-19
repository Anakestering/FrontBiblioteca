// ─── Enums ────────────────────────────────────────────────────────────────────

export type NivelAcesso = 'ADMIN' | 'PADRAO';

/** Status da conta do usuário — espelha o enum StatusConta do backend */
export type StatusConta = 'ATIVO' | 'PENDENTE' | 'INATIVO';

export type TipoUsuario = 'SENAI' | 'SESI' | 'COLABORADOR' | 'RESPONSAVEL' | 'OUTRO';

export interface UsuarioOutroInfo {
  ondeConheceu?: string;
  trabalha: boolean;
  ondeTrabalha?: string;
}

export type StatusReserva =
  | 'PENDENTE_APROVACAO'
  | 'APROVADA'
  | 'CANCELADA'
  | 'ATRASADO'
  | 'EM_ANDAMENTO'
  | 'FINALIZADA'
  | 'REJEITADA';

export type StatusAprovacao = 'PENDENTE' | 'APROVADA' | 'REJEITADA';

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface Usuario {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  telefone?: string;
  nivelAcesso: NivelAcesso;
  ativo: boolean;
  statusConta: StatusConta;
  createdAt: string;
  updatedAt: string;
  tipoUsuario?: TipoUsuario;
  outroInfo?: UsuarioOutroInfo;
}



export interface Computador {
  id: number;
  codigo: string;
  capacidadePessoas: number;
  observacao?: string;
  ativo: boolean;
}

export interface Sala {
  id: number;
  nome: string;
  capacidadePessoas: number;
  ativo: boolean;
}

export interface ReservaComputador {
  id: number;
  computador: Computador;
  usuario: Usuario;
  criadaPorUsuario: Usuario;
  inicioPrevisto: string;
  fimPrevisto: string;
  qtdePessoas: number;
  status: StatusReserva;
  observacao?: string;
  pedido?: PedidoReserva;
  checkinEm?: string;
  checkoutEm?: string;
  canceladaEm?: string;
  atrasadoEm?: string;
  checkoutAutomatico: boolean;
}

export interface ReservaSala {
  id: number;
  sala: Sala;
  usuario: Usuario;
  criadaPorUsuario: Usuario;
  inicioPrevisto: string;
  fimPrevisto: string;
  qtdePessoas: number;
  status: StatusReserva;
  observacao?: string;
  pedido?: PedidoReserva;
  checkinEm?: string;
  checkoutEm?: string;
  canceladaEm?: string;
  atrasadoEm?: string;
  checkoutAutomatico: boolean;
}

export interface AprovacaoReserva {
  id: number;
  pedido: PedidoReserva;
  status: StatusAprovacao;
  solicitadaEm: string;
  decididaEm?: string;
  decididaPorUsuario?: Usuario;
  motivo?: string;
}

export type TipoPedido = 'COMPUTADOR' | 'SALA';

export interface PedidoReserva {
  id: number;
  usuario: Usuario;
  criadaPorUsuario: Usuario;
  tipo: TipoPedido;
  inicioPrevisto: string;
  fimPrevisto: string;
  qtdePessoas: number;
  status: StatusReserva;
  observacao?: string;
  reservasComputador: ReservaComputador[];
  reservasSala: ReservaSala[];
  naJanelaCheckin?: boolean;
}


// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface AuthDTO {
  email: string;
  senha: string;
}

export interface AuthResponse {
  token: string;
  tipo: NivelAcesso;
}

export interface CadastroDTO {
  nome: string;
  telefone?: string;
  cpf: string;
  email: string;
  senha?: string;
  tipoUsuario: TipoUsuario;
  outroInfo?: UsuarioOutroInfo;
}

export interface ReservaComputadorDTO {
  computadorId: number;
  inicioPrevisto: string;
  qtdePessoas: number;
  observacao?: string;
}

export interface ReservaSalaDTO {
  salaId: number;
  inicioPrevisto: string;
  qtdePessoas: number;
  observacao?: string;
}

export interface ComputadorDTO {
  id?: number;
  codigo: string;
  capacidadePessoas: number;
  observacao?: string;
}

export interface SalaDTO {
  id?: number;
  nome: string;
  capacidadePessoas: number;
}

export interface PedidoReservaDTO {
  tipo: TipoPedido;
  itemIds: number[];
  usuarioId?: number;
  inicioPrevisto: string;
  fimPrevisto: string;
  qtdePessoas: number;
  observacao?: string;
}

export interface RecuperacaoSolicitacaoDTO {
  email: string;
}

export interface RecuperarSenhaDTO {
  email: string;
  codigo: string;
  novaSenha: string;
}

export interface TrocarSenhaDTO {
  senhaAtual: string;
  novaSenha: string;
}



// ─── Relatórios ──────────────────────────────────────────────────────────────
export interface EstatisticasRecursoDTO {
  id: number;
  nome: string;
  totalMinutosUsados: number;
  totalReservasFinalizadas: number;
  minutosDisponiveis: number;        // diasUteis * 900min
  minutosReservadosFuturos: number;  // reservas APROVADA/PENDENTE futuras
}

export interface EstatisticasStatusReservasDTO {
  finalizadas: number;
  canceladas: number;
  atrasadas: number;
  rejeitadas: number;
  total: number;
}

export interface EstatisticasResumoDTO {
  totalPedidos: number;        // pedidos de reserva finalizados (métrica principal)
  totalReservas: number;       // recursos individuais (salas + PCs) utilizados
  taxaOcupacaoMedia: number;
  taxaNoShow: number;
  recursoMaisUsado: string;
  tipoRecursoMaisUsado: string;
}

export interface EstatisticasHeatmapDTO {
  diaSemana: number;
  hora: number;
  totalPrimeiraMetade: number;
  totalSegundaMetade: number;
  valorParaCor: number;
  media: number;
}

export interface EstatisticasPontoHistoricoDTO {
  data: string;
  total: number;           // pedidos finalizados (linha do gráfico)
  mm?: number;             // média móvel, calculada no backend
  totalReservas?: number;  // recursos individuais utilizados (tooltip)
}

export interface EstatisticasOcupacaoDiaDTO {
  diaSemana: number;
  nome: string;
  taxaOcupacao: number;
}

/** Tendencia calculada no backend: pct = percentual de variacao, subindo = direcao */
export interface EstatisticasTendencia {
  pct: number;
  subindo: boolean;
}

/** Ponto de serie de abandonos (pedidos com status ATRASADO) no grafico linear */
export interface EstatisticasPontoAbandono {
  data: string;
  total: number;
  mm?: number;
}

export interface DistribuicaoTipoDTO {
  tipo: string;
  usuariosFinalizados: number;
  pedidosFinalizados: number;
  mediaVisitas: number;
  usuariosAbandonos: number;
  totalAbandonos: number;
  usuariosCancelamentos: number;
  totalCancelamentos: number;
}

export interface RankingUsuarioDTO {
  id: number;
  nome: string;
  tipoUsuario: string | null;
  cpf: string | null;
  pedidosFinalizados: number;
  pedidosCancelados: number;
  pedidosAbandono: number;
  taxaAbandono: number;
}

export interface CrescimentoMesDTO {
  mes: string;
  novosCadastros: number;
  primeiroUso: number;
}

export interface EstatisticasUsuariosDTO {
  distribuicao: DistribuicaoTipoDTO[];
  ranking: RankingUsuarioDTO[];
  naoCompareceram: RankingUsuarioDTO[];
  crescimento: CrescimentoMesDTO[];
  totalAtivos: number;
  totalCadastrados: number;
  totalPorTipo: Record<string, number>;
  novosPorTipo: Record<string, number>;
  ativosPorTipo: Record<string, number>;
}

/** Resposta completa do endpoint GET /estatisticas/historico */
export interface EstatisticasHistoricoDTO {
  pontos: EstatisticasPontoHistoricoDTO[];
  abandonos: EstatisticasPontoAbandono[];
  tendencia: EstatisticasTendencia | null;
  tendenciaAbandono: EstatisticasTendencia | null;
  mediaPessoasDia: number;
  taxaAbandono: number;
}
