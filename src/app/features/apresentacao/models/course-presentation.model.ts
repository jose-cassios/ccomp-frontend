export interface CourseHighlight{
  value:string;
  label:string;
}

export interface CourseDetail{
  term:string;
  description:string;
}

export interface GraduateCompetence {
  title: string;
  description: string;
}

export interface AcademicExperience {
  title: string;
  description: string;
}

export interface CoursePresentationContent {
  highlights: CourseHighlight[];
  courseDetails: CourseDetail[];
  objectives: string[];
  graduateCompetences: GraduateCompetence[];
  academicExperience: AcademicExperience[];
}
