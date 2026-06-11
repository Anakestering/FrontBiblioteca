// ─── Enums ────────────────────────────────────────────────────────────────────

export type NivelAcesso = 'ADMIN' | 'PADRAO';

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
  createdAt: string;
  updatedAt: string;
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
  senha: string;
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
  minutosDisponiveis: number; // calculado pelo backend: diasUteis * 900min
}

export interface EstatisticasStatusReservasDTO {
  finalizadas: number;
  canceladas: number;
  atrasadas: number;
  rejeitadas: number;
  total: number;
}

export interface EstatisticasResumoDTO {
  totalReservas: number;
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
  total: number;
  mm?: number; // média móvel, calculada no backend
}

export interface EstatisticasOcupacaoDiaDTO {
  diaSemana: number;
  nome: string;
  taxaOcupacao: number;
}

export interface EstatisticasHistoricoDTO {
  pontos: EstatisticasPontoHistoricoDTO[];
  tendencia: { pct: number; subindo: boolean } | null;
  mediaPessoasDia: number;
}