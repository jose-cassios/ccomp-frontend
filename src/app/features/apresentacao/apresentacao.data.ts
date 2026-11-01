import {
  CareerPath,
  CourseDetail,
  CourseHighlight,
  CoursePresentationContent,
} from './models/course-presentation.model';

/**
 * Conteúdo estático da página de apresentação do curso.
 * Este arquivo é o ponto de troca previsto para a edição por ADM/staff:
 * quando o endpoint existir, o componente passa a receber o mesmo
 * `CoursePresentationContent` via service/input e estas constantes viram
 * apenas o fallback de primeira carga.
 *
 * Fonte: página oficial do curso no IFMA Campus Caxias
 * (https://caxias.ifma.edu.br/computacao/), conteúdo conforme a versão de
 * 20/08/2025. Reconferir a cada atualização do PPC.
 *
 * A página é uma porta de entrada, não um espelho da ficha oficial: as listas
 * abaixo são recortes curtos e sempre apontam para a ficha completa.
 */

/** A ficha exibe exatamente 3 destaques — o layout depende disso. */
export const COURSE_HIGHLIGHTS: CourseHighlight[] = [
  { value: '3.300h', label: 'Carga horária mínima de integralização' },
  { value: '4 anos', label: 'Duração mínima (8 períodos)' },
  { value: '40', label: 'Vagas anuais, no primeiro semestre' },
];

/**
 * Detalhes do curso. Não repetir aqui o que já está em COURSE_HIGHLIGHTS
 * nem o que o hero já diz (grau, modalidade e campus).
 */
export const COURSE_DETAILS: CourseDetail[] = [
  { term: 'Título conferido', description: 'Bacharel em Computação' },
  { term: 'Turno de funcionamento', description: 'Integral' },
  { term: 'Regime acadêmico', description: 'Semestral' },
  {
    term: 'Forma de ingresso',
    description: 'Sisu, editais de transferência e editais de portador de curso superior',
  },
  { term: 'Tempo máximo de integralização', description: '7 anos' },
  { term: 'Indicadores', description: 'Conceito do Curso 4 e Enade 3' },
];

/** Composição das 3.300h mínimas de integralização. */
export const COURSE_CURRICULUM: CourseDetail[] = [
  { term: 'Disciplinas obrigatórias', description: '2.640h' },
  { term: 'Disciplinas optativas', description: '300h' },
  { term: 'Trabalho de conclusão de curso', description: '120h' },
  { term: 'Estágio', description: '120h' },
  { term: 'Atividades complementares', description: '120h' },
];

export const COURSE_PRESENTATION =
  'O Bacharelado em Ciência da Computação tem a computação como atividade fim e visa à formação ' +
  'de recursos humanos para o desenvolvimento científico e tecnológico da área, preparando os ' +
  'estudantes para os diferentes caminhos disponíveis aos profissionais de computação.';

export const CAREER_PATHS: CareerPath[] = [
  {
    title: 'Empresas públicas e privadas',
    description:
      'Análise de software e de sistemas, engenharia de software, desenvolvimento, projeto de software e consultoria em banco de dados.',
  },
  {
    title: 'Empreendedorismo',
    description:
      'Iniciativas de negócios em computação, criando empresas ou projetando inovações no mercado.',
  },
  {
    title: 'Carreira acadêmica',
    description: 'Atuação como pesquisador ou docente universitário na área de computação.',
  },
];

/**
 * Recorte do perfil profissional do curso. A ficha oficial traz doze
 * características; estas seis cobrem as frentes principais sem transformar a
 * seção em uma lista longa. O link para a ficha completa fica no template.
 */
export const PROFESSIONAL_PROFILE: string[] = [
  'Conhecer os aspectos fundamentais de Ciência da Computação e Matemática necessários para o desenvolvimento de sistemas e a organização de infraestrutura de softwares.',
  'Reconhecer problemas cuja solução algorítmica seja viável, entendendo assim os limites da computação.',
  'Determinar os requisitos, especificações e riscos relacionados ao desenvolvimento, à operacionalização e à manutenção de hardwares e softwares.',
  'Avaliar criticamente como os sistemas computacionais podem afetar os seres humanos e a sociedade, aplicando a ética no desenvolvimento de soluções.',
  'Construir soluções, individualmente ou em colaboração, para problemas reais, podendo atuar como gestor em projetos de desenvolvimento de software.',
  'Organizar a própria aprendizagem, adaptando-se a novas tecnologias e demandas de trabalho.',
];

/** Agregado usado pelo componente. */
export const COURSE_PRESENTATION_CONTENT: CoursePresentationContent = {
  highlights: COURSE_HIGHLIGHTS,
  courseDetails: COURSE_DETAILS,
  curriculum: COURSE_CURRICULUM,
  presentation: COURSE_PRESENTATION,
  careerPaths: CAREER_PATHS,
  professionalProfile: PROFESSIONAL_PROFILE,
};
