import type { Transfer } from './data';

interface TransfersTableProps {
  transfers: Transfer[];
}

export const TransfersTable = ({ transfers }: TransfersTableProps) => {
  return (
    <div className="w-full overflow-x-auto mb-6">
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-3 text-left w-[30%]">From</th>
            <th className="border border-gray-300 p-3 text-left w-[30%]">To</th>
            <th className="border border-gray-300 p-3 text-left w-[20%]">Amount</th>
            <th className="border border-gray-300 p-3 text-left w-[20%]">Date</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="border border-gray-300 p-3 break-words whitespace-normal">
                {transfer.from}
              </td>
              <td className="border border-gray-300 p-3 break-words whitespace-normal">
                {transfer.to}
              </td>
              <td className="border border-gray-300 p-3 break-words whitespace-normal">
                {transfer.amount}
              </td>
              <td className="border border-gray-300 p-3 break-words whitespace-normal">
                {transfer.date}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

