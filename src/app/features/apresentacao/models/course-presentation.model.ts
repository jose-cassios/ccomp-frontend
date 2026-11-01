export interface CourseHighlight {
  value: string;
  label: string;
}

export interface CourseDetail {
  term: string;
  description: string;
}

/** Áreas de atuação destacadas na apresentação do curso. */
export interface CareerPath {
  title: string;
  description: string;
}

export interface CoursePresentationContent {
  highlights: CourseHighlight[];
  courseDetails: CourseDetail[];
  curriculum: CourseDetail[];
  presentation: string;
  careerPaths: CareerPath[];
  professionalProfile: string[];
}

