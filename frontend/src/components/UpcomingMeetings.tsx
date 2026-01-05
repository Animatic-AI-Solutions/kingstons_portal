import React from 'react';
import { 
  CalendarIcon, 
  ClockIcon,
  UserGroupIcon,
  VideoCameraIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

/**
 * UpcomingMeetings Component
 * 
 * Displays upcoming client meetings and appointments.
 * Shows mock data for demonstration purposes.
 */

interface Meeting {
  id: string;
  client: string;
  type: 'review' | 'planning' | 'onboarding' | 'follow-up';
  date: string;
  time: string;
  location: 'office' | 'video' | 'phone';
  advisor: string;
}

const UpcomingMeetings: React.FC = () => {
  // Mock meeting data
  const upcomingMeetings: Meeting[] = [
    {
      id: '1',
      client: 'Johnson Family',
      type: 'review',
      date: 'Today',
      time: '2:30 PM',
      location: 'office',
      advisor: 'Sarah Mitchell'
    },
    {
      id: '2',
      client: 'David Thompson',
      type: 'planning',
      date: 'Tomorrow',
      time: '10:00 AM',
      location: 'video',
      advisor: 'Michael Brown'
    },
    {
      id: '3',
      client: 'Wilson Group',
      type: 'onboarding',
      date: 'Thu, Nov 21',
      time: '11:30 AM',
      location: 'office',
      advisor: 'Sarah Mitchell'
    },
    {
      id: '4',
      client: 'Anderson Estate',
      type: 'follow-up',
      date: 'Fri, Nov 22',
      time: '3:00 PM',
      location: 'phone',
      advisor: 'Michael Brown'
    }
  ];

  const getMeetingTypeColor = (type: string) => {
    switch (type) {
      case 'review': return 'text-blue-600 bg-blue-50';
      case 'planning': return 'text-green-600 bg-green-50';
      case 'onboarding': return 'text-purple-600 bg-purple-50';
      case 'follow-up': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getMeetingTypeLabel = (type: string) => {
    switch (type) {
      case 'review': return 'Portfolio Review';
      case 'planning': return 'Financial Planning';
      case 'onboarding': return 'New Client';
      case 'follow-up': return 'Follow-up';
      default: return type;
    }
  };

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'video': return <VideoCameraIcon className="h-3 w-3" />;
      case 'office': return <MapPinIcon className="h-3 w-3" />;
      case 'phone': return <ClockIcon className="h-3 w-3" />;
      default: return <CalendarIcon className="h-3 w-3" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Upcoming Meetings</h3>
        <UserGroupIcon className="h-4 w-4 text-gray-400" />
      </div>

      {upcomingMeetings.length > 0 ? (
        <div className="space-y-2">
          {upcomingMeetings.map((meeting) => (
            <div key={meeting.id} className="flex items-start justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {meeting.client}
                  </p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getMeetingTypeColor(meeting.type)}`}>
                    {getMeetingTypeLabel(meeting.type)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {meeting.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {meeting.time}
                  </span>
                  <span className="flex items-center gap-1">
                    {getLocationIcon(meeting.location)}
                    {meeting.location === 'office' ? 'Office' : meeting.location === 'video' ? 'Video Call' : 'Phone Call'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  with {meeting.advisor}
                </p>
              </div>
            </div>
          ))}
          
          <div className="mt-3 pt-2 border-t border-gray-200">
            <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              View all meetings →
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <UserGroupIcon className="h-6 w-6 text-gray-300 mx-auto mb-1" />
          <p className="text-gray-500 text-xs mb-0.5">No upcoming meetings</p>
          <p className="text-gray-400 text-xs">
            Schedule your next client meeting
          </p>
        </div>
      )}
    </div>
  );
};

export default UpcomingMeetings; 