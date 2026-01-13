import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

// ============================================================================
// Types
// ============================================================================

type MeetingStatus = 'complete' | 'booked' | 'rescheduled' | 'not_booked';
type MeetingType = 'annual_review' | 'interim' | 'ad_hoc' | 'initial';

interface Meeting {
  id: number;
  clientGroupId: number;
  year: string; // e.g., "2024/25"
  type: MeetingType;
  expectedMonth: number; // 0-11 (0 = August in our fiscal year) - the original expected month
  actualMonth?: number; // For rescheduled meetings - where it moved to
  status: MeetingStatus;
  notes: string;
}

interface ClientGroup {
  id: number;
  name: string;
  advisor: string;
  advisorInitials: string;
  vulnerableCount: number;
  ongoingStartDate: string;
  ongoingEndDate: string;
  isTransactional: boolean;
}

// ============================================================================
// Constants
// ============================================================================

// Fiscal year months: August to July
const FISCAL_MONTHS = [
  'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'
];

const STATUS_COLORS: Record<MeetingStatus, { bg: string; text: string; border: string }> = {
  complete: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
  booked: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-400' },
  rescheduled: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-400' },
  not_booked: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-400' },
};

const STATUS_LABELS: Record<MeetingStatus, string> = {
  complete: 'Complete',
  booked: 'Booked',
  rescheduled: 'Rescheduled',
  not_booked: 'Not Booked',
};

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  annual_review: 'Annual Review',
  interim: 'Interim Review',
  ad_hoc: 'Ad-hoc Meeting',
  initial: 'Initial Meeting',
};

const MEETING_TYPES: MeetingType[] = ['annual_review', 'interim', 'ad_hoc', 'initial'];

// Helper to get fiscal year start date (August 1st)
const getFiscalYearStart = (year: string): Date => {
  // year format: "2024/25" means Aug 2024 - Jul 2025
  const startYear = parseInt(year.split('/')[0]);
  return new Date(startYear, 7, 1); // August 1st (month 7 in JS)
};

// Helper to check if client is active in a given fiscal year
const isClientActiveInYear = (clientGroup: ClientGroup, year: string): boolean => {
  const fiscalYearStart = getFiscalYearStart(year);
  const clientEndDate = new Date(clientGroup.ongoingEndDate);
  // Client appears if their end date is on or after the fiscal year start
  return clientEndDate >= fiscalYearStart;
};

// Advisors - Debbie Kingston and Jan Clements
const ADVISORS = [
  { name: 'Debbie Kingston', initials: 'DK' },
  { name: 'Jan Clements', initials: 'JC' },
];

// ============================================================================
// Mock Data
// ============================================================================

const mockClientGroups: ClientGroup[] = [
  // Active clients (end date in future)
  { id: 1, name: 'Smith Family', advisor: 'Debbie Kingston', advisorInitials: 'DK', vulnerableCount: 2, ongoingStartDate: '2020-08-01', ongoingEndDate: '2025-07-31', isTransactional: false },
  { id: 2, name: 'Johnson Trust', advisor: 'Jan Clements', advisorInitials: 'JC', vulnerableCount: 0, ongoingStartDate: '2021-08-01', ongoingEndDate: '2026-07-31', isTransactional: false },
  { id: 4, name: 'Brown Holdings', advisor: 'Jan Clements', advisorInitials: 'JC', vulnerableCount: 3, ongoingStartDate: '2022-08-01', ongoingEndDate: '2027-07-31', isTransactional: false },
  { id: 5, name: 'Davis Investments', advisor: 'Debbie Kingston', advisorInitials: 'DK', vulnerableCount: 0, ongoingStartDate: '2023-08-01', ongoingEndDate: '2026-07-31', isTransactional: false },
  { id: 6, name: 'Wilson Group', advisor: 'Jan Clements', advisorInitials: 'JC', vulnerableCount: 1, ongoingStartDate: '2021-08-01', ongoingEndDate: '2025-07-31', isTransactional: false },
  { id: 7, name: 'Taylor Estate', advisor: 'Debbie Kingston', advisorInitials: 'DK', vulnerableCount: 0, ongoingStartDate: '2020-08-01', ongoingEndDate: '2026-07-31', isTransactional: false },
  { id: 8, name: 'Anderson Portfolio', advisor: 'Jan Clements', advisorInitials: 'JC', vulnerableCount: 2, ongoingStartDate: '2022-08-01', ongoingEndDate: '2025-07-31', isTransactional: false },
  { id: 10, name: 'Jackson Family', advisor: 'Jan Clements', advisorInitials: 'JC', vulnerableCount: 1, ongoingStartDate: '2023-08-01', ongoingEndDate: '2027-07-31', isTransactional: false },
  // Clients that ended in 2023/24 (won't appear in 2024/25 or later)
  { id: 3, name: 'Williams Partnership', advisor: 'Debbie Kingston', advisorInitials: 'DK', vulnerableCount: 1, ongoingStartDate: '2019-08-01', ongoingEndDate: '2024-07-31', isTransactional: false },
  { id: 9, name: 'Thomas & Co', advisor: 'Debbie Kingston', advisorInitials: 'DK', vulnerableCount: 0, ongoingStartDate: '2019-08-01', ongoingEndDate: '2024-07-31', isTransactional: false },
  // Transactional clients (should not appear in schedule)
  { id: 11, name: 'Quick Trade Ltd', advisor: 'Debbie Kingston', advisorInitials: 'DK', vulnerableCount: 0, ongoingStartDate: '2024-01-01', ongoingEndDate: '2024-12-31', isTransactional: true },
  { id: 12, name: 'One-off Consulting', advisor: 'Jan Clements', advisorInitials: 'JC', vulnerableCount: 0, ongoingStartDate: '2024-03-01', ongoingEndDate: '2024-06-30', isTransactional: true },
];

