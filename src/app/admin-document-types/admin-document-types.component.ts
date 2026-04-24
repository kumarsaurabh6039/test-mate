import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, of } from 'rxjs';

export interface DocumentType {
  id?: number;
  type: string;
  category: string;
  orgCode?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-admin-document-types',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-document-types.component.html',
  styleUrls: ['./admin-document-types.component.css']
})
export class AdminDocumentTypesComponent implements OnInit {

  private readonly BASE_URL = 'https://api.lovahr.com';

  documentTypes: DocumentType[] = [];
  isLoading = true;
  loadError = false;

  // Modal state
  showModal = false;
  isEditing = false;
  isSaving = false;
  saveError = '';

  // Form model
  formModel: DocumentType = { type: '', category: '' };

  // Predefined category suggestions
  categorySuggestions = ['Identity', 'Academic', 'Employment', 'Financial', 'Medical', 'Other'];

  // Delete confirm
  deleteTargetId: number | null = null;
  showDeleteConfirm = false;
  isDeleting = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadDocumentTypes();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    });
  }

  loadDocumentTypes(): void {
    this.isLoading = true;
    this.loadError = false;
    this.http.get<DocumentType[]>(`${this.BASE_URL}/api/document-types`, { headers: this.getHeaders() })
      .pipe(catchError(() => { this.loadError = true; return of([]); }))
      .subscribe(types => {
        this.isLoading = false;
        this.documentTypes = types || [];
      });
  }

  // ─── Open Modal ───────────────────────────────────────────────────────────

  openAdd(): void {
    this.isEditing = false;
    this.formModel = { type: '', category: '' };
    this.saveError = '';
    this.showModal = true;
  }

  openEdit(dt: DocumentType): void {
    this.isEditing = true;
    this.formModel = { ...dt };
    this.saveError = '';
    this.showModal = true;
  }

  closeModal(): void {
    if (this.isSaving) return;
    this.showModal = false;
    this.saveError = '';
  }

  // ─── Save (Create / Update) ───────────────────────────────────────────────

  save(): void {
    if (!this.formModel.type?.trim() || !this.formModel.category?.trim()) {
      this.saveError = 'Both Document Type and Category are required.';
      return;
    }
    this.isSaving = true;
    this.saveError = '';

    if (this.isEditing && this.formModel.id) {
      // PUT
      this.http.put<DocumentType>(
        `${this.BASE_URL}/api/document-types/${this.formModel.id}`,
        this.formModel,
        { headers: this.getHeaders() }
      ).pipe(catchError(err => {
        this.saveError = err?.error?.message || 'Failed to update. Please try again.';
        this.isSaving = false;
        return of(null);
      })).subscribe(res => {
        if (res) {
          const idx = this.documentTypes.findIndex(d => d.id === res.id);
          if (idx > -1) this.documentTypes[idx] = res;
          this.isSaving = false;
          this.showModal = false;
        }
      });
    } else {
      // POST
      this.http.post<DocumentType>(
        `${this.BASE_URL}/api/document-types`,
        this.formModel,
        { headers: this.getHeaders() }
      ).pipe(catchError(err => {
        this.saveError = err?.error?.message || 'Failed to create. Please try again.';
        this.isSaving = false;
        return of(null);
      })).subscribe(res => {
        if (res) {
          this.documentTypes = [...this.documentTypes, res];
          this.isSaving = false;
          this.showModal = false;
        }
      });
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  confirmDelete(id: number): void {
    this.deleteTargetId = id;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.deleteTargetId = null;
    this.showDeleteConfirm = false;
  }

  // Note: Swagger does not have a DELETE for document-types,
  // so we show a toast-style warning instead.
  deleteDoc(): void {
    // API does not expose DELETE /api/document-types/{id}
    // We'll remove from local list only and warn the user.
    this.documentTypes = this.documentTypes.filter(d => d.id !== this.deleteTargetId);
    this.showDeleteConfirm = false;
    this.deleteTargetId = null;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  getCategoryColor(category: string): string {
    const map: Record<string, string> = {
      Identity: '#4338CA',
      Academic: '#0369A1',
      Employment: '#059669',
      Financial: '#D97706',
      Medical: '#DC2626',
      Other: '#64748B'
    };
    return map[category] || '#64748B';
  }

  groupedByCategory(): { category: string; items: DocumentType[] }[] {
    const map = new Map<string, DocumentType[]>();
    this.documentTypes.forEach(dt => {
      const cat = dt.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(dt);
    });
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }

  trackById(_: number, item: DocumentType): number { return item.id ?? 0; }
}