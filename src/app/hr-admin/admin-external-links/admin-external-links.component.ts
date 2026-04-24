import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExternalLink, ExternalLinksService } from 'src/app/services/external-links.service';
import { AlertService } from 'src/app/services/alert.service';

@Component({
  selector: 'app-admin-external-links',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './admin-external-links.component.html',
  styleUrls: ['./admin-external-links.component.css']
})
export class AdminExternalLinksComponent implements OnInit {
  // Service Injections
  private linksService = inject(ExternalLinksService);
  private alert = inject(AlertService);
  private fb = inject(FormBuilder);

  // State Management ke liye Signals
  links = signal<ExternalLink[]>([]);
  showModal = signal(false);
  isEditing = signal(false);
  isSubmitting = signal(false);
  
  selectedLinkId: number | null = null;
  linkForm: FormGroup;

  constructor() {
    // Form initialization with default values
    this.linkForm = this.fb.group({
      linkName: ['', [Validators.required, Validators.minLength(2)]],
      linkType: ['PF', Validators.required],
      url: ['', [Validators.required, Validators.pattern(/^(http|https):\/\/.*$/)]],
      description: [''],
      isActive: [true],
      // Visible to roles now defaults to 'ALL'
      visibleToRoles: ['ALL', Validators.required] 
    });
  }

  ngOnInit() {
    this.loadLinks();
  }

  /**
   * Function to fetch all links for the organization
   */
  loadLinks() {
    this.linksService.getAllLinks().subscribe({
      next: (data: any) => {
        // Handle wrapper responses
        const result = Array.isArray(data) ? data : (data.data || []);
        this.links.set(result);
      },
      error: (err) => {
        this.alert.error('Failed to load links. Check your connection.');
        console.error('API Error:', err);
      }
    });
  }

  /**
   * Logic to save (Create or Update) link
   */
  saveLink() {
    if (this.linkForm.invalid) {
      this.alert.warning('Please fill all required fields correctly.');
      this.linkForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const payload = this.linkForm.value;

    const request$ = this.isEditing() && this.selectedLinkId
      ? this.linksService.updateLink(this.selectedLinkId, payload)
      : this.linksService.createLink(payload);

    request$.subscribe({
      next: () => {
        this.alert.success(this.isEditing() ? 'Link updated successfully' : 'New link published');
        this.loadLinks();
        this.closeModal();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.alert.error(err.error?.message || 'A server error occurred while saving the link.');
      }
    });
  }

  /**
   * Logic to toggle Active/Inactive status
   */
  async toggleStatus(link: ExternalLink) {
    if (!link.id) return;
    
    const targetStatus = !link.isActive;
    const action = targetStatus ? 'activate' : 'deactivate';
    
    const confirmed = await this.alert.confirm(
      `${targetStatus ? 'Activate' : 'Deactivate'} Link?`,
      `Are you sure you want to change the status of "${link.linkName}"?`
    );

    if (confirmed) {
      const toggle$ = targetStatus 
        ? this.linksService.activateLink(link.id)
        : this.linksService.deactivateLink(link.id);

      toggle$.subscribe({
        next: () => {
          this.alert.success(`Link successfully ${action}d.`);
          this.loadLinks();
        },
        error: () => this.alert.error('Unable to update link status at this time.')
      });
    }
  }

  /**
   * Logic to permanently delete link
   */
  async deleteLink(id: number) {
    const confirmed = await this.alert.confirm(
      'Delete Link Permanently',
      'This resource will be removed for all users. This action cannot be undone.'
    );

    if (confirmed) {
      this.linksService.deleteLink(id).subscribe({
        next: () => {
          this.alert.success('Resource removed successfully.');
          this.loadLinks();
        },
        error: () => this.alert.error('Failed to delete the resource.')
      });
    }
  }

  // Functions to open and close Modal
  openModal(link?: ExternalLink) {
    if (link) {
      this.isEditing.set(true);
      this.selectedLinkId = link.id || null;
      this.linkForm.patchValue({
        linkName: link.linkName,
        linkType: link.linkType,
        url: link.url,
        description: link.description,
        isActive: link.isActive,
        visibleToRoles: link.visibleToRoles || 'ALL' // Default to ALL when editing
      });
    } else {
      this.isEditing.set(false);
      this.selectedLinkId = null;
      this.linkForm.reset({ 
        linkType: 'PF', 
        isActive: true, 
        visibleToRoles: 'ALL' // Default to ALL when creating
      });
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.isSubmitting.set(false);
    this.linkForm.reset();
  }
}