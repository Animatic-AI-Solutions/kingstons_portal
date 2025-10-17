import React from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatMoney } from '../../../utils/formatMoney';
import { Product } from '../types';

interface OtherProductsTabProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

const OtherProductsTab: React.FC<OtherProductsTabProps> = ({
  products,
  onProductClick
}) => {

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Cover Type</th>
            <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Provider</th>
            <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Policy Number</th>
            <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Lives Assured</th>
            <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">Sum Assured</th>
            <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">Monthly Payment</th>
            <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Term</th>
            <th className="px-3 py-2 text-center text-sm font-bold text-gray-900 uppercase tracking-wider">In Trust</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => onProductClick(product)}>
              <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">{product.coverType}</td>
              <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{product.provider}</td>
              <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 font-mono">{product.policyNumber}</td>
              <td className="px-3 py-2 text-base text-gray-900">
                {product.livesAssured.join(', ')}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right font-semibold">
                {formatMoney(product.sumAssured)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                {formatMoney(product.monthlyPayment)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                {product.startDate} - {product.endDate}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-base text-center">
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                  product.inTrust
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {product.inTrust ? 'Yes' : 'No'}
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
  );
};

export default OtherProductsTab;
