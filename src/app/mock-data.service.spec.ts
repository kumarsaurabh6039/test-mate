import { TestBed } from '@angular/core/testing';

class MockDataService {}

describe('MockDataService', () => {
  let service: MockDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockDataService]
    });
    service = TestBed.inject(MockDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
