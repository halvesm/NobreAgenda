
import { Space, SpaceCategory } from './types';

export const SPACES: Space[] = [
  // Categoria Natureza (Química, Biologia, Física e Matemática)
  {
    id: '1',
    name: 'Laboratório de Química',
    category: SpaceCategory.NATURE,
    capacity: 45,
    location: 'Bloco B • Térreo',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800',
    icon: 'biotech',
    status: 'Livre',
    color: 'blue'
  },
  {
    id: '2',
    name: 'Laboratório de Biologia',
    category: SpaceCategory.NATURE,
    capacity: 45,
    location: 'Bloco B • Térreo',
    image: 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?q=80&w=800',
    icon: 'ecg_heart',
    status: 'Livre',
    color: 'green'
  },
  {
    id: '3',
    name: 'Laboratório de Física',
    category: SpaceCategory.NATURE,
    capacity: 45,
    location: 'Bloco B • 1º Andar',
    image: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=800',
    icon: 'hub',
    status: 'Livre',
    color: 'purple'
  },
  {
    id: '4',
    name: 'Laboratório de Matemática',
    category: SpaceCategory.NATURE,
    capacity: 45,
    location: 'Bloco A • 1º Andar',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800',
    icon: 'calculate',
    status: 'Livre',
    color: 'indigo'
  },
  // Categoria Laboratórios (Informática, Línguas e Enfermagem)
  {
    id: '5',
    name: 'Laboratório de Informática',
    category: SpaceCategory.LAB,
    capacity: 45,
    location: 'Bloco A • 2º Andar',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800',
    icon: 'desktop_windows',
    status: 'Livre',
    color: 'blue'
  },
  {
    id: '6',
    name: 'Laboratório de Línguas',
    category: SpaceCategory.LAB,
    capacity: 45,
    location: 'Bloco C • 2º Andar',
    image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=800',
    icon: 'language',
    status: 'Livre',
    color: 'emerald'
  },
  {
    id: '7',
    name: 'Laboratório de Enfermagem',
    category: SpaceCategory.LAB,
    capacity: 45,
    location: 'Bloco D • Térreo',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800',
    icon: 'medical_services',
    status: 'Livre',
    color: 'rose'
  },
  // Categoria Ambientes (Auditório, Biblioteca e Quadra Poliesportiva)
  {
    id: '8',
    name: 'Auditório',
    category: SpaceCategory.AMBIENTS,
    capacity: 200,
    location: 'Bloco Central',
    image: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=800',
    icon: 'podium',
    status: 'Livre',
    color: 'blue'
  },
  {
    id: '9',
    name: 'Biblioteca',
    category: SpaceCategory.AMBIENTS,
    capacity: 45,
    location: 'Bloco C • Térreo',
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800',
    icon: 'menu_book',
    status: 'Livre',
    color: 'emerald'
  },
  {
    id: '10',
    name: 'Quadra Poliesportiva',
    category: SpaceCategory.AMBIENTS,
    capacity: 1500,
    location: 'Área Externa',
    image: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a26?q=80&w=800',
    icon: 'sports_basketball',
    status: 'Livre',
    color: 'orange'
  }
];

export const DEPARTMENTS = [
  'Linguagens',
  'Matemática',
  'Natureza',
  'Humanas',
  'Administração',
  'Contabilidade',
  'Enfermagem',
  'Informática',
  'Direção',
  'Coordenação',
  'Secretaria',
  'Acessoria Financeira'
];

export const COURSES = [
  'Administração',
  'Contabilidade',
  'Enfermagem',
  'Informática',
  'Outros'
];

export const LESSONS = [
  '1ª Aula', '2ª Aula',
  'Interv. Manhã',
  '3ª Aula', '4ª Aula', '5ª Aula',
  'Almoço',
  '6ª Aula', '7ª Aula',
  'Interv. Tarde',
  '8ª Aula', '9ª Aula'
];
