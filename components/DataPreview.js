import { useState } from 'react';
import ShinyText from './ShinyText';

export default function DataPreview({ data, columns, totalRows }) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  if (!data || data.length === 0) {
    return (
      <div className="glass-strong p-8 rounded-2xl text-center">
        <p className="text-gray-400">No data to display</p>
      </div>
    );
  }

  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const displayData = data.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const getDataTypeIcon = (type) => {
    switch (type) {
      case 'number':
        return '🔢';
      case 'string':
        return '📝';
      case 'date':
        return '📅';
      default:
        return '❓';
    }
  };

  return (
    <div className="glass-strong rounded-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <h3 className="text-xl font-bold mb-2">
          <ShinyText
            text="Data Preview"
            speed={2.5}
            color="#9ca3af"
            shineColor="#ffffff"
            pauseOnHover={true}
          />
        </h3>
        <p className="text-gray-400">
          Showing {displayData.length} of {totalRows} rows
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                #
              </th>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase"
                >
                  <div className="flex items-center gap-2">
                    <span>{getDataTypeIcon(col.type)}</span>
                    <span>{col.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-t border-white/5 hover:bg-white/5 transition"
              >
                <td className="px-4 py-3 text-sm text-gray-500">
                  {(currentPage - 1) * rowsPerPage + rowIdx + 1}
                </td>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-4 py-3 text-sm">
                    {row[col.name] !== null && row[col.name] !== undefined
                      ? String(row[col.name])
                      : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
