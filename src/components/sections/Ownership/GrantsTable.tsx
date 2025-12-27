import { useState } from 'react';
import type { Grant } from './data';

interface GrantsTableProps {
  grants: Grant[];
}

export const GrantsTable = ({ grants }: GrantsTableProps) => {
  const [showAll, setShowAll] = useState(false);
  const visibleCount = 3;
  const displayGrants = showAll ? grants : grants.slice(0, visibleCount);
  const hasMore = grants.length > visibleCount;

  return (
    <div className="w-full mb-6">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-sm table-fixed">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[70%]" />
          </colgroup>
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3 text-left">Month</th>
              <th className="border border-gray-300 p-3 text-left">Ownership Grants</th>
            </tr>
          </thead>
          <tbody>
            {displayGrants.map((grant, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-3 align-top">{grant.month}</td>
                <td className="border border-gray-300 p-3 align-top break-words whitespace-normal">
                  {grant.ownership_grants}
                </td>
              </tr>
            ))}
          </tbody>
          {hasMore && (
            <tfoot>
              <tr>
                <td colSpan={2} className="p-3 text-center border border-gray-300 w-full">
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="px-4 py-2 bg-gray-100 text-gray-900 border border-gray-300 rounded hover:bg-gray-200 transition-colors text-sm"
                    >
                      {showAll ? 'Show Less' : 'Show More'}
                    </button>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

