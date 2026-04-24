import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AssetDTO, AssetsService } from '../services/assets.service';
import { UserService } from '../user-service.service';
import { ExternalLinksService, ExternalLink } from '../services/external-links.service';
import { AlertService } from '../services/alert.service';

@Component({
  selector: 'app-dashboard-assets',
  templateUrl: './dashboard-assets.component.html',
  styleUrls: ['./dashboard-assets.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule]
})
export class DashboardAssetsComponent implements OnInit {
  private assetsService = inject(AssetsService);
  private userService = inject(UserService);
  private linksService = inject(ExternalLinksService);
  private alert = inject(AlertService);

  isLoading: boolean = true;
  activeView: 'assets' | 'links' = 'assets'; 
  
  myAssets: AssetDTO[] = [];
  externalLinks: ExternalLink[] = [];
  
  // Modal State
  showRequestModal: boolean = false;
  isSubmitting: boolean = false;

  // Asset Request Form
  assetForm = {
    category: 'LAPTOP',
    assetName: '',
    location: 'Office',
    description: ''
  };
  
  ngOnInit(): void {
    this.loadAllData();
  }

  /**
   * Extracts Employee ID from the token and fetches assigned assets and links
   */
  loadAllData(): void {
    this.isLoading = true;
    const empId = this.userService.getEmpIdFromToken();
    
    if (!empId) {
      this.alert.error('User session not found. Please login again.');
      this.isLoading = false;
      return;
    }
    
    // Fetch assets based on Employee ID (Swagger: /api/assets/employee/{empId})
    this.assetsService.getAssetsByEmployee(empId).subscribe({
        next: (response: any) => {
            // Handle backend response structure
            const data = response.assets || response.data || response || [];
            this.myAssets = Array.isArray(data) ? data : [];
            this.isLoading = false;
        },
        error: (err) => {
            console.error('Assets load failed', err);
            this.alert.error('Failed to load your assigned assets.');
            this.isLoading = false; 
        }
    });

    // Fetch helpful links
    this.linksService.getActiveLinks().subscribe({
      next: (data) => {
        this.externalLinks = data;
      },
      error: (err) => console.error('Links load failed', err)
    });
  }

  switchView(view: 'assets' | 'links'): void {
    this.activeView = view;
  }

  // --- MODAL ACTIONS ---

  openRequestModal(): void {
    this.showRequestModal = true;
    this.assetForm = { category: 'LAPTOP', assetName: '', location: 'Office', description: '' };
  }

  closeRequestModal(): void {
    this.showRequestModal = false;
  }

  /**
   * Create new asset request (with 'PENDING' status)
   */
  submitAssetRequest(): void {
    const empId = this.userService.getEmpIdFromToken();
    if (!empId || !this.assetForm.assetName) {
        this.alert.warning('Please fill in the required information.');
        return;
    }

    this.isSubmitting = true;

    const requestPayload = {
        name: this.assetForm.assetName,
        type: this.assetForm.category.toUpperCase(), 
        description: `${this.assetForm.description} (Requested by: ${empId})`,
        location: this.assetForm.location,
        status: 'PENDING',
        serialNumber: `REQ-${Date.now()}`, // Temporary serial number for request tracking
        employeeId: empId
    };

    this.assetsService.createAsset(requestPayload).subscribe({
        next: () => {
            this.alert.success('Your asset request has been sent to HR.', 'Request Sent');
            this.closeRequestModal();
            this.loadAllData(); // Refresh list
        },
        error: (err) => {
            this.alert.error(err.error?.message || 'There was a problem sending the request.');
            this.isSubmitting = false;
        }
    });
  }

  // --- HELPERS ---

  getStatusClass(status: string): string {
      const s = (status || '').toUpperCase();
      switch (s) {
          case 'ASSIGNED': return 'assigned-status-badge'; 
          case 'PENDING': 
          case 'REQUESTED': return 'maintenance-status-badge'; 
          case 'AVAILABLE': return 'available-status-badge';
          default: return 'default-status-badge';
      }
  }

  getIconForCategory(category: string): string {
      const c = (category || '').toUpperCase();
      if(c.includes('LAPTOP')) return 'fas fa-laptop';
      if(c.includes('MOBILE') || c.includes('PHONE')) return 'fas fa-mobile-alt';
      if(c.includes('MONITOR')) return 'fas fa-desktop';
      return 'fas fa-box';
  }

  getLinkIcon(type: string): string {
    const t = (type || '').toUpperCase();
    if(t === 'PF') return 'fas fa-university';
    if(t === 'INSURANCE') return 'fas fa-heartbeat';
    return 'fas fa-external-link-alt';
  }
}