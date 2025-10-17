import React from 'react';
import { PlusIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { AssignedMeeting, MeetingInstance } from '../types';

interface MeetingsSectionProps {
  assignedMeetings: AssignedMeeting[];
  meetingInstances: MeetingInstance[];
  onAssignedMeetingClick: (meeting: AssignedMeeting) => void;
  onMeetingInstanceClick: (instance: MeetingInstance) => void;
}

const MeetingsSection: React.FC<MeetingsSectionProps> = ({
  assignedMeetings,
  meetingInstances,
  onAssignedMeetingClick,
  onMeetingInstanceClick
}) => {
  // Group meeting instances by year
  const instancesByYear = meetingInstances.reduce((acc, instance) => {
    if (!acc[instance.year]) {
      acc[instance.year] = [];
    }
    acc[instance.year].push(instance);
    return acc;
  }, {} as Record<number, MeetingInstance[]>);

  // Sort years in descending order (most recent first)
  const sortedYears = Object.keys(instancesByYear).map(Number).sort((a, b) => b - a);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Meeting Suite</h3>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-base font-medium rounded-md hover:bg-primary-700 transition-colors">
            <PlusIcon className="w-4 h-4" />
            Create Meeting
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Assigned Meetings */}
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-3">Assigned Meetings</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Meeting Type</th>
                  <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Expected Month</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignedMeetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onAssignedMeetingClick(meeting)}>
                    <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">{meeting.meetingType}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{meeting.expectedMonth}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                      <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Meeting Instances by Year */}
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-3">Meeting History</h4>
          <div className="space-y-4">
            {sortedYears.map((year) => {
              const yearInstances = instancesByYear[year];

              return (
                <div key={year} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <h5 className="text-base font-semibold text-gray-900">{year}</h5>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Meeting Type</th>
                        <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Date Booked For</th>
                        <th className="px-3 py-2 text-center text-sm font-bold text-gray-900 uppercase">Status</th>
                        <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Date Actually Held</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {yearInstances.map((instance) => (
                        <tr key={instance.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onMeetingInstanceClick(instance)}>
                          <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">{instance.meetingType}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                            {instance.dateBookedFor || <span className="text-gray-900 italic">Not booked</span>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-center">
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                              instance.hasBeenHeld ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {instance.hasBeenHeld ? 'Held' : 'Booked'}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                            {instance.dateActuallyHeld ? (
                              <span className="font-medium">{instance.dateActuallyHeld}</span>
                            ) : (
                              <span className="text-gray-900 italic">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                            <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingsSection;
