
export enum SpaceCategory {
  LAB = 'Laboratórios',
  NATURE = 'Natureza',
  AMBIENTS = 'Ambientes'
}

export interface Space {
  id: string;
  name: string;
  category: SpaceCategory;
  capacity: number;
  location: string;
  image: string;
  icon: string;
  status: 'Livre' | 'Ocupado' | 'Manutenção';
  color: string;
}

export interface Booking {
  id: string;
  spaceId: string;
  spaceName: string;
  date: string;
  lessons: number[];
  course: string;
  year: string;
  status: 'Confirmado' | 'Pendente' | 'Cancelado';
}

export interface User {
  id?: string;
  name: string;
  role: string;
  department: string;
  email: string;
  avatar: string;
  theme?: 'light' | 'dark';
  assigned_space_id?: string;
}
