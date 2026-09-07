export type FacultyArea = 'Ciências Naturais' | 'Humanas' | 'Tecnologia';
export type FacultyTone = 'mint' | 'lavender' | 'sky' | 'sand' | 'blue' | 'rose';

export interface FacultyMember {
  name: string;
  title: string;
  degree: string;
  area: FacultyArea;
  initials: string;
  tone: FacultyTone;
  lattesUrl: string | null;
}
