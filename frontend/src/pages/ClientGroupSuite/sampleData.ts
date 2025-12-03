/**
 * Sample Data for ClientGroupSuite
 *
 * This file contains mock data for development and testing.
 * In production, this data will come from API endpoints.
 */

import {
  ClientGroup,
  ProductOwner,
  Product,
  Activity,
  Meeting,
} from './types';

// Sample client group
export const sampleClientGroup: ClientGroup = {
  id: 1,
  name: 'Smith Family Trust',
  type: 'Joint',
  status: 'active',
  created_at: '2024-01-15',
  advisor_name: 'John Advisor',
};

// Sample product owners
export const sampleProductOwners: ProductOwner[] = [
  {
    id: 1,
    firstname: 'John',
    surname: 'Smith',
    title: 'Mr',
    email_1: 'john.smith@example.com',
    phone_1: '+44 7700 900000',
    dob: '1975-05-15',
    status: 'active',
  },
  {
    id: 2,
    firstname: 'Jane',
    surname: 'Smith',
    title: 'Mrs',
    email_1: 'jane.smith@example.com',
    phone_1: '+44 7700 900001',
    dob: '1978-08-22',
    status: 'active',
  },
];

// Sample products
export const sampleProducts: Product[] = [
  {
    id: 1,
    product_name: 'ISA Account',
    product_type: 'Investment',
    status: 'active',
    start_date: '2020-04-01',
    provider_name: 'Vanguard',
    total_value: 125000,
  },
  {
    id: 2,
    product_name: 'Pension Portfolio',
    product_type: 'Pension',
    status: 'active',
    start_date: '2019-06-15',
    provider_name: 'Standard Life',
    total_value: 350000,
  },
];

// Sample activities
export const sampleActivities: Activity[] = [
  {
    id: 1,
    activity_type: 'Investment',
    date: '2024-12-01',
    description: 'Regular monthly investment',
    amount: 2000,
    user: 'System',
  },
  {
    id: 2,
    activity_type: 'Review',
    date: '2024-11-15',
    description: 'Annual portfolio review completed',
    user: 'John Advisor',
  },
];

// Sample meetings
export const sampleMeetings: Meeting[] = [
  {
    id: 1,
    meeting_type: 'Annual Review',
    meeting_date: '2024-12-15',
    is_booked: true,
    notes: 'Discuss portfolio performance and rebalancing',
    status: 'Scheduled',
  },
  {
    id: 2,
    meeting_type: 'Mid-Year Check-in',
    is_booked: false,
    status: 'Not Scheduled',
  },
];
