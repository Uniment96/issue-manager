import { User, Issue } from '../../types';

export const MOCK_USERS: Record<string, User> = {
  'waiter@test.com': {
    uid: 'mock-waiter-1',
    email: 'waiter@test.com',
    displayName: 'Alex Kumar',
    role: 'waiter',
  },
  'chef@test.com': {
    uid: 'mock-chef-1',
    email: 'chef@test.com',
    displayName: 'Maria Santos',
    role: 'chef',
  },
  'supervisor@test.com': {
    uid: 'mock-supervisor-1',
    email: 'supervisor@test.com',
    displayName: 'Sam Patel',
    role: 'supervisor',
  },
  'manager@test.com': {
    uid: 'mock-manager-1',
    email: 'manager@test.com',
    displayName: 'Jordan Lee',
    role: 'manager',
  },
};

const now = Date.now();
const min = (n: number) => n * 60 * 1000;

export const MOCK_ISSUES: Issue[] = [
  {
    id: 'mock-1',
    category: 'food',
    description: 'Steak ordered medium-rare came out well done. Customer is unhappy.',
    tableNumber: '5',
    status: 'OPEN',
    createdBy: 'mock-waiter-1',
    createdByName: 'Alex Kumar',
    createdAt: now - min(15),
    updatedAt: now - min(15),
  },
  {
    id: 'mock-2',
    category: 'food',
    description: 'Pasta dish missing the sauce. Kitchen needs to remake.',
    tableNumber: '8',
    status: 'IN_PROGRESS',
    createdBy: 'mock-waiter-1',
    createdByName: 'Alex Kumar',
    createdAt: now - min(8),
    updatedAt: now - min(3),
  },
  {
    id: 'mock-3',
    category: 'service',
    description: 'Table 12 has been waiting 20 minutes for their drinks order.',
    tableNumber: '12',
    status: 'OPEN',
    createdBy: 'mock-waiter-1',
    createdByName: 'Alex Kumar',
    createdAt: now - min(22),
    updatedAt: now - min(22),
  },
  {
    id: 'mock-4',
    category: 'hygiene',
    description: 'Spill near the entrance, floor is slippery. Needs immediate cleaning.',
    tableNumber: '1',
    status: 'IN_PROGRESS',
    createdBy: 'mock-waiter-1',
    createdByName: 'Alex Kumar',
    createdAt: now - min(5),
    updatedAt: now - min(2),
  },
  {
    id: 'mock-5',
    category: 'billing',
    description: 'Customer at table 3 was charged twice for the same item.',
    tableNumber: '3',
    status: 'OPEN',
    createdBy: 'mock-waiter-1',
    createdByName: 'Alex Kumar',
    createdAt: now - min(10),
    updatedAt: now - min(10),
  },
  {
    id: 'mock-6',
    category: 'food',
    description: 'Soup is cold, needs to be reheated before serving.',
    tableNumber: '7',
    status: 'RESOLVED',
    createdBy: 'mock-waiter-1',
    createdByName: 'Alex Kumar',
    createdAt: now - min(30),
    updatedAt: now - min(20),
  },
  {
    id: 'mock-7',
    category: 'service',
    description: 'Air conditioning at table 9 section is too cold, customers complaining.',
    tableNumber: '9',
    status: 'OPEN',
    createdBy: 'mock-waiter-1',
    createdByName: 'Alex Kumar',
    createdAt: now - min(18),
    updatedAt: now - min(18),
  },
  {
    id: 'mock-8',
    category: 'food',
    description: 'Vegetarian dish contains meat. Urgent — customer has dietary restriction.',
    tableNumber: '14',
    status: 'IN_PROGRESS',
    createdBy: 'mock-waiter-1',
    createdByName: 'Alex Kumar',
    createdAt: now - min(6),
    updatedAt: now - min(1),
  },
  {
    id: 'mock-9',
    category: 'hygiene',
    description: 'Restroom out of paper towels and soap needs refill.',
    tableNumber: '0',
    status: 'RESOLVED',
    createdBy: 'mock-waiter-1',
    createdByName: 'Alex Kumar',
    createdAt: now - min(45),
    updatedAt: now - min(35),
  },
  {
    id: 'mock-10',
    category: 'billing',
    description: 'POS terminal at station 2 not printing receipts.',
    tableNumber: '2',
    status: 'OPEN',
    createdBy: 'mock-waiter-1',
    createdByName: 'Alex Kumar',
    createdAt: now - min(12),
    updatedAt: now - min(12),
  },
];

/** Filter mock issues the same way Firestore would for each role */
export function getMockIssuesForRole(role: string, uid: string): Issue[] {
  switch (role) {
    case 'waiter':
      return MOCK_ISSUES.filter((i) => i.createdBy === uid);
    case 'chef':
      return MOCK_ISSUES.filter((i) => i.category === 'food');
    case 'supervisor':
      return MOCK_ISSUES.filter((i) => i.category === 'service' || i.category === 'hygiene');
    case 'manager':
      return MOCK_ISSUES;
    default:
      return [];
  }
}
