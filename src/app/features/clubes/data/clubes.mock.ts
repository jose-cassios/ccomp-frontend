import { Categoria, Clube, ClubeDestaque } from '../models/clube.model';


export const CATEGORIAS_CLUBES: Categoria[] = [
  { nome: 'Geral' },
  { nome: 'Robótica' },
  { nome: 'Programação' },
  { nome: 'Idiomas' },
  { nome: 'Pesquisa' },
];

export const CLUBES_DESTAQUE: ClubeDestaque[] = [
  {
    categoria: 'ROBÓTICA',
    titulo: 'Clube de Robótica',
    descricao: 'Trazendo vida ao metal através de engenharia e visão elegantes.',
    imagem: '/img1.png',
    horario: 'Encontros às terças, 18h',
  },
  {
    categoria: 'PROGRAMAÇÃO',
    titulo: 'Code Club',
    descricao: 'A espinha dorsal arquitetônica de cada sonho digital construído em equipe.',
    imagem: '/img2.png',
    horario: 'Encontros às quartas, 18h',
  },
  {
    categoria: 'DIVERSIDADE',
    titulo: 'Bits de Ada',
    descricao: 'Coletivo de mulheres na computação promovendo mentoria e projetos.',
    imagem: '/img3.png',
    horario: 'Encontros às quintas, 18h',
  },
];

export const CLUBES: Clube[] = [
  {
    id: 1,
    categoria: 'IDIOMAS',
    data: 'Outubro 18, 2024',
    titulo: 'Clube de Inglês — Conversação sem medo',
    descricao: 'Um espaço para a prática de conversação do idioma sem medo, com dinâmicas semanais e rodadas temáticas guiadas por monitores do curso.',
    imagem: '/img1.png',
    autor: { nome: 'Coordenação de Extensão', avatar: '' },
  },
  {
    id: 2,
    categoria: 'PESQUISA',
    data: 'Outubro 15, 2024',
    titulo: 'Grupo de Estudos em IA aplicada',
    descricao: 'Encontros quinzenais com leitura de papers, reprodução de experimentos e discussões sobre modelos de linguagem e visão computacional.',
    imagem: '/img2.png',
    autor: { nome: 'Núcleo de Tecnologia', avatar: '' },
  },
  {
    id: 3,
    categoria: 'ROBÓTICA',
    data: 'Outubro 12, 2024',
    titulo: 'Equipe de Competição — Robótica IFMA',
    descricao: 'Preparação para torneios regionais e nacionais com foco em projeto mecânico, eletrônica embarcada e programação de estratégias.',
    imagem: '/img3.png',
    autor: { nome: 'Ascom Pesquisa', avatar: '' },
  },
  {
    id: 4,
    categoria: 'PROGRAMAÇÃO',
    data: 'Outubro 10, 2024',
    titulo: 'Maratona de Programação — Treinos Semanais',
    descricao: 'Sessões de resolução de problemas com foco em algoritmos, estruturas de dados e preparação para competições regionais.',
    imagem: '/img1.png',
    autor: { nome: 'Coordenação de Curso', avatar: '' },
  },
  {
    id: 5,
    categoria: 'IDIOMAS',
    data: 'Outubro 08, 2024',
    titulo: 'Clube de Espanhol — Hablemos Juntos',
    descricao: 'Prática de conversação em espanhol com dinâmicas temáticas, músicas e filmes para imersão cultural.',
    imagem: '/img2.png',
    autor: { nome: 'Coordenação de Extensão', avatar: '' },
  },
];
