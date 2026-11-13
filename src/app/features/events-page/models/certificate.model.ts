export type CertificateScope = 'event' | 'activity' | 'instructor' | 'team';
export type CertificateTemplateScope = CertificateScope | 'guest' | 'activity-instructor' | 'activity-guest';
export interface ManualInstructorCertificate { instructor_id?: number; activity_id?: number; activity_guest_id?: number; }
export interface ManualCertificateContent { boxes: CertificateBox[]; variables: Record<string, string>; }
export type CertificateAlignment = 'LEFT' | 'RIGHT' | 'CENTERED' | 'JUSTIFIED';

/** The API uses Jackson SNAKE_CASE, including the nested text boxes. */
export interface CertificateBox {
  text_template: string;
  x: number;
  y: number;
  width: number;
  font_size: number | null;
  font_color: string | null;
  alignment: CertificateAlignment | null;
}

export interface CertificateTemplate {
  boxes: CertificateBox[];
  variables: string[];
}

export interface CertificateValidation {
  code: string;
  participant_id: string;
  participant_name: string;
  event_title: string;
  activity_title: string | null;
  workload_hours: string | null;
  issued_at: string;
  certificate_type?: 'EVENT' | 'ACTIVITY' | 'INSTRUCTOR' | 'GUEST' | 'EDITOR';
}
