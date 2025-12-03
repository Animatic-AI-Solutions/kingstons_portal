/**
 * Types for ClientGroupSuite
 *
 * This file contains TypeScript interfaces for the Client Group Suite.
 * Types will be expanded as features are added to each tab.
 */

// Client Group basic information
export interface ClientGroup {
  id: number;
  name: string;
  type: string;
  status: string;
  created_at: string;
  advisor_id?: number;
  advisor_name?: string;
}

// Product Owner (Person in the client group)
export interface ProductOwner {
  id: number;
  firstname: string;
  surname: string;
  known_as?: string;
  title?: string;
  email_1?: string;
  phone_1?: string;
  dob?: string;
  status: string;
}

// Financial Product
export interface Product {
  id: number;
  product_name: string;
  product_type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  provider_name?: string;
  total_value?: number;
}

// Activity (transaction, event, etc.)
export interface Activity {
  id: number;
  activity_type: string;
  date: string;
  description: string;
  amount?: number;
  user?: string;
}

// Meeting
export interface Meeting {
  id: number;
  meeting_type: string;
  meeting_date?: string;
  is_booked: boolean;
  notes?: string;
  status: string;
}

// Tab props interface
export interface TabProps {
  clientGroupId: string;
}
