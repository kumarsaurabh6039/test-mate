import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, EmployeeDTO } from '../user-service.service';
import { TeamService, TeamResponseDTO } from '../services/team.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

// View Model for Dashboard Grid
interface TeamMemberDisplay {
  name: string;
  designation: string;
  status: string;
  email: string;
  phone: string;
  imageUrl: string;
  color: string;
}

@Component({
  selector: 'app-dashboard-team',
  templateUrl: './dashboard-team.component.html',
  styleUrls: ['./dashboard-team.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class DashboardTeamComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  teamMembers: TeamMemberDisplay[] = [];
  myTeamName: string = '';
  
  @Input() isHR: boolean = false; 

  constructor(
    private userService: UserService,
    private teamService: TeamService
  ) {}

  ngOnInit(): void {
    this.isHR = this.userService.isHR(); 
    this.loadMyTeam();
  }
  
  ngOnDestroy(): void {
    // Clean up if needed
  }

  loadMyTeam(): void {
    this.isLoading = true;
    const myId = this.userService.getEmpIdFromToken();
    if(!myId) {
        this.isLoading = false;
        return;
    }

    // 1. Get My Team(s)
    this.teamService.getTeamsByEmployee(myId).subscribe({
        next: (response: any) => {
            let teams: TeamResponseDTO[] = [];
            
            // Handle various response structures
            if (response && Array.isArray(response.teams)) teams = response.teams;
            else if (response && Array.isArray(response.data)) teams = response.data;
            else if (Array.isArray(response)) teams = response;

            if (teams.length > 0) {
                // Assuming user is primarily in one team for display, take the first one
                const myTeam = teams[0];
                this.myTeamName = myTeam.teamName;
                
                // 2. Fetch details of members
                this.fetchMemberDetails(myTeam.memberEmpIds, myTeam.managerEmpId);
            } else {
                this.teamMembers = [];
                this.isLoading = false;
            }
        },
        error: (err) => {
            console.error('Failed to load team', err);
            this.isLoading = false;
        }
    });
  }

  fetchMemberDetails(memberIds: string[], managerId: string) {
      // Since we don't have a batch get API, we fetch all employees and filter (standard pattern for small-medium apps)
      // Or if your UserService has a cache, use that.
      this.userService.getAllEmployees().subscribe({
          next: (allEmps: EmployeeDTO[]) => {
              
              // Combine Manager and Members
              const teamIds = new Set([...memberIds, managerId]);
              
              const members = allEmps.filter(e => teamIds.has(e.empId));
              
              // Map to Display Model
              this.teamMembers = members.map(e => {
                  // Cast to any to safely access properties that might be missing in strict DTO
                  const empAny = e as any;
                  return {
                    name: `${e.firstName} ${e.surname}`,
                    // Fix 1: Ensure designation is always a string
                    designation: (e.designation || e.role || 'Team Member'),
                    status: e.empId === managerId ? 'Team Lead' : 'Member', 
                    email: e.personalEmailId || 'N/A',
                    phone: e.mobileNumber || 'N/A',
                    // Fix 2: Handle profilePictureUrl not being on EmployeeDTO interface
                    imageUrl: empAny.profilePictureUrl || 'assets/default-avatar.png',
                    color: e.empId === managerId ? 'online' : 'offline'
                  };
              });

              this.isLoading = false;
          },
          error: () => this.isLoading = false
      });
  }

  refreshData(): void {
      this.loadMyTeam();
  }

  getStatusClass(status: string): string {
    if (status === 'Team Lead') return 'online-badge';
    return 'offline-badge';
  }
}