import React from 'react';
import { PlusIcon, ChevronRightIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
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
  // Get current financial year (Aug 1 - Jul 31)
  const getCurrentFinancialYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (0 = Jan, 7 = Aug)

    // If we're in Aug-Dec, we're in the next financial year (e.g., Aug 2024 = FY 2025)
    // If we're in Jan-Jul, we're in the current financial year (e.g., Jan 2024 = FY 2024)
    return currentMonth >= 7 ? currentYear + 1 : currentYear;
  };

  // Generate years to display (current FY + 2 previous FYs)
  const currentFY = getCurrentFinancialYear();
  const yearsToDisplay = [currentFY, currentFY - 1, currentFY - 2];

  // Create complete instances by year (including auto-generated planned meetings)
  const completeInstancesByYear: Record<number, MeetingInstance[]> = {};

  yearsToDisplay.forEach(year => {
    completeInstancesByYear[year] = [];

    // For each assigned meeting, check if there's an instance for this year
    assignedMeetings.forEach(assigned => {
      const existingInstance = meetingInstances.find(
        inst => inst.assignedMeetingId === assigned.id && inst.year === year
      );

      if (existingInstance) {
        // Use the existing instance (whether from active or lapsed assigned meeting)
        completeInstancesByYear[year].push(existingInstance);
      } else if (assigned.status === 'Active') {
        // Only create placeholder instances for active assigned meetings
        // Past years: Complete (already happened)
        // Current year: Planned (needs to be booked)
        const status = year < currentFY ? 'Complete' : 'Planned';

        const placeholderInstance: MeetingInstance = {
          id: `placeholder-${assigned.id}-${year}`,
          assignedMeetingId: assigned.id,
          name: assigned.name,
          meetingType: assigned.meetingType,
          year: year,
          status: status,
          notes: ''
        };
        completeInstancesByYear[year].push(placeholderInstance);
      }
      // Note: Lapsed assigned meetings won't auto-populate, but historical instances will still show
    });

    // Sort instances within each year by meeting type (Review first, then Update)
    completeInstancesByYear[year].sort((a, b) => {
      if (a.meetingType === 'Review' && b.meetingType === 'Update') return -1;
      if (a.meetingType === 'Update' && b.meetingType === 'Review') return 1;
      return 0;
    });
  });

  // Sort years in descending order (most recent first)
  const sortedYears = yearsToDisplay.sort((a, b) => b - a);

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
                  <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...assignedMeetings]
                  .sort((a, b) => {
                    // Sort Active before Lapsed
                    if (a.status === 'Active' && b.status === 'Lapsed') return -1;
                    if (a.status === 'Lapsed' && b.status === 'Active') return 1;
                    return 0;
                  })
                  .map((meeting) => (
                    <tr
                      key={meeting.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        meeting.status === 'Lapsed' ? 'opacity-60' : ''
                      }`}
                      onClick={() => onAssignedMeetingClick(meeting)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {meeting.meetingType}
                          {meeting.notes && meeting.notes.trim() !== '' && (
                            <ChatBubbleLeftIcon className="w-4 h-4 text-blue-600" title="Has notes" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{meeting.expectedMonth}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-base">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                          meeting.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-900'
                        }`}>
                          {meeting.status}
                        </span>
                      </td>
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
              const yearInstances = completeInstancesByYear[year];
              // Financial year runs from Aug 1 to Jul 31
              // e.g., FY 2024 = Aug 2023 - Jul 2024
              const fyStartYear = year - 1;
              const fyLabel = `FY ${year} (Aug ${fyStartYear} - Jul ${year})`;

              return (
                <div key={year} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <h5 className="text-base font-semibold text-gray-900">{fyLabel}</h5>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Meeting Type</th>
                        <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Expected Month</th>
                        <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Date Booked For</th>
                        <th className="px-3 py-2 text-center text-sm font-bold text-gray-900 uppercase">Status</th>
                        <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Date Actually Held</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {yearInstances.map((instance) => {
                        // Find the corresponding assigned meeting to get expected month
                        const assignedMeeting = assignedMeetings.find(am => am.id === instance.assignedMeetingId);
                        const expectedMonth = assignedMeeting?.expectedMonth || '-';

                        return (
                          <tr key={instance.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onMeetingInstanceClick(instance)}>
                            <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                {instance.meetingType}
                                {instance.notes && instance.notes.trim() !== '' && (
                                  <ChatBubbleLeftIcon className="w-4 h-4 text-blue-600" title="Has notes" />
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{expectedMonth}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                              {instance.dateBookedFor || <span className="text-gray-900 italic">Not booked</span>}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">
                              <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                instance.status === 'Complete' ? 'bg-green-100 text-green-800' :
                                instance.status === 'Booked' ? 'bg-blue-100 text-blue-800' :
                                instance.status === 'Planned' ? 'bg-gray-200 text-gray-900' :
                                instance.status === 'Declined' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800' // Moved
                              }`}>
                                {instance.status}
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
                        );
                      })}
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
