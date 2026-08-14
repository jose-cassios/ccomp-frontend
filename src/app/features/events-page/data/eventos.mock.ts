export interface DetalheEvento {
  label: string;
  value: string;
}

export interface EventoItem {
  id: number;
  titulo: string;
  descricao: string;
  imagem: string;
  inscricoesAbertas: boolean;
  modalidade: string;
  detalhes: DetalheEvento[];
  conteudo: string[];
}

export const EVENTOS: EventoItem[] = [
  {
    id: 1,
    titulo: 'Hackathon IFMA 2026: Green Solutions',
    descricao:
      'O maior evento de programação do IFMA, focado em sustentabilidade e algoritmos verdes. Traga sua mente criativa para encontrar soluções inovadoras.',
    imagem: '/img2.png',
    inscricoesAbertas: true,
    modalidade: 'PRESENCIAL',
    detalhes: [
      { label: 'DATA', value: '10-12 Out' },
      { label: 'VAGAS', value: '40 Equipes' },
      { label: 'LOCAL', value: 'Auditório II' },
      { label: 'STATUS', value: 'Disponível' },
    ],
    conteudo: [
      'Durante três dias, equipes de até quatro estudantes desenvolvem soluções para desafios reais propostos por parceiros do campus.',
      'A programação inclui mentorias com profissionais do mercado, oficinas de prototipagem rápida e uma banca final de apresentação dos projetos.',
      'As inscrições são feitas por equipe e o kit do participante é entregue no credenciamento, no primeiro dia do evento.',
    ],
  },
  {
    id: 2,
    titulo: 'Semana de Tecnologia 2026',
    descricao:
      'Uma semana inteira de palestras, minicursos e rodas de conversa com profissionais do mercado e pesquisadores do departamento.',
    imagem: '/img3.png',
    inscricoesAbertas: true,
    modalidade: 'HÍBRIDO',
    detalhes: [
      { label: 'DATA', value: '18-22 Nov' },
      { label: 'VAGAS', value: '200 Alunos' },
      { label: 'LOCAL', value: 'Bloco de Informática' },
      { label: 'STATUS', value: 'Disponível' },
    ],
    conteudo: [
      'A Semana de Tecnologia reúne trilhas de desenvolvimento, dados e infraestrutura, com atividades pela manhã e à noite.',
      'Os minicursos têm vagas limitadas e exigem inscrição separada da programação geral de palestras.',
      'As sessões híbridas são transmitidas para quem não puder participar presencialmente, com certificado para ambas as modalidades.',
    ],
  },
  {
    id: 3,
    titulo: 'Maratona de Programação',
    descricao:
      'Etapa regional da maratona: cinco horas de desafios algorítmicos em equipes de três. Treinos abertos toda quinta-feira.',
    imagem: '/img1.png',
    inscricoesAbertas: false,
    modalidade: 'PRESENCIAL',
    detalhes: [
      { label: 'DATA', value: '05 Dez' },
      { label: 'VAGAS', value: '30 Equipes' },
      { label: 'LOCAL', value: 'Laboratório 3' },
      { label: 'STATUS', value: 'Encerrado' },
    ],
    conteudo: [
      'A etapa regional segue o formato oficial da ICPC: cinco horas de prova, um computador por equipe e problemas de dificuldade crescente.',
      'Os treinos abertos acontecem toda quinta-feira no laboratório 3 e são a principal forma de preparação para a competição.',
      'As inscrições desta edição já foram encerradas; acompanhe os canais do curso para a próxima chamada.',
    ],
  },
  {
    id: 4,
    titulo: 'Workshop de Inteligência Artificial Generativa',
    descricao:
      'Explorando LLMs e integração de APIs inteligentes em aplicações modernas de Ciência da Computação.',
    imagem: '/img1.png',
    inscricoesAbertas: true,
    modalidade: 'PRESENCIAL',
    detalhes: [
      { label: 'DATA', value: '22/11/2025' },
      { label: 'INSCRITOS', value: '45' },
      { label: 'LOCAL', value: 'Laboratório 1' },
      { label: 'STATUS', value: 'Inscrições Abertas' },
    ],
    conteudo: [
      'O workshop percorre os fundamentos de modelos de linguagem e como consumi-los a partir de aplicações web.',
      'A parte prática usa exemplos de integração com APIs e discute custos, limites de contexto e avaliação de respostas.',
      'É recomendado levar notebook próprio com ambiente de desenvolvimento já configurado.',
    ],
  },
  {
    id: 5,
    titulo: 'Palestra: Carreira em Dev Web no Mercado Global',
    descricao:
      'Estratégias para desenvolvedores brasileiros trabalharem para empresas do exterior.',
    imagem: '/img2.png',
    inscricoesAbertas: false,
    modalidade: 'PRESENCIAL',
    detalhes: [
      { label: 'DATA', value: '05/12/2025' },
      { label: 'LOCAL', value: 'Auditório Central' },
      { label: 'STATUS', value: 'Em Breve' },
    ],
    conteudo: [
      'A conversa aborda a construção de portfólio, presença profissional em inglês e processos seletivos internacionais.',
      'Também são discutidos modelos de contratação, fuso horário e rotina de trabalho remoto para empresas de fora do país.',
      'As inscrições abrem algumas semanas antes da data; acompanhe os canais do curso.',
    ],
  },
  {
    id: 6,
    titulo: 'Seminário de Segurança da Informação e LGPD',
    descricao:
      'Entendendo as implicações jurídicas e técnicas da proteção de dados no ecossistema acadêmico.',
    imagem: '/img3.png',
    inscricoesAbertas: true,
    modalidade: 'PRESENCIAL',
    detalhes: [
      { label: 'DATA', value: '12/12/2025' },
      { label: 'VAGAS', value: '8 de 50' },
      { label: 'LOCAL', value: 'Auditório II' },
      { label: 'STATUS', value: 'Últimas Vagas' },
    ],
    conteudo: [
      'O seminário conecta os requisitos da LGPD às decisões técnicas de quem projeta e mantém sistemas acadêmicos.',
      'São apresentados casos de tratamento de dados pessoais em sistemas do campus e as boas práticas de anonimização.',
      'Restam poucas vagas: a inscrição é confirmada por ordem de chegada.',
    ],
  },
];

export function encontrarEventoPorId(id: number): EventoItem | undefined {
  return EVENTOS.find((evento) => evento.id === id);
}
