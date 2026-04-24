import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserService } from '../services/user-service.service';
import { AlertService } from '../services/alert.service';
import { catchError, of } from 'rxjs';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface DocumentType {
  id: number;
  type: string;
  category: string;
  orgCode: string;
}

export interface DocumentSlot {
  key: string;
  label: string;
  category: string;
  documentTypeId: number;
  hint: string;
  required: boolean;
  acceptedFormats: string;
  maxSizeMB: number;
  file: File | null;
  fileName: string | null;
  fileData: string | null;
  fileType: string | null;
  error: string | null;
  uploaded: boolean;
  uploading: boolean;
  serverId: number | null;
  comment: string | null;
}

@Component({
  selector: 'app-paper-boats',
  templateUrl: './paper-boats.component.html',
  styleUrls: ['./paper-boats.component.css']
})
export class PaperBoatsComponent implements OnInit {

  private readonly BASE_URL = 'https://api.lovahr.com';
  private readonly ALLOWED_TYPES = [
    'application/pdf', 'image/jpeg', 'image/jpg', 'image/png'
  ];
  private readonly ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
  readonly ACCEPT_STRING = '.pdf,.jpg,.jpeg,.png';

  // ─── State ──────────────────────────────────────────────────────────────
  documentSlots: DocumentSlot[] = [];
  isLoadingTypes = true;
  loadError = false;

  /** Category and Slot selection state */
  selectedCategory: string = 'All';
  currentSlotKey: string | null = null;

  // ─── Preview modal ───────────────────────────────────────────────────────
  previewVisible  = false;
  previewLabel    = '';
  previewIsPdf    = false;
  previewIsImage  = false;
  previewData: SafeResourceUrl | string | null = null;
  private _blobUrl: string | null = null;

