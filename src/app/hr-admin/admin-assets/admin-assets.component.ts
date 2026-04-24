import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
 // Make sure path aligns with your project
import { UserService, EmployeeDTO } from 'src/app/services/user-service.service';
import { AlertService } from 'src/app/services/alert.service';
import { AssetDTO, AssetsService } from 'src/app/services/assets.service';

@Component({
  selector: 'app-admin-assets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-assets.component.html',
  styleUrls: ['./admin-assets.component.css']
})
export class AdminAssetsComponent implements OnInit, OnDestroy {
  // Dependency Injection
  private assetsService = inject(AssetsService);
  private userService = inject(UserService);
  private alert = inject(AlertService);
  private fb = inject(FormBuilder);

  // Data State
  assets: AssetDTO[] = [];
  filteredAssets: AssetDTO[] = [];
  employees: EmployeeDTO[] = [];
  isLoading = true;

  // Asset Modal & Form State
  assetForm: FormGroup;
  showModal = false;
  showAssignModal = false;
  isEditingAsset = false;

  // Selected Data for Actions
  selectedAsset: AssetDTO | null = null;
  assigneeId = '';
  searchText = '';
  statusFilter = 'All';

  // Naya array jisme 'NEW' option add kiya gaya hai
  assetTypes = ['LAPTOP', 'PHONE', 'MONITOR', 'KEYBOARD', 'MOUSE', 'OTHER', 'NEW'];
  private subs = new Subscription();

  constructor() {
    this.assetForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      customType: [''], // Naya hidden field custom type ke liye
      serialNumber: ['', Validators.required],
      description: [''],
      location: ['']
    });
  }

  ngOnInit() {
    this.loadData();
    this.loadEmployees();

    // Jab type 'NEW' select ho, tab customType field ko required bana dein
    this.subs.add(
      this.assetForm.get('type')?.valueChanges.subscribe(value => {
        const customTypeCtrl = this.assetForm.get('customType');
        if (value === 'NEW') {
          customTypeCtrl?.setValidators([Validators.required]);
        } else {
          customTypeCtrl?.clearValidators();
          customTypeCtrl?.setValue('');
        }
        customTypeCtrl?.updateValueAndValidity();
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  loadData() {
    this.isLoading = true;
    this.assetsService.getAllAssets().subscribe({
      next: (res) => {
        this.assets = res.assets || res || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        this.alert.error('Failed to load assets');
        this.isLoading = false;
      }
    });
  }

  loadEmployees() {
    this.userService.getAllEmployees().subscribe({
      next: (res) => {
        this.employees = res || [];
      },
      error: (err) => console.error(err)
    });
  }

  openCreateModal() {
    this.isEditingAsset = false;
    this.assetForm.reset({ type: 'LAPTOP' });
    this.showModal = true;
  }

  openEditModal(asset: AssetDTO) {
    this.isEditingAsset = true;
    this.selectedAsset = asset;

    // Check karein agar type existing list mein nahi hai, toh 'NEW' select karke custom field fill karein
    let typeVal = asset.type;
    let customVal = '';

    if (!this.assetTypes.includes(typeVal)) {
      typeVal = 'NEW';
      customVal = asset.type;
    }

    this.assetForm.patchValue({
      name: asset.name,
      type: typeVal,
      customType: customVal,
      serialNumber: asset.serialNumber,
      description: asset.description,
      location: asset.location
    });

    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedAsset = null;
  }

  saveAsset() {
    if (this.assetForm.invalid) {
      this.assetForm.markAllAsTouched();
      return;
    }

    const formVal = this.assetForm.value;
    
    // Agar 'NEW' select kiya hai, toh customType ki value backend bhejein
    const actualType = formVal.type === 'NEW' ? formVal.customType : formVal.type;

    const payload = {
      name: formVal.name,
      type: actualType,
      serialNumber: formVal.serialNumber,
      description: formVal.description,
      location: formVal.location,
      assetTag: this.isEditingAsset ? this.selectedAsset?.assetTag : this.assetsService.generateAssetTag()
    };

    if (this.isEditingAsset && this.selectedAsset) {
      this.assetsService.updateAsset(this.selectedAsset.serialNumber, payload).subscribe({
        next: () => {
          this.alert.success('Asset updated successfully');
          this.closeModal();
          this.loadData();
        },
        error: (err) => this.alert.error(err.error?.message || 'Update failed')
      });
    } else {
      this.assetsService.createAsset(payload).subscribe({
        next: () => {
          this.alert.success('Asset created successfully');
          this.closeModal();
          this.loadData();
        },
        error: (err) => this.alert.error(err.error?.message || 'Creation failed')
      });
    }
  }

  openAssignModal(asset: AssetDTO) {
    this.selectedAsset = asset;
    this.assigneeId = '';
    this.showAssignModal = true;
  }

  confirmAssign() {
    if (!this.selectedAsset?.serialNumber || !this.assigneeId) return;

    this.assetsService.assignAsset(this.selectedAsset.serialNumber, {
      employeeId: this.assigneeId,
      assignedBy: 'ADMIN'
    }).subscribe({
      next: () => {
        this.showAssignModal = false;
        this.alert.success('Asset assigned to staff member!');
        this.loadData();
      },
      error: (err) => {
        this.alert.error(err.error?.message || 'Assignment failed');
      }
    });
  }

  getAssetIcon(type: string): string {
    const t = (type || '').toUpperCase();
    if (t.includes('LAPTOP')) return 'fas fa-laptop';
    if (t.includes('PHONE') || t.includes('MOBILE')) return 'fas fa-mobile-alt';
    if (t.includes('MONITOR')) return 'fas fa-desktop';
    if (t.includes('KEYBOARD')) return 'fas fa-keyboard';
    if (t.includes('MOUSE')) return 'fas fa-mouse';
    return 'fas fa-box'; // Generic for new types
  }

  applyFilters() {
    let data = [...this.assets];

    if (this.statusFilter !== 'All') {
      data = data.filter(a => (a.status || '').toUpperCase() === this.statusFilter);
    }

    if (this.searchText.trim()) {
      const term = this.searchText.toLowerCase();
      data = data.filter(a =>
        (a.name && a.name.toLowerCase().includes(term)) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(term)) ||
        (a.assetTag && a.assetTag.toLowerCase().includes(term)) ||
        (a.type && a.type.toLowerCase().includes(term))
      );
    }
    
    this.filteredAssets = data;
  }
  
  setFilter(status: string) {
    this.statusFilter = status;
    this.applyFilters();
  }
}