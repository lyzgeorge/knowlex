/**
 * Mock data utilities for Knowlex Desktop Application
 * Provides realistic sample data for development and testing
 */

import type { Project } from '../../../shared/types/project'
import type { Conversation } from '../../../shared/types/conversation'

/**
 * Generate mock projects with different characteristics
 */
export function generateMockProjects(): Project[] {
  const now = new Date()

  return [
    {
      id: 'proj-1',
      name: 'React Dashboard Project',
      description:
        'Building a modern dashboard with React, TypeScript, and data visualization components',
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      stats: {
        conversationCount: 12,
        messageCount: 89,
        fileCount: 15,
        totalFileSize: 2457600 // 2.4 MB
      }
    },
    {
      id: 'proj-2',
      name: 'AI Research Paper Analysis',
      description:
        'Analyzing recent papers on transformer architectures and their applications in NLP tasks',
      createdAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago
      updatedAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
      stats: {
        conversationCount: 8,
        messageCount: 156,
        fileCount: 23,
        totalFileSize: 8947200 // 8.9 MB
      }
    },
    {
      id: 'proj-3',
      name: 'E-commerce Backend API',
      description:
        'RESTful API development for an e-commerce platform using Node.js and PostgreSQL',
      createdAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(), // 18 days ago
      updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      stats: {
        conversationCount: 6,
        messageCount: 42,
        fileCount: 8,
        totalFileSize: 1254400 // 1.3 MB
      }
    },
    {
      id: 'proj-4',
      name: 'Machine Learning Models',
      description:
        'Experimenting with different ML algorithms for image classification and natural language processing',
      createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
      updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      stats: {
        conversationCount: 15,
        messageCount: 203,
        fileCount: 31,
        totalFileSize: 15728640 // 15.7 MB
      }
    },
    {
      id: 'proj-5',
      name: 'Mobile App UI Design',
      description:
        'Designing user interfaces for a cross-platform mobile application with React Native',
      createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
      updatedAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(), // 20 minutes ago
      stats: {
        conversationCount: 4,
        messageCount: 28,
        fileCount: 12,
        totalFileSize: 5242880 // 5.2 MB
      }
    }
  ]
}

/**
 * Generate mock conversations with various states and timestamps
 */
