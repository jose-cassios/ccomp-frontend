export interface NewsItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverImageUrl: string;
  featured: boolean;
  autorId: string;
  publishedAt?: Date;
  updatedAt?: Date;
  content?: string[];
}

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: '0',
    title: 'CComp inaugura novo laboratório de robótica para o próximo semestre',
    slug: 'ccomp-laboratorio-robotica',
    summary:
      'A nova estrutura reúne kits, sensores e um espaço dedicado para projetos interdisciplinares e competições.',
    coverImageUrl: '/img2.png',
    featured: true,
    autorId: 'Equipe CComp',
    publishedAt: new Date('2026-08-18T10:00:00Z'),
    updatedAt: new Date('2026-08-18T10:00:00Z'),
    content: [
      'A iniciativa amplia o acesso de alunos a experiências práticas de automação, programação e prototipagem.',
      'Com o laboratório, o curso passa a oferecer mais oportunidades para projetos colaborativos entre diferentes áreas da computação.',
      'A estrutura também será usada em oficinas abertas para estudantes de iniciação e para grupos que desejam participar das competições do semestre.'
    ]
  },
  {
    id: '1',
    slug: 'ccomp-programacao',
    title: 'Maratona de programação reúne estudantes em uma semana de desafios',
    summary:
      'Os participantes resolveram problemas em equipe, treinaram lógica e compartilharam técnicas de otimização.',
    coverImageUrl: '/img1.png',
    featured: true,
    autorId: 'Comitê de eventos',
    publishedAt: new Date('2026-08-10T10:00:00Z'),
    updatedAt: new Date('2026-08-10T10:00:00Z'),
    content: [
      'A maratona aconteceu ao longo de uma semana com sessões presenciais e desafios online para todos os níveis de experiência.',
      'Além de promover a competição, a atividade abriu espaço para networking entre alunos, professores e convidados do mercado.',
      'Os times mais bem colocados receberam mentoria para seguir com projetos de extensão e participação em olimpíadas.'
    ]
  },
  {
    id: '2',
    slug: 'ccomp-jogos',
    title: 'Clube de jogos estreia com torneios semanais e encontros estratégicos',
    summary:
      'A proposta conecta estudantes apaixonados por competição, análise de partidas e desenvolvimento de habilidades cognitivas.',
    coverImageUrl: '/img3.png',
    featured: true,
    autorId: 'Coordenação do clube',
    publishedAt: new Date('2026-08-04T10:00:00Z'),
    updatedAt: new Date('2026-08-04T10:00:00Z'),
    content: [
      'O clube de jogos começou com uma série de torneios semanais e sessões voltadas para partidas colaborativas e debates estratégicos.',
      'Os encontros foram pensados para reunir perfis diferentes, desde quem gosta de competição casual até quem busca aprofundar táticas.',
      'A iniciativa também conecta temas de lógica, tomada de decisão e trabalho em equipe em um ambiente acolhedor.'
    ]
  }
];
