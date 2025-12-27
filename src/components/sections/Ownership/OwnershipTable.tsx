import { useState, useMemo } from 'react';
import type { OwnershipData } from './data';

interface OwnershipTableProps {
  ownershipData: OwnershipData[];
}

export const OwnershipTable = ({ ownershipData }: OwnershipTableProps) => {
  const [filter, setFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof OwnershipData>('Username');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedData = useMemo(() => {
    let filtered = ownershipData;
    
    if (filter.trim()) {
      filtered = ownershipData.filter(item =>
        item.Username.toLowerCase().includes(filter.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      let valA: string | number = a[sortColumn];
      let valB: string | number = b[sortColumn];

      if (sortColumn === 'Username') {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      } else {
        valA = typeof valA === 'number' ? valA : parseFloat(String(valA));
        valB = typeof valB === 'number' ? valB : parseFloat(String(valB));
        
        if (isNaN(valA) && isNaN(valB)) return 0;
        if (isNaN(valA)) return sortDirection === 'asc' ? 1 : -1;
        if (isNaN(valB)) return sortDirection === 'asc' ? -1 : 1;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [ownershipData, filter, sortColumn, sortDirection]);

  const handleSort = (column: keyof OwnershipData) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const headers: { key: keyof OwnershipData; label: string }[] = [
    { key: 'Username', label: 'Username' },
    { key: 'Percentage of Granted', label: 'Percentage of Granted' },
    { key: 'Percentage of Total', label: 'Percentage of Total' },
  ];

  return (
    <div className="w-full">
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by Username..."
        className="w-full mb-4 p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-900"
      />

      {filteredAndSortedData.length === 0 ? (
        <p className="text-gray-600">
          {filter.trim() ? 'No usernames match your filter.' : 'No ownership data available to display.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm table-fixed">
            <thead>
              <tr className="bg-gray-100">
                {headers.map(({ key, label }) => (
                  <th
                    key={key}
                    className="border border-gray-300 p-3 text-left cursor-pointer hover:bg-gray-200 select-none"
                    onClick={() => handleSort(key)}
                  >
                    <div className="flex items-center gap-2">
                      {label}
                      {sortColumn === key && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-3 break-words whitespace-normal">
                    {item.Username}
                  </td>
                  <td className="border border-gray-300 p-3 break-words whitespace-normal">
                    {item['Percentage of Granted'].toFixed(4)}%
                  </td>
                  <td className="border border-gray-300 p-3 break-words whitespace-normal">
                    {item['Percentage of Total'].toFixed(4)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

