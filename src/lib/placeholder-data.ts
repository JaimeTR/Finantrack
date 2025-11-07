import type { Transaction, Goal, Budget } from '@/lib/types';

export const placeholderUser = {
  uid: '1',
  name: 'Juan Universitario',
  email: 'juan.uni@example.com',
  photoURL: '/placeholder-avatar.png',
  createdAt: new Date(),
};

export const placeholderTransactions: Transaction[] = [
  { id: '1', userId: '1', type: 'expense', category: 'Comida', amount: 15.50, description: 'Almuerzo en la cafetería', date: new Date('2024-07-21T13:00:00Z') },
  { id: '2', userId: '1', type: 'expense', category: 'Transporte', amount: 2.00, description: 'Pasaje de bus', date: new Date('2024-07-21T08:00:00Z') },
  { id: '3', userId: '1', type: 'income', category: 'Beca', amount: 200.00, description: 'Beca', date: new Date('2024-07-20T10:00:00Z') },
  { id: '4', userId: '1', type: 'expense', category: 'Ocio', amount: 25.00, description: 'Cine con amigos', date: new Date('2024-07-19T19:00:00Z') },
  { id: '5', userId: '1', type: 'expense', category: 'Estudios', amount: 80.00, description: 'Libro de cálculo', date: new Date('2024-07-18T15:00:00Z') },
  { id: '6', userId: '1', type: 'expense', category: 'Comida', amount: 8.00, description: 'Café y postre', date: new Date('2024-07-18T16:30:00Z') },
  { id: '7', userId: '1', type: 'expense', category: 'Ahorro', amount: 50.00, description: 'Ahorro para laptop', date: new Date('2024-07-15T11:00:00Z') },
  { id: '8', userId: '1', type: 'expense', category: 'Comida', amount: 45.00, description: 'Pizza', date: new Date('2024-07-22T20:00:00Z') },
  { id: '9', userId: '1', type: 'expense', category: 'Transporte', amount: 2.00, description: 'Pasaje de bus', date: new Date('2024-07-22T08:00:00Z') },
  { id: '10', userId: '1', type: 'expense', category: 'Ocio', amount: 30.00, description: 'Concierto', date: new Date('2024-07-23T21:00:00Z') },
];

export const placeholderGoals: Goal[] = [
  { id: '1', userId: '1', title: 'Nueva Laptop para la Universidad', targetAmount: 2500, currentAmount: 750, deadline: new Date('2024-12-15') },
  { id: '2', userId: '1', title: 'Viaje de Fin de Semestre', targetAmount: 800, currentAmount: 600, deadline: new Date('2024-11-30') },
  { id: '3', userId: '1', title: 'Fondo de Emergencia', targetAmount: 1000, currentAmount: 200, deadline: new Date('2025-06-30') },
];

export const placeholderBudget: Budget = {
  id: '2024-07',
  userId: '1',
  month: 'July 2024',
  total: 800,
  categories: [
    { category: 'Comida', amount: 300, spent: 150.50 },
    { category: 'Transporte', amount: 80, spent: 40.00 },
    { category: 'Ocio', amount: 150, spent: 100.00 },
    { category: 'Estudios', amount: 120, spent: 80.00 },
    { category: 'Ahorro', amount: 150, spent: 50.00 },
  ],
};

export const transactionCategories = ["Comida", "Transporte", "Ocio", "Estudios", "Salud", "Ropa", "Metas", "Otros"];
export const incomeCategories = ['Sueldo', 'Beca', 'Venta', 'Regalo', 'Automático', 'Otros'];
