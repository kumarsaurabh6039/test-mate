import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AdminUsersComponent } from './admin-users.component';
import { UserService } from '../../user-service.service';
import { AlertService } from '../../services/alert.service';

describe('AdminUsersComponent', () => {
  let component: AdminUsersComponent;
  let fixture: ComponentFixture<AdminUsersComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // ✅ standalone: true component goes in imports, NOT declarations
      imports: [
        AdminUsersComponent,
        HttpClientTestingModule,  // ✅ Required because UserService uses HttpClient internally
        RouterTestingModule
      ],
      providers: [
        UserService,   // ✅ Real service
        AlertService   // ✅ Real service (uses SweetAlert2 internally)
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges(); // triggers ngOnInit → getAllEmployees() HTTP call fires here
  });

  afterEach(() => {
    // ✅ Flush all pending HTTP requests so tests don't hang
    // ngOnInit calls getAllEmployees() → GET /api/employees
    httpMock.match(() => true).forEach(req => req.flush([]));
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