  constructor(
    private router: Router,
    private dataService: UserService,
    private alertService: AlertService,
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) {}

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadDocumentTypes();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    });
  }

  // ─── Load document types from API ────────────────────────────────────────

  loadDocumentTypes(): void {
    this.isLoadingTypes = true;
    this.loadError = false;

    const orgCode = localStorage.getItem('orgCode') || 'DEFAULT';
    const url = `${this.BASE_URL}/api/document-types?orgCode=${orgCode}`;

    this.http.get<DocumentType[]>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(() => of(this.getDefaultDocumentTypes()))
    ).subscribe(types => {
      this.isLoadingTypes = false;
      if (!types || types.length === 0) {
        types = this.getDefaultDocumentTypes();
      }
      this.documentSlots = this.buildSlots(types);
      if (this.documentSlots.length > 0) {
        this.currentSlotKey = this.documentSlots[0].key;
      }
      this.restoreSavedData();
    });
  }

  private getDefaultDocumentTypes(): DocumentType[] {
    return [
      { id: 1, type: 'Aadhar Card (Front)', category: 'Identity', orgCode: '' },
      { id: 2, type: 'Aadhar Card (Back)',  category: 'Identity', orgCode: '' },
      { id: 3, type: 'PAN Card',            category: 'Identity', orgCode: '' },
      { id: 4, type: 'Education Certificate', category: 'Academic', orgCode: '' },
      { id: 5, type: 'Experience Letter',   category: 'Employment', orgCode: '' },
      { id: 6, type: 'Other Document',      category: 'Other', orgCode: '' },
    ];
  }

  private buildSlots(types: DocumentType[]): DocumentSlot[] {
    const REQUIRED_CATEGORIES = ['identity'];
    const HINTS: Record<string, string> = {
      'aadhar card (front)': 'Front side of your Aadhar card',
      'aadhar card (back)':  'Back side of your Aadhar card',
      'pan card':            'Clear scan or photo of your PAN card',
      'education certificate': 'Highest qualification degree / marksheet',
      'experience letter':   'Relieving or experience letter from previous employer',
      'other document':      'Any additional document',
    };

    return types.map(dt => {
      const keyLower = dt.type.toLowerCase();
      const catLower = (dt.category || '').toLowerCase();
      const isRequired = REQUIRED_CATEGORIES.includes(catLower);
      return {
        key: dt.type.replace(/\s+/g, '_').toLowerCase(),
        label: dt.type,
        category: dt.category,
        documentTypeId: dt.id,
        hint: HINTS[keyLower] || `Upload your ${dt.type}`,
        required: isRequired,
        acceptedFormats: this.ACCEPT_STRING,
        maxSizeMB: 5,
        file: null, fileName: null, fileData: null, fileType: null,
        error: null, uploaded: false, uploading: false, serverId: null,
        comment: null
      };
    });
  }

  private restoreSavedData(): void {
    const savedData = this.dataService.getFormData();
    const saved = savedData?.step4?.documents || savedData?.documents;
    if (!saved) return;

    this.documentSlots.forEach(slot => {
      const savedSlot = saved[slot.key];
      if (savedSlot) {
        slot.fileName = savedSlot.fileName || null;
        slot.fileData = savedSlot.fileData || null;
        slot.fileType = savedSlot.fileType || null;
        slot.serverId = savedSlot.serverId || null;
        slot.comment  = savedSlot.comment || null;
        slot.uploaded = !!savedSlot.fileName;
      }
    });
  }

  // ─── Dropdown selection & Category logic ──────────────────────────────────

  get uniqueCategories(): string[] {
    const cats = this.documentSlots.map(s => s.category).filter(Boolean);
    return ['All', ...new Set(cats)];
  }

  get filteredSlots(): DocumentSlot[] {
    if (this.selectedCategory === 'All') return this.documentSlots;
    return this.documentSlots.filter(s => s.category === this.selectedCategory);
  }

  get currentSlot(): DocumentSlot {
    if (this.currentSlotKey) {
      const slot = this.documentSlots.find(s => s.key === this.currentSlotKey);
      if (slot) return slot;
    }
    return this.filteredSlots[0] || this.documentSlots[0] || {} as DocumentSlot;
  }

  onCategoryChange(cat: string): void {
    this.selectedCategory = cat;
    // Auto-select the first document in the newly selected category
    this.currentSlotKey = this.filteredSlots.length > 0 ? this.filteredSlots[0].key : null;
  }

  onDropdownChange(key: string): void {
    this.currentSlotKey = key;
  }

  // ─── File handling ────────────────────────────────────────────────────────

  triggerInput(key: string): void {
    const el = document.getElementById(`file-${key}`) as HTMLInputElement;
    if (el) el.click();
  }

  async onFileChange(event: Event, slot: DocumentSlot): Promise<void> {
    const input = event.target as HTMLInputElement;
    slot.error = null;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!this.ALLOWED_TYPES.includes(file.type) && !this.ALLOWED_EXTENSIONS.includes(ext)) {
      slot.error = 'Only PDF, JPG, JPEG, and PNG files are allowed.';
      input.value = '';
      return;
    }

    if (file.size > slot.maxSizeMB * 1024 * 1024) {
      slot.error = `File must be smaller than ${slot.maxSizeMB} MB.`;
      input.value = '';
      return;
    }

    try {
      const base64 = await this.toBase64(file);
      slot.file     = file;
      slot.fileName = file.name;
      slot.fileData = base64;
      slot.fileType = file.type;
      slot.uploaded = true;
      slot.uploading = false;
      slot.serverId = null;
    } catch {
      slot.error = 'Could not read file. Please try again.';
      input.value = '';
    }
  }

  removeDocument(slot: DocumentSlot): void {
    slot.file     = null;
    slot.fileName = null;
    slot.fileData = null;
    slot.fileType = null;
    slot.uploaded = false;
    slot.uploading = false;
    slot.serverId = null;
    slot.error    = null;
    const el = document.getElementById(`file-${slot.key}`) as HTMLInputElement;
    if (el) el.value = '';
  }

  // ─── Preview ──────────────────────────────────────────────────────────────

  openPreview(slot: DocumentSlot): void {
    if (!slot.fileData) return;
    this.previewLabel   = slot.label;
    this.previewIsPdf   = slot.fileType === 'application/pdf';
    this.previewIsImage = (slot.fileType?.startsWith('image/')) ?? false;

    if (this.previewIsPdf) {
      const base64 = slot.fileData.split(',')[1];
      const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const blob   = new Blob([bytes], { type: 'application/pdf' });
      this._blobUrl   = URL.createObjectURL(blob);
      this.previewData = this.sanitizer.bypassSecurityTrustResourceUrl(this._blobUrl);
    } else {
      this.previewData = slot.fileData;
    }
    this.previewVisible = true;
    document.body.style.overflow = 'hidden';
  }

  closePreview(): void {
    if (this._blobUrl) { URL.revokeObjectURL(this._blobUrl); this._blobUrl = null; }
    this.previewVisible = false;
    this.previewData    = null;
    this.previewLabel   = '';
    document.body.style.overflow = '';
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  goBack(): void {
    this._persistDocuments();
    this.router.navigate(['/sign-up/step-3']);
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  async moveForward(form: NgForm): Promise<void> {
    const requiredMissing = this.documentSlots.filter(s => s.required && !s.uploaded);
    if (requiredMissing.length > 0) {
      const names = requiredMissing.map(s => s.label).join(', ');
      this.alertService.warning(`Please upload the following required documents: ${names}`, 'Documents Missing');
      return;
    }

    // Upload pending files to the server before moving forward
    const pendingUploads = this.documentSlots.filter(s => s.uploaded && s.file && !s.serverId);
    if (pendingUploads.length > 0) {
      try {
        const uploadPromises = pendingUploads.map(slot => {
          slot.uploading = true;
          return new Promise<void>((resolve) => {
            this.dataService.uploadDocument(slot.file!, slot.label, slot.category, slot.comment || '').subscribe({
              next: (res) => {
                slot.uploading = false;
                if (res && res.id) slot.serverId = res.id;
                resolve();
              },
              error: () => {
                slot.uploading = false;
                resolve(); // Resolve anyway so it doesn't block the flow
              }
            });
          });
        });
        await Promise.all(uploadPromises);
      } catch (err) {
        console.warn('Upload error during submission');
      }
    }

    this._persistDocuments();
    this.router.navigate(['/sign-up/streams-of-trust']);
  }

  private _persistDocuments(): void {
    const documents: Record<string, any> = {};
    this.documentSlots.forEach(slot => {
      if (slot.uploaded) {
        documents[slot.key] = {
          fileName: slot.fileName,
          fileData: slot.fileData,
          fileType: slot.fileType,
          serverId: slot.serverId,
          comment: slot.comment
        };
      }
    });
    this.dataService.saveStep4({ documents });
  }

  // ─── Computed helpers ────────────────────────────────────────────────────

  get uploadedCount(): number {
    return this.documentSlots.filter(s => s.uploaded).length;
  }

  getFileIcon(slot: DocumentSlot): string {
    if (!slot.fileType) return 'fa-file';
    if (slot.fileType === 'application/pdf') return 'fa-file-pdf';
    if (slot.fileType.startsWith('image/')) return 'fa-file-image';
    return 'fa-file';
  }

  slotStatusClass(slot: DocumentSlot): string {
    if (slot.error)    return 'slot-err';
    if (slot.uploaded) return 'slot-done';
    if (slot.required) return 'slot-pending';
    return '';
  }

  private toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  }
}