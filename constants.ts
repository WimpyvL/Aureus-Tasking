import { TeamMember } from './types';

export const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Alex Chen',
    role: 'Frontend Engineer',
    location: 'San Francisco, USA',
    timezone: 'America/Los_Angeles',
    avatarUrl: 'https://picsum.photos/id/64/200/200',
    workStartHour: 9,
    workEndHour: 17,
    tasks: [
      { id: 't1', text: 'Review PR #402', completed: false },
      { id: 't2', text: 'Update documentation', completed: true },
    ]
  },
  {
    id: '2',
    name: 'Sarah Miller',
    role: 'Product Manager',
    location: 'London, UK',
    timezone: 'Europe/London',
    avatarUrl: 'https://picsum.photos/id/65/200/200',
    workStartHour: 9,
    workEndHour: 18,
    tasks: [
      { id: 't3', text: 'Q3 Roadmap Sync', completed: false },
      { id: 't4', text: 'Client meeting notes', completed: false },
      { id: 't5', text: 'Approve designs', completed: true },
    ]
  },
  {
    id: '3',
    name: 'Kenji Tanaka',
    role: 'Backend Lead',
    location: 'Tokyo, Japan',
    timezone: 'Asia/Tokyo',
    avatarUrl: 'https://picsum.photos/id/91/200/200',
    workStartHour: 10,
    workEndHour: 19,
    tasks: []
  },
  {
    id: '4',
    name: 'Priya Patel',
    role: 'Designer',
    location: 'Bangalore, India',
    timezone: 'Asia/Kolkata',
    avatarUrl: 'https://picsum.photos/id/129/200/200',
    workStartHour: 11,
    workEndHour: 20,
    tasks: [
        { id: 't6', text: 'Figma prototype', completed: false }
    ]
  }
];