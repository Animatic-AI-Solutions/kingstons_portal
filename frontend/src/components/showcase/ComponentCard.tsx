import React from 'react';

interface ComponentCardProps {
  name: string;
  importPath: string;
  code?: string;
  children: React.ReactNode;
}

/**
 * ComponentCard - Simple card wrapper for showcasing UI components
 *
 * Displays:
 * - Component name as heading
 * - Import path for easy copy-paste
 * - Visual demo area with component variants
 * - Optional collapsible code snippet
 */
export const ComponentCard: React.FC<ComponentCardProps> = ({
  name,
  importPath,
  code,
  children
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
      {/* Component name */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{name}</h3>

      {/* Import path */}
      <code className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded block mb-4 font-mono">
        {importPath}
      </code>

      {/* Visual demo area */}
      <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded border border-gray-100">
        {children}
      </div>

      {/* Optional code snippet */}
      {code && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium">
            Show usage code
          </summary>
          <pre className="mt-2 bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
            <code>{code}</code>
          </pre>
        </details>
      )}
    </div>
  );
};

export default ComponentCard;
