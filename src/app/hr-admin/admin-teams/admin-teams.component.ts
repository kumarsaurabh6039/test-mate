import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { UserService, EmployeeDTO, TeamResponseDTO } from '../../user-service.service';
import { AlertService } from '../../services/alert.service';
import { TeamService } from 'src/app/services/team.service';

@Component({
  selector: 'app-admin-teams',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-teams.component.html',
  styleUrls: ['./admin-teams.component.css']
})
export class AdminTeamsComponent implements OnInit, OnDestroy {
  // Data State
  teams: TeamResponseDTO[] = [];
  filteredTeams: TeamResponseDTO[] = [];
  managers: EmployeeDTO[] = [];
  allEmployees: EmployeeDTO[] = [];
  employeeMap: Map<string, string> = new Map();
  isLoading = true;

  // Form State
  teamForm: FormGroup;
  showModal = false;
  isEditing = false;
  editingId: number | null = null;
  orgCode = 'DEFAULT';
  
  // Member Selection State
  selectedMemberIds: string[] = [];

  // Filters
  searchText = '';

  private subs = new Subscription();

  constructor(
    private fb: FormBuilder, 
    private userService: UserService, 
    private teamService: TeamService, // Inject TeamService
    private alert: AlertService
  ) {
    this.teamForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      managerEmpId: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.userService.getOrgCode().subscribe(c => this.orgCode = c || 'DEFAULT');

    // Real-time polling
    this.subs.add(
      interval(30000)
        .pipe(startWith(0))
        .subscribe(() => this.loadData())
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  loadData() {
    // 1. Fetch Teams using TeamService
    this.teamService.getAllTeams().subscribe({
      next: (response: any) => {
        let data: TeamResponseDTO[] = [];
        if (response && Array.isArray(response.teams)) {
            data = response.teams;
        } else if (response && Array.isArray(response.data)) {
            data = response.data;
        } else if (Array.isArray(response)) {
            data = response;
        }
        
        this.teams = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Teams fetch error', err);
        this.isLoading = false;
      }
    });

    // 2. Fetch Employees for Dropdowns & Mapping
    this.userService.getAllEmployees().subscribe({
      next: (e) => {
        this.allEmployees = e;
        this.managers = e.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN'); // Allow Admins too
        
        e.forEach(emp => {
          this.employeeMap.set(emp.empId, `${emp.firstName} ${emp.surname}`);
        });
      }
    });
  }

  getManagerName(empId: string): string {
    if (!empId) return 'Unassigned';
    return this.employeeMap.get(empId) || empId;
  }

  openCreateModal() {
    this.isEditing = false;
    this.teamForm.reset({ managerEmpId: '' });
    this.selectedMemberIds = [];
    this.showModal = true;
  }

  openEditModal(team: TeamResponseDTO) {
    this.isEditing = true;
    this.editingId = team.id;
    
    // Map 'teamName' from API to 'name' in Form
    this.teamForm.patchValue({
      name: team.teamName, 
      description: team.description,
      managerEmpId: team.managerEmpId || ''
    });
    
    this.selectedMemberIds = team.memberEmpIds ? [...team.memberEmpIds] : [];
    this.showModal = true;
  }

  // --- Member Selection Logic ---
  toggleMember(empId: string) {
    const idx = this.selectedMemberIds.indexOf(empId);
    if (idx > -1) {
      this.selectedMemberIds.splice(idx, 1);
    } else {
      this.selectedMemberIds.push(empId);
    }
  }

  isMemberSelected(empId: string): boolean {
    return this.selectedMemberIds.includes(empId);
  }

  shouldShowMember(emp: EmployeeDTO, term: string): boolean {
    if (!term) return true;
    const t = term.toLowerCase();
    return emp.firstName.toLowerCase().includes(t) || 
           emp.surname.toLowerCase().includes(t) ||
           emp.empId.toLowerCase().includes(t);
  }

  async deleteTeam(team: TeamResponseDTO) {
    if(await this.alert.confirm(`Delete Team?`, `Are you sure you want to delete ${team.teamName}?`)) {
        this.teamService.deleteTeam(team.id).subscribe({
            next: () => {
                this.alert.success('Team deleted successfully');
                this.loadData();
            },
            error: () => this.alert.error('Failed to delete team')
        });
    }
  }

  submit() {
    if (this.teamForm.invalid) {
      this.teamForm.markAllAsTouched();
      return;
    }

    const payload = { 
      ...this.teamForm.value, 
      memberEmpIds: this.selectedMemberIds
    };
    
    if (this.isEditing && this.editingId) {
        this.teamService.updateTeam(this.editingId, payload).subscribe({
            next: () => { 
              this.showModal = false; 
              this.alert.success('Team updated successfully!'); 
              this.loadData();
            },
            error: () => this.alert.error('Update failed')
        });
    } else {
        this.teamService.createTeam(payload).subscribe({
            next: () => { 
              this.showModal = false; 
              this.alert.success('Team created successfully!'); 
              this.loadData();
            },
            error: () => this.alert.error('Creation failed')
        });
    }
  }

  applyFilters() {
    if (!this.searchText.trim()) {
      this.filteredTeams = this.teams;
      return;
    }

    const term = this.searchText.toLowerCase();
    this.filteredTeams = this.teams.filter(t => 
      (t.teamName)?.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term) ||
      this.getManagerName(t.managerEmpId).toLowerCase().includes(term)
    );
  }
}