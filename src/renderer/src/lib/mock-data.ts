import { User, Project, Chat } from './types' // Assuming types will be defined here

// Helper to create past dates for timestamps
const daysAgo = (days: number) => new Date(new Date().setDate(new Date().getDate() - days))
const hoursAgo = (hours: number) => new Date(new Date().setHours(new Date().getHours() - hours))
const minutesAgo = (minutes: number) =>
  new Date(new Date().setMinutes(new Date().getMinutes() - minutes))

export const mockUser: User = {
  name: 'Alex Chen',
  avatarUrl: 'https://i.pravatar.cc/40?u=alexchen'
}

const project1Chats: Chat[] = [
  { id: 'p1c1', title: 'Initial project brainstorming', lastUpdatedAt: minutesAgo(5) },
  { id: 'p1c2', title: 'Component architecture discussion', lastUpdatedAt: hoursAgo(2) },
  { id: 'p1c3', title: 'Database schema planning', lastUpdatedAt: daysAgo(1) }
]

const project2Chats: Chat[] = [
  { id: 'p2c1', title: 'Q3 marketing strategy', lastUpdatedAt: daysAgo(3) },
  { id: 'p2c2', title: 'Social media campaign copy', lastUpdatedAt: daysAgo(8) }
]

export const mockProjects: Project[] = [
  { id: 'proj-1', name: 'Knowlex App Development', chats: project1Chats, isExpanded: true },
  { id: 'proj-2', name: 'Marketing Q3', chats: project2Chats, isExpanded: false },
  { id: 'proj-3', name: 'Personal Notes', chats: [], isExpanded: false }
]

export const mockUncategorizedChats: Chat[] = [
  { id: 'uc1', title: 'Quick note aboutElectron versions', lastUpdatedAt: new Date() },
  { id: 'uc2', title: 'Groceries list for tonight', lastUpdatedAt: hoursAgo(5) },
  { id: 'uc3', title: 'Book recommendations from John', lastUpdatedAt: daysAgo(2) },
  {
    id: 'uc4',
    title: 'A very long chat title to test text truncation and wrapping',
    lastUpdatedAt: daysAgo(10)
  },
  { id: 'uc5', title: 'Another chat to make the list scroll', lastUpdatedAt: daysAgo(12) },
  { id: 'uc6', title: 'Chat from last month', lastUpdatedAt: daysAgo(35) }
]
