// Mock / initial seed orders for testing and development.
// Owner: A3 (Data and State).

export const mockOrders = [
  {
    id: 'ord_101a',
    reference: 'FC-20261101-BET1',
    userId: null, // guest
    customerName: 'Alice Green',
    customerEmail: 'alice@example.com',
    customerPhone: '555-0199',
    street: '124 Ocean Parkway',
    city: 'Seattle',
    postalCode: '98101',
    notes: 'Please leave at front door porch.',
    items: [
      {
        productId: 'crown-tail-betta',
        name: 'Crown Tail Betta',
        price: 24.99,
        quantity: 1,
        image: '/images/placeholder.svg',
      },
      {
        productId: 'neon-tetra',
        name: 'Neon Tetra',
        price: 3.99,
        quantity: 3,
        image: '/images/placeholder.svg',
      },
    ],
    subtotal: 36.96,
    shipping: 5.99,
    total: 42.95,
    status: 'Confirmed',
    timeline: [
      { status: 'Pending', at: '2026-11-01T10:00:00Z' },
      { status: 'Confirmed', at: '2026-11-01T10:15:00Z' },
    ],
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-01T10:15:00Z',
  },
  {
    id: 'ord_102b',
    reference: 'FC-20261102-CLW2',
    userId: null,
    customerName: 'Marcus Vance',
    customerEmail: 'marcus@example.com',
    customerPhone: '555-0248',
    street: '742 Coral Reef Way',
    city: 'San Diego',
    postalCode: '92101',
    notes: '',
    items: [
      {
        productId: 'ocellaris-clownfish',
        name: 'Ocellaris Clownfish',
        price: 29.99,
        quantity: 2,
        image: '/images/placeholder.svg',
      },
    ],
    subtotal: 59.98,
    shipping: 5.99,
    total: 65.97,
    status: 'Pending',
    timeline: [
      { status: 'Pending', at: '2026-11-02T14:30:00Z' },
    ],
    createdAt: '2026-11-02T14:30:00Z',
    updatedAt: '2026-11-02T14:30:00Z',
  },
]
