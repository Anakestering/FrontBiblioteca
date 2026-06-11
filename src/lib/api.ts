import {
  AuthDTO, AuthResponse, CadastroDTO,
  Computador, ComputadorDTO,
  Sala, SalaDTO,
  ReservaComputador,
  ReservaSala,
  AprovacaoReserva, Usuario,
  PedidoReservaDTO,
  PedidoReserva,
  RecuperacaoSolicitacaoDTO, RecuperarSenhaDTO, TrocarSenhaDTO,
  EstatisticasHeatmapDTO,
  EstatisticasStatusReservasDTO,
  EstatisticasRecursoDTO,
  EstatisticasHistoricoDTO,
  EstatisticasResumoDTO,
  EstatisticasOcupacaoDiaDTO,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.message ?? json.error ?? text ?? `Erro ${res.status}`);
    } catch (parseErr) {
      if (parseErr instanceof SyntaxError) {
        throw new Error(text || `Erro ${res.status}`);
      }
      throw parseErr;
    }
  }


  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }

  return (await res.text()) as T;
}




// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  login: (dto: AuthDTO) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(dto) }),
  cadastrar: (dto: CadastroDTO) =>
    request<string>('/usuarios/cadastro', { method: 'POST', body: JSON.stringify(dto) }),
  solicitarRecuperacao: (dto: RecuperacaoSolicitacaoDTO) =>
    request<{ message: string; expiresAt: string }>('/auth/recuperar-senha/solicitar', { method: 'POST', body: JSON.stringify(dto) }),
  alterarSenha: (dto: RecuperarSenhaDTO) =>
    request<{ message: string }>('/auth/recuperar-senha/alterar', {
      method: 'POST', body: JSON.stringify(dto),
    }),
};
// ─── Computadores ─────────────────────────────────────────────────────────────
export const computadores = {
  listar: () => request<Computador[]>('/computadores'),
  listarTodos: () => request<Computador[]>('/computadores/todos'),
  buscar: (id: number) => request<Computador>(`/computadores/${id}`),
  criar: (dto: ComputadorDTO) =>
    request<Computador>('/computadores', { method: 'POST', body: JSON.stringify(dto) }),
  atualizar: (id: number, dto: ComputadorDTO) =>
    request<Computador>(`/computadores/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  ativar: (id: number) =>
    request<void>(`/computadores/${id}/ativar`, { method: 'PATCH' }),
  desativar: (id: number) =>
    request<void>(`/computadores/${id}/desativar`, { method: 'PATCH' }),
  deletar: (id: number) =>
    request<void>(`/computadores/${id}`, { method: 'DELETE' }),

};


// ─── Salas ────────────────────────────────────────────────────────────────────
export const salas = {
  listar: () => request<Sala[]>('/salas'),
  listarTodas: () => request<Sala[]>('/salas/todas'),
  buscar: (id: number) => request<Sala>(`/salas/${id}`),
  criar: (dto: SalaDTO) =>
    request<Sala>('/salas', { method: 'POST', body: JSON.stringify(dto) }),
  atualizar: (id: number, dto: SalaDTO) =>
    request<Sala>(`/salas/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  ativar: (id: number) =>
    request<void>(`/salas/${id}/ativar`, { method: 'PATCH' }),
  desativar: (id: number) =>
    request<void>(`/salas/${id}/desativar`, { method: 'PATCH' }),
  deletar: (id: number) =>
    request<void>(`/salas/${id}`, { method: 'DELETE' }),

};

// ─── Reservas Computador ─────────────────────────────────────────────────────
export const reservasComputador = {
  ocupados: (computadorId: number, data: string) =>
    request<string[]>(`/reservas/computador/${computadorId}/ocupados?data=${data}`),
  cancelarComoAdmin: (id: number) =>
    request<ReservaComputador>(`/reservas/computador/${id}/cancelar-admin`, { method: 'POST' }),
};

// ─── Reservas Sala ────────────────────────────────────────────────────────────
export const reservasSala = {
  ocupados: (salaId: number, data: string) =>
    request<string[]>(`/reservas/sala/${salaId}/ocupados?data=${data}`),
  cancelarComoAdmin: (id: number) =>
    request<ReservaSala>(`/reservas/sala/${id}/cancelar-admin`, { method: 'POST' }),
};

// ─── Aprovações ───────────────────────────────────────────────────────────────
export const aprovacoes = {
  pendentes: () => request<AprovacaoReserva[]>('/aprovacoes/pendentes'),
  aprovar: (id: number, motivo?: string) =>
    request<AprovacaoReserva>(`/aprovacoes/${id}/aprovar${motivo ? `?motivo=${encodeURIComponent(motivo)}` : ''}`, { method: 'POST' }),
  rejeitar: (id: number, motivo?: string) =>
    request<AprovacaoReserva>(`/aprovacoes/${id}/rejeitar${motivo ? `?motivo=${encodeURIComponent(motivo)}` : ''}`, { method: 'POST' }),
};

export const pedidos = {
  criar: (dto: PedidoReservaDTO) =>
    request<PedidoReserva>('/pedidos', { method: 'POST', body: JSON.stringify(dto) }),
  meus: () => request<PedidoReserva[]>('/pedidos/minhos'),
  todos: () => request<PedidoReserva[]>('/pedidos'),
  cancelarComoAdmin: (id: number) =>
    request<unknown>(`/pedidos/${id}/cancelar-admin`, { method: 'POST' }),
  checkin: (id: number) =>
    request<void>(`/pedidos/${id}/checkin`, { method: 'POST' }),
  checkout: (id: number) =>
    request<void>(`/pedidos/${id}/checkout`, { method: 'POST' }),
  cancelar: (id: number) =>
    request<void>(`/pedidos/${id}/cancelar`, { method: 'POST' }),
  filtrar: (params: { data?: string; dataInicio?: string; dataFim?: string; status?: string; busca?: string; }) => {
    const query = new URLSearchParams();
    // Filtros globais que sempre podem existir independente da rota
    if (params.status) query.set('status', params.status);
    if (params.busca) query.set('busca', params.busca);
    // Se passou início e fim, vai estritamente para a rota de período
    if (params.dataInicio && params.dataFim) {
      query.set('dataInicio', params.dataInicio);
      query.set('dataFim', params.dataFim);
      return request<PedidoReserva[]>(`/pedidos/filtrar/periodo?${query.toString()}`);
    }
    // Se não é período, mas tem uma data específica, adiciona na query da rota comum
    if (params.data) {
      query.set('data', params.data);
    }
    return request<PedidoReserva[]>(`/pedidos/filtrar?${query.toString()}`);
  },
  filtrarPorDia: (data: string) => {
    return request<PedidoReserva[]>(`/pedidos/filtrar?data=${data}`);
  },
  filtrarPorPeriodo: (dataInicio: string, dataFim: string) => {
    return request<PedidoReserva[]>(`/pedidos/filtrar/periodo?dataInicio=${dataInicio}&dataFim=${dataFim}`);
  },
};

// ─── Usuários ─────────────────────────────────────────────────────────────────
export const usuarios = {
  listar: () => request<Usuario[]>('/usuarios'),           // só admin deve usar
  buscarMe: () => request<Usuario>('/usuarios/me'),        // novo — perfil do usuário logado
  buscarPorTermo: (termo: string) => request<Usuario[]>(`/usuarios/buscar?termo=${encodeURIComponent(termo)}`),
  atualizar: (id: number, dto: Partial<{ nome: string; email: string; cpf: string; telefone?: string }>) =>
    request<Usuario>(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deletar: (id: number) => request<void>(`/usuarios/${id}`, { method: 'DELETE' }),
  ativar: (id: number) =>
    request(`/usuarios/${id}/ativar`, { method: 'PUT' }),
  trocarSenha: (dto: TrocarSenhaDTO) =>
    request<{ message: string }>('/usuarios/me/senha', { method: 'PATCH', body: JSON.stringify(dto) }),
  stats: () => request<{ total: number; ativos: number; cadastradosNaSemana: number }>('/usuarios/stats'),
};


// ─── Estatisticas ───────────────────────────────────────────────────────────────
export const relatorios = {
  salas: (params: { inicio?: string; fim?: string; salaIds: number[] }) => {
    const query = new URLSearchParams();
    if (params.inicio) query.set('inicio', params.inicio);
    if (params.fim) query.set('fim', params.fim);
    params.salaIds.forEach(id => query.append('salaIds', String(id)));
    return request<EstatisticasRecursoDTO[]>(`/estatisticas/salas/recursos?${query}`);
  },

  computadores: (params: { inicio?: string; fim?: string; computadorIds: number[] }) => {
    const query = new URLSearchParams();
    if (params.inicio) query.set('inicio', params.inicio);
    if (params.fim) query.set('fim', params.fim);
    params.computadorIds.forEach(id => query.append('computadorIds', String(id)));
    return request<EstatisticasRecursoDTO[]>(`/estatisticas/computadores/recursos?${query}`);
  },

  status: (params: { inicio?: string; fim?: string; salaIds: number[]; computadorIds: number[] }) => {
    const query = new URLSearchParams();
    if (params.inicio) query.set('inicio', params.inicio);
    if (params.fim) query.set('fim', params.fim);
    params.salaIds.forEach(id => query.append('salaIds', String(id)));
    params.computadorIds.forEach(id => query.append('computadorIds', String(id)));
    return request<EstatisticasStatusReservasDTO>(`/estatisticas/status-reservas?${query}`);
  },

  heatmap: (params: { inicio?: string; fim?: string }) => {
    const query = new URLSearchParams();
    if (params.inicio) query.set('inicio', params.inicio);
    if (params.fim) query.set('fim', params.fim);
    return request<EstatisticasHeatmapDTO[]>(`/estatisticas/heatmap?${query}`);
  },

  historico: (params: { inicio?: string; fim?: string; agrupamento?: string }) => {
    const query = new URLSearchParams();
    if (params.inicio) query.set('inicio', params.inicio);
    if (params.fim) query.set('fim', params.fim);
    if (params.agrupamento) query.set('agrupamento', params.agrupamento);
    return request<EstatisticasHistoricoDTO>(`/estatisticas/historico?${query}`);
  },

  ocupacaoSemana: (params: { inicio?: string; fim?: string }) => {
    const query = new URLSearchParams();
    if (params.inicio) query.set('inicio', params.inicio);
    if (params.fim) query.set('fim', params.fim);
    return request<EstatisticasOcupacaoDiaDTO[]>(`/estatisticas/ocupacao-semana?${query}`);
  },

   resumo: (params: { inicio?: string; fim?: string }) => {
    const query = new URLSearchParams();
    if (params.inicio) query.set('inicio', params.inicio);
    if (params.fim) query.set('fim', params.fim);
    return request<EstatisticasResumoDTO>(`/estatisticas/resumo?${query}`);
  },
};