// Deterministic mock meetings data
const mockMeetings: Meeting[] = [
  // 2024/25 meetings (clients 3 and 9 ended in 2023/24, so no meetings for them here)
  { id: 1, clientGroupId: 1, year: '2024/25', type: 'annual_review', expectedMonth: 2, status: 'complete', notes: '' },
  { id: 2, clientGroupId: 1, year: '2024/25', type: 'interim', expectedMonth: 8, status: 'booked', notes: '' },
  { id: 3, clientGroupId: 2, year: '2024/25', type: 'annual_review', expectedMonth: 0, status: 'complete', notes: '' },
  { id: 4, clientGroupId: 2, year: '2024/25', type: 'ad_hoc', expectedMonth: 6, status: 'booked', notes: '' },
  { id: 5, clientGroupId: 4, year: '2024/25', type: 'annual_review', expectedMonth: 1, status: 'complete', notes: '' },
  { id: 6, clientGroupId: 4, year: '2024/25', type: 'interim', expectedMonth: 7, status: 'not_booked', notes: '' },
  { id: 7, clientGroupId: 5, year: '2024/25', type: 'annual_review', expectedMonth: 5, status: 'booked', notes: '' },
  { id: 8, clientGroupId: 6, year: '2024/25', type: 'annual_review', expectedMonth: 3, status: 'complete', notes: '' },
  { id: 9, clientGroupId: 6, year: '2024/25', type: 'interim', expectedMonth: 9, actualMonth: 10, status: 'rescheduled', notes: 'Moved from May to June' },
  { id: 10, clientGroupId: 7, year: '2024/25', type: 'annual_review', expectedMonth: 3, actualMonth: 4, status: 'rescheduled', notes: 'Client requested delay' },
  { id: 11, clientGroupId: 8, year: '2024/25', type: 'annual_review', expectedMonth: 0, status: 'complete', notes: '' },
  { id: 12, clientGroupId: 8, year: '2024/25', type: 'ad_hoc', expectedMonth: 5, status: 'not_booked', notes: '' },
  { id: 13, clientGroupId: 10, year: '2024/25', type: 'annual_review', expectedMonth: 1, actualMonth: 2, status: 'rescheduled', notes: 'Rescheduled due to illness' },
  { id: 14, clientGroupId: 10, year: '2024/25', type: 'initial', expectedMonth: 11, status: 'not_booked', notes: '' },

  // 2023/24 meetings (all complete - includes clients 3 and 9 who ended this year)
  { id: 15, clientGroupId: 1, year: '2023/24', type: 'annual_review', expectedMonth: 2, status: 'complete', notes: '' },
  { id: 16, clientGroupId: 1, year: '2023/24', type: 'interim', expectedMonth: 9, status: 'complete', notes: '' },
  { id: 17, clientGroupId: 2, year: '2023/24', type: 'annual_review', expectedMonth: 0, status: 'complete', notes: '' },
  { id: 18, clientGroupId: 3, year: '2023/24', type: 'annual_review', expectedMonth: 3, status: 'complete', notes: '' },
  { id: 19, clientGroupId: 4, year: '2023/24', type: 'annual_review', expectedMonth: 1, status: 'complete', notes: '' },
  { id: 20, clientGroupId: 4, year: '2023/24', type: 'interim', expectedMonth: 7, status: 'complete', notes: '' },
  { id: 21, clientGroupId: 5, year: '2023/24', type: 'annual_review', expectedMonth: 5, status: 'complete', notes: '' },
  { id: 22, clientGroupId: 6, year: '2023/24', type: 'annual_review', expectedMonth: 4, status: 'complete', notes: '' },
  { id: 23, clientGroupId: 7, year: '2023/24', type: 'annual_review', expectedMonth: 6, status: 'complete', notes: '' },
  { id: 24, clientGroupId: 8, year: '2023/24', type: 'annual_review', expectedMonth: 0, status: 'complete', notes: '' },
  { id: 25, clientGroupId: 9, year: '2023/24', type: 'annual_review', expectedMonth: 10, status: 'complete', notes: '' },
  { id: 26, clientGroupId: 10, year: '2023/24', type: 'annual_review', expectedMonth: 2, status: 'complete', notes: '' },
];