export function generateMockConversations(): Conversation[] {
  const now = new Date()

  return [
    // Project conversations
    {
      id: 'conv-1',
      projectId: 'proj-1',
      title: 'React Router v6 Migration',
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    {
      id: 'conv-2',
      projectId: 'proj-1',
      title: 'Chart.js Integration Issues',
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString() // 6 hours ago
    },
    {
      id: 'conv-3',
      projectId: 'proj-1',
      title: 'TypeScript Generic Components',
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    },
    {
      id: 'conv-4',
      projectId: 'proj-1',
      title: 'State Management with Zustand',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
    },

    // AI Research Project conversations
    {
      id: 'conv-5',
      projectId: 'proj-2',
      title: 'Transformer Architecture Analysis',
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString() // 45 minutes ago
    },
    {
      id: 'conv-6',
      projectId: 'proj-2',
      title: 'BERT vs GPT Performance Comparison',
      createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    },
    {
      id: 'conv-7',
      projectId: 'proj-2',
      title: 'Fine-tuning Strategies',
      createdAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
    },

    // E-commerce Backend conversations
    {
      id: 'conv-8',
      projectId: 'proj-3',
      title: 'JWT Authentication Implementation',
      createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
    },
    {
      id: 'conv-9',
      projectId: 'proj-3',
      title: 'Database Schema Optimization',
      createdAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
    },

    // ML Models conversations
    {
      id: 'conv-10',
      projectId: 'proj-4',
      title: 'CNN Architecture for Image Classification',
      createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
    },
    {
      id: 'conv-11',
      projectId: 'proj-4',
      title: 'Data Preprocessing Pipeline',
      createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString() // 15 days ago
    },

    // Mobile App conversations
    {
      id: 'conv-12',
      projectId: 'proj-5',
      title: 'Navigation Component Design',
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString() // 20 minutes ago
    },
    {
      id: 'conv-13',
      projectId: 'proj-5',
      title: 'Responsive Layout Strategies',
      createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    },

    // Unclassified conversations (no projectId)
    {
      id: 'conv-14',
      title: 'Quick JavaScript Question',
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString() // 4 hours ago
    },
    {
      id: 'conv-15',
      title: 'CSS Grid Layout Help',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString() // 8 hours ago
    },
    {
      id: 'conv-16',
      title: 'Python List Comprehension Examples',
      createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      updatedAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString() // 15 minutes ago
    },
    {
      id: 'conv-17',
      title: 'Git Workflow Best Practices',
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
    },
    {
      id: 'conv-18',
      title: 'Docker Compose Configuration',
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
      updatedAt: new Date(now.getTime() - 90 * 60 * 1000).toISOString() // 90 minutes ago
    }
  ]
}

/**
 * Get all mock data for initialization
 */
export function getMockData() {
  return {
    projects: generateMockProjects(),
    conversations: generateMockConversations()
  }
}

/**
 * Generate additional mock projects for testing
 */
export function generateAdditionalMockProjects(count: number): Project[] {
  const projects: Project[] = []
  const now = new Date()

  const projectTemplates = [
    'Frontend Development',
    'Backend API Design',
    'Database Optimization',
    'Mobile App Development',
    'Data Science Analysis',
    'DevOps Automation',
    'UI/UX Research',
    'Security Testing',
    'Performance Optimization',
    'Code Review Process'
  ]

  const descriptions = [
    'Working on modern web development techniques and best practices',
    'Building scalable server-side applications with robust architecture',
    'Analyzing and optimizing database performance for better user experience',
    'Creating cross-platform mobile applications with native performance',
    'Exploring data patterns and machine learning algorithms',
    'Automating deployment pipelines and infrastructure management',
    'Researching user behavior and interface design principles',
    'Testing application security and vulnerability assessment',
    'Improving application performance and resource utilization',
    'Establishing code quality standards and review processes'
  ]

  for (let i = 0; i < count; i++) {
    const template = projectTemplates[i % projectTemplates.length]
    const description = descriptions[i % descriptions.length]
    const createdDaysAgo = Math.floor(Math.random() * 30) + 1 // 1-30 days ago
    const updatedDaysAgo = Math.floor(Math.random() * createdDaysAgo) // 0 to createdDaysAgo

    projects.push({
      id: `proj-extra-${i + 1}`,
      name: `${template} ${i + 1}`,
      description,
      createdAt: new Date(now.getTime() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - updatedDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      stats: {
        conversationCount: Math.floor(Math.random() * 20) + 1,
        messageCount: Math.floor(Math.random() * 200) + 10,
        fileCount: Math.floor(Math.random() * 50) + 1,
        totalFileSize: Math.floor(Math.random() * 10485760) + 1048576 // 1MB to 10MB
      }
    })
  }

  return projects
}

/**
 * Generate additional mock conversations for testing
 */
export function generateAdditionalMockConversations(
  projectIds: string[],
  count: number
): Conversation[] {
  const conversations: Conversation[] = []
  const now = new Date()

  const conversationTitles = [
    'API Integration Discussion',
    'Code Review Feedback',
    'Bug Fix Implementation',
    'Feature Development Planning',
    'Performance Optimization',
    'Database Query Optimization',
    'User Interface Improvements',
    'Testing Strategy Discussion',
    'Documentation Updates',
    'Deployment Configuration'
  ]

  for (let i = 0; i < count; i++) {
    const title = conversationTitles[i % conversationTitles.length]
    const createdDaysAgo = Math.floor(Math.random() * 15) + 1 // 1-15 days ago
    const updatedDaysAgo = Math.floor(Math.random() * createdDaysAgo) // 0 to createdDaysAgo

    // 70% chance to be in a project, 30% chance to be unclassified
    const projectId =
      Math.random() < 0.7 ? projectIds[Math.floor(Math.random() * projectIds.length)] : undefined

    conversations.push({
      id: `conv-extra-${i + 1}`,
      projectId,
      title: `${title} ${i + 1}`,
      createdAt: new Date(now.getTime() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - updatedDaysAgo * 24 * 60 * 60 * 1000).toISOString()
    })
  }

  return conversations
}
