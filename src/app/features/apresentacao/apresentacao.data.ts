import {
  AcademicExperience,
  CourseDetail,
  CourseHighlight,
  CoursePresentationContent,
  GraduateCompetence,
} from './models/course-presentation.model';

/**
 * Conteúdo estático da página de apresentação do curso.
 * Este arquivo é o ponto de troca previsto para a edição por ADM/staff:
 * quando o endpoint existir, o componente passa a receber o mesmo
 * `CoursePresentationContent` via service/input e estas constantes viram
 * apenas o fallback de primeira carga.
 */

/** A ficha exibe exatamente 3 destaques — o layout depende disso. */
export const COURSE_HIGHLIGHTS: CourseHighlight[] = [
  { value: '3.300h', label: 'Carga horária total' },
  { value: '4 anos', label: 'Duração mínima' },
  { value: '40', label: 'Vagas por ano' },
];

/**
 * Lista ordenada e de tamanho livre. Não repetir aqui o que já está em
 * COURSE_HIGHLIGHTS.
 *
 * TODO: confirmar no PPC / edital vigente e acrescentar:
 *   { term: 'Turno', description: '...' },
 *   { term: 'Forma de ingresso', description: '...' },
 *   { term: 'Ato de reconhecimento', description: '...' },
 */
export const COURSE_DETAILS: CourseDetail[] = [
  { term: 'Grau', description: 'Bacharelado' },
  { term: 'Modalidade', description: 'Presencial' },
  { term: 'Campus', description: 'Caxias - MA' },
  { term: 'Prazo máximo de integralização', description: '7 anos' },
];

export const COURSE_OBJECTIVES: string[] = [
  'Resolver problemas complexos com base científica e método.',
  'Desenvolver competências em software, dados, infraestrutura e computação aplicada.',
  'Atuar em pesquisa, inovação e empreendedorismo com responsabilidade ética.',
  'Sustentar a aprendizagem contínua diante da evolução tecnológica.',
];

/**
 * Perfil do egresso consolidado: reúne o que antes estava dividido entre
 * "perfil" e "características", que descreviam as mesmas competências.
 */
export const GRADUATE_COMPETENCES: GraduateCompetence[] = [
  {
    title: 'Fundamentos sólidos',
    description:
      'Domina os conceitos essenciais da Ciência da Computação, o raciocínio algorítmico e as tecnologias adequadas a cada contexto.',
  },
  {
    title: 'Pensamento analítico e visão sistêmica',
    description:
      'Relaciona pessoas, processos, software, dados e infraestrutura ao analisar problemas complexos.',
  },
  {
    title: 'Solução de problemas',
    description:
      'Modela alternativas e projeta soluções computacionais de forma estruturada e viável.',
  },
  {
    title: 'Comunicação e colaboração',
    description:
      'Apresenta ideias técnicas com clareza e trabalha em equipes multidisciplinares.',
  },
  {
    title: 'Responsabilidade ética e social',
    description:
      'Reconhece os impactos sociais, éticos, ambientais e legais associados à tecnologia.',
  },
];

export const ACADEMIC_EXPERIENCE: AcademicExperience[] = [
  {
    title: 'Ensino',
    description:
      'Fundamentos de computação combinados a práticas de desenvolvimento e resolução de problemas reais.',
  },
  {
    title: 'Pesquisa e inovação',
    description:
      'Iniciação científica, projetos e ambientes que estimulam experimentação e produção acadêmica.',
  },
  {
    title: 'Extensão',
    description:
      'Ações que aproximam estudantes, professores, organizações e a comunidade de Caxias.',
  },
];

/** Agregado usado pelo componente. */
export const COURSE_PRESENTATION_CONTENT: CoursePresentationContent = {
  highlights: COURSE_HIGHLIGHTS,
  courseDetails: COURSE_DETAILS,
  objectives: COURSE_OBJECTIVES,
  graduateCompetences: GRADUATE_COMPETENCES,
  academicExperience: ACADEMIC_EXPERIENCE,
};
