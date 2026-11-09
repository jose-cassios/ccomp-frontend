import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
import { map } from 'rxjs';
export interface CredentialSearchItem {
    enrollment: {
        id: number;
        status: string;
        user: {
            id: string;
            name: string;
            email_address?: string | {
                value: string;
            };
        };
    };
    eligible: boolean;
    credentialed: boolean;
}
export interface CredentialSummary {
    eligible: number;
    credentialed: number;
    remaining: number;
}
export interface CredentialResult {
    result: string;
    enrollment_id: number;
    credential_id: number;
    participant_name: string;
    credentialed_at: string;
}
@Injectable({ providedIn: 'root' })
export class EventCredentialsService {
    private readonly api = inject(ApiService);
    summary(id: number) { return this.api.get<CredentialSummary>(`/events/${id}/credentials/summary`); }
    search(id: number, term: string) { return this.api.post<CredentialSearchItem[]>(`/events/${id}/credentials/manual/search`, { search_term: term.trim() }).pipe(map(rows => rows.map(row => ({ ...row, enrollment: { ...row.enrollment, user: { ...row.enrollment.user, email_address: typeof row.enrollment.user.email_address === 'string' ? row.enrollment.user.email_address : row.enrollment.user.email_address?.value ?? '' } } })))); }
    credential(id: number, enrollmentId: number, station: string) { return this.api.post<CredentialResult>(`/events/${id}/credentials/manual`, { enrollment_id: enrollmentId, station: station.trim() }); }
    addOperator(id: number, userId: string) { return this.api.put<void>(`/events/${id}/credentials/operators/${encodeURIComponent(userId.trim())}`, null); }
    removeOperator(id: number, userId: string) { return this.api.delete<void>(`/events/${id}/credentials/operators/${encodeURIComponent(userId.trim())}`); }
}
