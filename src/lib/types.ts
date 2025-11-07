// Eliminado el tipo Timestamp de Firebase. Usamos Date nativa.

export type User = {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  createdAt: Date;
  accountType?: 'Free' | 'Premium' | 'Student';
  role?: 'admin' | 'user';
};

export type Transaction = {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: Date;
};

export type BudgetCategory = {
  category: string;
  amount: number;
  spent?: number;
};

export type Budget = {
  id: string; // e.g., '2024-08'
  userId: string;
  month: string; // e.g., 'August 2024'
  total: number;
  categories: BudgetCategory[];
};


export type Goal = {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
};

export type GoalContribution = {
  id: string;
  userId: string;
  goalId: string;
  amount: number;
  date: Date;
  sourceDescription: string; // e.g., "From 'Beca universitaria' income"
};