// ============================================================================
// Components
// ============================================================================

interface MeetingCellProps {
  meeting: Meeting | undefined;
  clientGroup: ClientGroup | undefined;
  hasRescheduledFrom: boolean;
  onClick: (meeting: Meeting) => void;
}

const MeetingCell: React.FC<MeetingCellProps> = ({ meeting, clientGroup, hasRescheduledFrom, onClick }) => {
  if (!meeting && !hasRescheduledFrom) {
    return <td className="border border-gray-200 p-1 text-center bg-gray-50 h-8"></td>;
  }

  if (!meeting && hasRescheduledFrom) {
    // Empty cell with orange outline indicating meeting was rescheduled from here
    return (
      <td className="border-2 border-orange-400 border-dashed p-1 text-center bg-gray-50 h-8">
      </td>
    );
  }

  if (!meeting || !clientGroup) return <td className="border border-gray-200 p-1 h-8"></td>;

  const colors = STATUS_COLORS[meeting.status];
  const label = meeting.type === 'annual_review'
    ? `AR-${clientGroup.advisorInitials}`
    : clientGroup.advisorInitials;

  return (
    <td
      className={`border border-gray-200 p-1 text-center h-8 cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={() => onClick(meeting)}
    >
      <span
        className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}
      >
        {label}
      </span>
    </td>
  );
};

interface MeetingModalProps {
  meeting: Meeting | null;
  clientGroup: ClientGroup | undefined;
  onClose: () => void;
  onSave: (meeting: Meeting) => void;
}

const MeetingModal: React.FC<MeetingModalProps> = ({ meeting, clientGroup, onClose, onSave }) => {
  const [editedMeeting, setEditedMeeting] = useState<Meeting | null>(meeting);

  if (!meeting || !editedMeeting || !clientGroup) return null;

  const handleStatusChange = (status: MeetingStatus) => {
    setEditedMeeting({ ...editedMeeting, status });
  };

  const handleSave = () => {
    if (editedMeeting) {
      onSave(editedMeeting);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Manage Meeting</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Group</label>
            <p className="text-sm text-gray-900">{clientGroup.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Type</label>
            <select
              value={editedMeeting.type}
              onChange={(e) => setEditedMeeting({ ...editedMeeting, type: e.target.value as MeetingType })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {Object.entries(MEETING_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Month</label>
            <select
              value={editedMeeting.expectedMonth}
              onChange={(e) => setEditedMeeting({ ...editedMeeting, expectedMonth: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {FISCAL_MONTHS.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={editedMeeting.status}
              onChange={(e) => handleStatusChange(e.target.value as MeetingStatus)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={editedMeeting.notes}
              onChange={(e) => setEditedMeeting({ ...editedMeeting, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Add notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Totals Table Component
// ============================================================================

interface TotalsTableProps {
  meetings: Meeting[];
}

const TotalsTable: React.FC<TotalsTableProps> = ({ meetings }) => {
  const [expandedAdvisors, setExpandedAdvisors] = useState<Set<string>>(new Set());

  const toggleAdvisor = (advisorName: string) => {
    setExpandedAdvisors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(advisorName)) {
        newSet.delete(advisorName);
      } else {
        newSet.add(advisorName);
      }
      return newSet;
    });
  };

  // Calculate totals by advisor and month
  // For rescheduled meetings, count in the actualMonth (new month), otherwise expectedMonth
  const advisorTotals = useMemo(() => {
    const totals: Record<string, Record<number, { total: number; byType: Record<MeetingType, number> }>> = {};

    ADVISORS.forEach(advisor => {
      totals[advisor.name] = {};
      for (let i = 0; i < 12; i++) {
        totals[advisor.name][i] = {
          total: 0,
          byType: { annual_review: 0, interim: 0, ad_hoc: 0, initial: 0 }
        };
      }
    });

    meetings.forEach(meeting => {
      // Look up client group to get advisor
      const clientGroup = mockClientGroups.find(cg => cg.id === meeting.clientGroupId);
      if (clientGroup && totals[clientGroup.advisor]) {
        // Use actualMonth for rescheduled meetings, otherwise expectedMonth
        const countMonth = meeting.actualMonth !== undefined ? meeting.actualMonth : meeting.expectedMonth;
        totals[clientGroup.advisor][countMonth].total++;
        totals[clientGroup.advisor][countMonth].byType[meeting.type]++;
      }
    });

    return totals;
  }, [meetings]);

  // Calculate row totals for each advisor
  const advisorRowTotals = useMemo(() => {
    const rowTotals: Record<string, number> = {};
    ADVISORS.forEach(advisor => {
      rowTotals[advisor.name] = Object.values(advisorTotals[advisor.name]).reduce(
        (sum, month) => sum + month.total, 0
      );
    });
    return rowTotals;
  }, [advisorTotals]);

  // Calculate column totals
  const columnTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (let i = 0; i < 12; i++) {
      totals[i] = ADVISORS.reduce(
        (sum, advisor) => sum + advisorTotals[advisor.name][i].total, 0
      );
    }
    return totals;
  }, [advisorTotals]);

  const grandTotal = Object.values(columnTotals).reduce((sum, val) => sum + val, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Meetings by Advisor</h3>
        <p className="text-xs text-gray-500">Click on an advisor row to see breakdown by meeting type</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 min-w-[140px]">
                Advisor
              </th>
              {FISCAL_MONTHS.map((month, index) => (
                <th
                  key={month}
                  className={`border-b border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 min-w-[45px] ${index === 5 ? 'border-l-2 border-l-gray-400' : ''}`}
                >
                  {month}
                </th>
              ))}
              <th className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 bg-gray-100 min-w-[50px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {ADVISORS.map((advisor) => {
              const isExpanded = expandedAdvisors.has(advisor.name);
              return (
                <React.Fragment key={advisor.name}>
                  {/* Main advisor row */}
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleAdvisor(advisor.name)}
                  >
                    <td className="border-b border-r border-gray-200 px-3 py-2 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                        )}
                        <span>{advisor.name}</span>
                        <span className="text-gray-400 text-xs">({advisor.initials})</span>
                      </div>
                    </td>
                    {FISCAL_MONTHS.map((_, monthIndex) => (
                      <td
                        key={monthIndex}
                        className={`border-b border-r border-gray-200 px-2 py-2 text-center ${monthIndex === 5 ? 'border-l-2 border-l-gray-400' : ''}`}
                      >
                        {advisorTotals[advisor.name][monthIndex].total || '-'}
                      </td>
                    ))}
                    <td className="border-b border-gray-200 px-3 py-2 text-center font-semibold bg-gray-50">
                      {advisorRowTotals[advisor.name]}
                    </td>
                  </tr>

                  {/* Expanded meeting type breakdown */}
                  {isExpanded && MEETING_TYPES.map((meetingType) => (
                    <tr key={`${advisor.name}-${meetingType}`} className="bg-gray-50">
                      <td className="border-b border-r border-gray-200 px-3 py-1.5 text-gray-600 text-xs pl-10">
                        {MEETING_TYPE_LABELS[meetingType]}
                      </td>
                      {FISCAL_MONTHS.map((_, monthIndex) => (
                        <td
                          key={monthIndex}
                          className={`border-b border-r border-gray-200 px-2 py-1.5 text-center text-xs text-gray-500 ${monthIndex === 5 ? 'border-l-2 border-l-gray-400' : ''}`}
                        >
                          {advisorTotals[advisor.name][monthIndex].byType[meetingType] || '-'}
                        </td>
                      ))}
                      <td className="border-b border-gray-200 px-3 py-1.5 text-center text-xs text-gray-500 bg-gray-100">
                        {Object.values(advisorTotals[advisor.name]).reduce(
                          (sum, month) => sum + month.byType[meetingType], 0
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}

            {/* Totals row */}
            <tr className="bg-gray-100 font-semibold">
              <td className="border-r border-gray-200 px-3 py-2 text-gray-900">
                Total
              </td>
              {FISCAL_MONTHS.map((_, monthIndex) => (
                <td
                  key={monthIndex}
                  className={`border-r border-gray-200 px-2 py-2 text-center ${monthIndex === 5 ? 'border-l-2 border-l-gray-400' : ''}`}
                >
                  {columnTotals[monthIndex] || '-'}
                </td>
              ))}
              <td className="px-3 py-2 text-center bg-gray-200">
                {grandTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const MeetingsPagePrototype: React.FC = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState('2024/25');
  const [meetings, setMeetings] = useState<Meeting[]>([...mockMeetings]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Available years
  const availableYears = ['2023/24', '2024/25', '2025/26'];

  // Filter client groups (exclude transactional and filter by year)
  const filteredClientGroups = useMemo(() =>
    mockClientGroups.filter(cg => !cg.isTransactional && isClientActiveInYear(cg, selectedYear)),
    [selectedYear]
  );

  // Get meetings for current year
  const yearMeetings = useMemo(() =>
    meetings.filter(m => m.year === selectedYear),
    [meetings, selectedYear]
  );

  // Calculate summary totals
  const totals = useMemo(() => {
    const total = yearMeetings.length;
    const complete = yearMeetings.filter(m => m.status === 'complete').length;
    const booked = yearMeetings.filter(m => m.status === 'booked').length;
    const rescheduled = yearMeetings.filter(m => m.status === 'rescheduled').length;
    const notBooked = yearMeetings.filter(m => m.status === 'not_booked').length;
    return { total, complete, booked, rescheduled, notBooked };
  }, [yearMeetings]);

  const handleYearChange = (direction: 'prev' | 'next') => {
    const currentIndex = availableYears.indexOf(selectedYear);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedYear(availableYears[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < availableYears.length - 1) {
      setSelectedYear(availableYears[currentIndex + 1]);
    }
  };

  const handleVulnerableClick = (clientGroupId: number) => {
    // Navigate to client group vulnerability tab
    navigate(`/client-groups/${clientGroupId}?tab=vulnerabilities`);
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
  };

  const handleSaveMeeting = (updatedMeeting: Meeting) => {
    setMeetings(prev => prev.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));
  };

  const getClientMeetings = (clientGroupId: number) => {
    return yearMeetings.filter(m => m.clientGroupId === clientGroupId);
  };

  const getMeetingForMonth = (clientGroupId: number, monthIndex: number) => {
    return yearMeetings.find(m => {
      if (m.clientGroupId !== clientGroupId) return false;
      // For rescheduled meetings, use actualMonth; otherwise use expectedMonth
      const displayMonth = m.actualMonth !== undefined ? m.actualMonth : m.expectedMonth;
      return displayMonth === monthIndex;
    });
  };

  const hasRescheduledFrom = (clientGroupId: number, monthIndex: number) => {
    // Check if there's a rescheduled meeting that was expected in this month but moved elsewhere
    return yearMeetings.some(m =>
      m.clientGroupId === clientGroupId &&
      m.status === 'rescheduled' &&
      m.expectedMonth === monthIndex &&
      m.actualMonth !== undefined &&
      m.actualMonth !== monthIndex
    );
  };

  const selectedClientGroup = selectedMeeting
    ? mockClientGroups.find(cg => cg.id === selectedMeeting.clientGroupId)
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Schedule</h1>
          <p className="text-sm text-gray-600">Manage client meetings throughout the year</p>
        </div>

        {/* Year Navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleYearChange('prev')}
              disabled={availableYears.indexOf(selectedYear) === 0}
              className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-lg font-semibold text-gray-900 min-w-[80px] text-center">
              {selectedYear}
            </span>
            <button
              onClick={() => handleYearChange('next')}
              disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1}
              className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Colour Key */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-600 font-medium">Key:</span>
            {Object.entries(STATUS_COLORS).map(([status, colors]) => (
              <div key={status} className="flex items-center gap-1">
                <span className={`inline-block w-3 h-3 rounded ${colors.bg} ${colors.border} border`}></span>
                <span className="text-gray-600">{STATUS_LABELS[status as MeetingStatus]}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 border-2 border-orange-400 border-dashed bg-gray-50"></span>
              <span className="text-gray-600">Rescheduled From</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">Total Meetings</p>
            <p className="text-xl font-bold text-gray-900">{totals.total}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3">
            <p className="text-xs text-yellow-700 uppercase">Complete</p>
            <p className="text-xl font-bold text-yellow-800">{totals.complete}</p>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
            <p className="text-xs text-blue-700 uppercase">Booked</p>
            <p className="text-xl font-bold text-blue-800">{totals.booked}</p>
          </div>
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-3">
            <p className="text-xs text-orange-700 uppercase">Rescheduled</p>
            <p className="text-xl font-bold text-orange-800">{totals.rescheduled}</p>
          </div>
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-3">
            <p className="text-xs text-purple-700 uppercase">Not Booked</p>
            <p className="text-xl font-bold text-purple-800">{totals.notBooked}</p>
          </div>
        </div>

        {/* Totals by Advisor Table */}
        <TotalsTable meetings={yearMeetings} />

        {/* Meeting Schedule Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Client Meeting Schedule</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-r border-gray-200 px-2 py-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 min-w-[140px]">
                    Client Group
                  </th>
                  <th className="border-b border-r border-gray-200 px-2 py-2 text-left font-semibold text-gray-700 min-w-[50px]">
                    Adv
                  </th>
                  <th className="border-b border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 min-w-[35px]" title="Vulnerable People">
                    Vul
                  </th>
                  <th className="border-b border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 min-w-[65px]" title="Date client relationship started">
                    Started
                  </th>
                  <th className="border-b border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 min-w-[65px]" title="Date client relationship ended">
                    Ended
                  </th>
                  <th className="border-b border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 min-w-[25px]" title="Number of Meetings">
                    #
                  </th>
                  {FISCAL_MONTHS.map((month, index) => (
                    <th
                      key={month}
                      className={`border-b border-r border-gray-200 px-1 py-2 text-center font-semibold text-gray-700 min-w-[50px] ${index === 5 ? 'border-l-2 border-l-gray-400' : ''}`}
                    >
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClientGroups.map((clientGroup) => {
                  const clientMeetings = getClientMeetings(clientGroup.id);
                  return (
                    <tr key={clientGroup.id} className="hover:bg-gray-50">
                      <td className="border-b border-r border-gray-200 px-2 py-1 font-medium text-gray-900 sticky left-0 bg-white text-xs">
                        {clientGroup.name}
                      </td>
                      <td className="border-b border-r border-gray-200 px-2 py-1 text-gray-600 text-xs">
                        {clientGroup.advisorInitials}
                      </td>
                      <td
                        className={`border-b border-r border-gray-200 px-2 py-1 text-center text-xs ${clientGroup.vulnerableCount > 0 ? 'cursor-pointer hover:bg-red-50 text-red-600 font-semibold' : 'text-gray-400'}`}
                        onClick={() => clientGroup.vulnerableCount > 0 && handleVulnerableClick(clientGroup.id)}
                        title={clientGroup.vulnerableCount > 0 ? 'Click to view vulnerabilities' : ''}
                      >
                        {clientGroup.vulnerableCount || '-'}
                      </td>
                      <td className="border-b border-r border-gray-200 px-2 py-1 text-center text-gray-600 text-xs">
                        {new Date(clientGroup.ongoingStartDate).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                      </td>
                      <td className="border-b border-r border-gray-200 px-2 py-1 text-center text-gray-600 text-xs">
                        {new Date(clientGroup.ongoingEndDate).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                      </td>
                      <td className="border-b border-r border-gray-200 px-2 py-1 text-center text-gray-600 text-xs">
                        {clientMeetings.length}
                      </td>
                      {FISCAL_MONTHS.map((_, monthIndex) => (
                        <MeetingCell
                          key={monthIndex}
                          meeting={getMeetingForMonth(clientGroup.id, monthIndex)}
                          clientGroup={clientGroup}
                          hasRescheduledFrom={hasRescheduledFrom(clientGroup.id, monthIndex)}
                          onClick={handleMeetingClick}
                        />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-500">
          * AR = Annual Review. Click on a meeting to view/edit details. Transactional clients are excluded.
        </p>
      </div>

      {/* Meeting Modal */}
      {selectedMeeting && (
        <MeetingModal
          meeting={selectedMeeting}
          clientGroup={selectedClientGroup}
          onClose={() => setSelectedMeeting(null)}
          onSave={handleSaveMeeting}
        />
      )}
    </div>
  );
};

export default MeetingsPagePrototype;
