import { NavigationRoute } from '../types';

export const NAVIGATION_ROUTES: NavigationRoute[] = [
  {
    id: 'assistant',
    path: '/app/assistant',
    title: 'ORBIT AI Assistant',
    shortDescription: 'Ask ORBIT about energy risks, disruptions, and reserves',
    iconName: 'Bot',
    phaseNumber: 9,
    phaseLabel: 'AI Module'
  },
  {
    id: 'dashboard',
    path: '/app/dashboard',
    title: 'Command Overview',
    shortDescription: 'Protected command overview for energy supply-chain risk',
    iconName: 'LayoutDashboard',
    phaseNumber: 1,
    phaseLabel: 'Phase 1 Foundation'
  },
  {
    id: 'network',
    path: '/app/network',
    title: 'Digital Twin Network',
    shortDescription: 'Live network nodes, state, and impact analysis',
    iconName: 'Network',
    phaseNumber: 3,
    phaseLabel: 'Phase 3 Digital Twin'
  },
  {
    id: 'reserves',
    path: '/app/reserves',
    title: 'Reserve Management',
    shortDescription: 'Review strategic reserve coverage and planning',
    iconName: 'Database',
    phaseNumber: 7,
    phaseLabel: 'Future Module'
  },
  {
    id: 'geopolitical',
    path: '/app/geopolitical',
    title: 'Geopolitical Risk Agent',
    shortDescription: 'Analyze geopolitical events and energy supply-chain risk',
    iconName: 'ShieldAlert',
    phaseNumber: 8,
    phaseLabel: 'Intelligence Module'
  }
];
