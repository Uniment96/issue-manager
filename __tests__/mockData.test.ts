import { MOCK_USERS, MOCK_ISSUES, getMockIssuesForRole } from '../src/services/mock/mockData';

describe('mockData', () => {
  describe('MOCK_USERS', () => {
    it('has all four roles', () => {
      const roles = Object.values(MOCK_USERS).map((u) => u.role);
      expect(roles).toContain('waiter');
      expect(roles).toContain('chef');
      expect(roles).toContain('supervisor');
      expect(roles).toContain('manager');
    });

    it('each user has required fields', () => {
      Object.values(MOCK_USERS).forEach((u) => {
        expect(u.uid).toBeTruthy();
        expect(u.email).toBeTruthy();
        expect(u.displayName).toBeTruthy();
        expect(u.role).toBeTruthy();
      });
    });

    it('is keyed by lowercase email', () => {
      expect(MOCK_USERS['waiter@test.com']).toBeDefined();
      expect(MOCK_USERS['chef@test.com']).toBeDefined();
      expect(MOCK_USERS['supervisor@test.com']).toBeDefined();
      expect(MOCK_USERS['manager@test.com']).toBeDefined();
    });
  });

  describe('MOCK_ISSUES', () => {
    it('has 10 issues', () => {
      expect(MOCK_ISSUES).toHaveLength(10);
    });

    it('all issues have required fields', () => {
      MOCK_ISSUES.forEach((issue) => {
        expect(issue.id).toBeTruthy();
        expect(['food', 'service', 'billing', 'hygiene']).toContain(issue.category);
        expect(issue.description).toBeTruthy();
        expect(issue.tableNumber).toBeDefined();
        expect(['OPEN', 'IN_PROGRESS', 'RESOLVED']).toContain(issue.status);
        expect(issue.createdBy).toBeTruthy();
        expect(issue.createdByName).toBeTruthy();
        expect(typeof issue.createdAt).toBe('number');
        expect(typeof issue.updatedAt).toBe('number');
      });
    });

    it('has a mix of statuses', () => {
      const statuses = MOCK_ISSUES.map((i) => i.status);
      expect(statuses).toContain('OPEN');
      expect(statuses).toContain('IN_PROGRESS');
      expect(statuses).toContain('RESOLVED');
    });

    it('has all four categories', () => {
      const cats = MOCK_ISSUES.map((i) => i.category);
      expect(cats).toContain('food');
      expect(cats).toContain('service');
      expect(cats).toContain('billing');
      expect(cats).toContain('hygiene');
    });
  });

  describe('getMockIssuesForRole', () => {
    it('waiter sees only their own issues', () => {
      const issues = getMockIssuesForRole('waiter', 'mock-waiter-1');
      expect(issues.every((i) => i.createdBy === 'mock-waiter-1')).toBe(true);
    });

    it('waiter with unknown uid sees no issues', () => {
      const issues = getMockIssuesForRole('waiter', 'unknown-uid');
      expect(issues).toHaveLength(0);
    });

    it('chef sees only food issues', () => {
      const issues = getMockIssuesForRole('chef', 'any-uid');
      expect(issues.every((i) => i.category === 'food')).toBe(true);
      expect(issues.length).toBeGreaterThan(0);
    });

    it('supervisor sees only service and hygiene issues', () => {
      const issues = getMockIssuesForRole('supervisor', 'any-uid');
      expect(issues.every((i) => i.category === 'service' || i.category === 'hygiene')).toBe(true);
      expect(issues.length).toBeGreaterThan(0);
    });

    it('manager sees all issues', () => {
      const issues = getMockIssuesForRole('manager', 'any-uid');
      expect(issues).toHaveLength(MOCK_ISSUES.length);
    });

    it('unknown role sees no issues', () => {
      const issues = getMockIssuesForRole('unknown', 'any-uid');
      expect(issues).toHaveLength(0);
    });
  });
});
