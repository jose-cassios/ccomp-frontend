import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, from, map, switchMap, throwError } from 'rxjs';
import { ApiConfig } from '../../../core/api/api.config';
import { ClubMemberRole } from '../models/clube.model';

export interface ClubCertificateWorkload {
  club_id: number;
  member_workload_hours: number;
  instructor_workload_hours: number;
}
export interface ClubCertificateValidation {
  code: string;
  club_id: number;
  club_name: string;
  recipient_id: string;
  recipient_name: string;
  certificate_type: ClubMemberRole;
  workload_hours: number;
  issued_at: string;
}
type WorkloadResponse = Partial<ClubCertificateWorkload> & { clubId?: number; memberWorkloadHours?: number; instructorWorkloadHours?: number };
type ValidationResponse = Partial<ClubCertificateValidation> & { clubId?: number; clubName?: string; recipientId?: string; recipientName?: string; certificateType?: ClubMemberRole; workloadHours?: number; issuedAt?: string };

@Injectable({ providedIn: 'root' })
export class ClubCertificatesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfig);
  workload(clubId: number) {
    return this.http.get<WorkloadResponse>(this.url(`/${clubId}/certificates/workload`)).pipe(map(this.normalizeWorkload));
  }
  saveWorkload(clubId: number, value: Omit<ClubCertificateWorkload, 'club_id'>) {
    return this.http.put<WorkloadResponse>(this.url(`/${clubId}/certificates/workload`), value).pipe(map(this.normalizeWorkload));
  }
  download(clubId: number, recipient?: { id: string; role: ClubMemberRole }) {
    const path = recipient ? `${recipient.role === 'INSTRUCTOR' ? 'instructors' : 'members'}/${encodeURIComponent(recipient.id)}` : 'me';
    return this.http.get(this.url(`/${clubId}/certificates/${path}`), { responseType: 'blob' }).pipe(catchError(error => {
      if (!(error instanceof HttpErrorResponse) || !(error.error instanceof Blob)) return throwError(() => error);
      return from(error.error.text()).pipe(switchMap(text => {
        let body: unknown; try { body = JSON.parse(text); } catch { body = null; }
        return throwError(() => new HttpErrorResponse({ error: body, status: error.status, statusText: error.statusText }));
      }));
    }));
  }
  validate(code: string) {
    return this.http.get<ValidationResponse>(this.url(`/certificates/validation/${encodeURIComponent(code.trim().toUpperCase())}`)).pipe(map(row => ({
      code: row.code!, club_id: row.club_id ?? row.clubId!, club_name: row.club_name ?? row.clubName!,
      recipient_id: row.recipient_id ?? row.recipientId!, recipient_name: row.recipient_name ?? row.recipientName!,
      certificate_type: row.certificate_type ?? row.certificateType!, workload_hours: row.workload_hours ?? row.workloadHours!,
      issued_at: row.issued_at ?? row.issuedAt!,
    })));
  }
  private url(path: string): string { return this.config.buildUrl('/clubs' + path); }
  private normalizeWorkload(row: WorkloadResponse): ClubCertificateWorkload {
    return { club_id: row.club_id ?? row.clubId!, member_workload_hours: row.member_workload_hours ?? row.memberWorkloadHours ?? 0,
      instructor_workload_hours: row.instructor_workload_hours ?? row.instructorWorkloadHours ?? 0 };
  }
}
