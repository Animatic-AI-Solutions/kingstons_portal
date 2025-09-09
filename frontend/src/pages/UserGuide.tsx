import React from 'react';
import { ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const UserGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Kingston's Portal - Complete User Guide</h1>
        <p className="text-lg text-gray-600">
          A step-by-step guide to using the wealth management system, from logging in and creating clients to generating reports.
        </p>
      </div>

      {/* Getting Started Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <ChevronRightIcon className="h-6 w-6 text-blue-600 mr-2" />
          Step 1: Getting Started & System Overview
        </h2>
        
        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6">
            <h3 className="text-xl font-medium text-blue-900 mb-3">Logging In & Navigation</h3>
            <div className="text-blue-800 space-y-3">
              <p><strong>1. Access the system:</strong> Open your browser and go to the Kingston's Portal URL</p>
              <p><strong>2. Login:</strong> Enter your username and password</p>
              <p><strong>3. Main Navigation:</strong> Once logged in, you'll see the main menu with these key sections:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Home:</strong> Dashboard with business overview and metrics</li>
                <li><strong>Clients:</strong> Manage all client groups and their information</li>
                <li><strong>Products:</strong> View and manage all financial products</li>
                <li><strong>Product Owners:</strong> Manage individuals within client groups</li>
                <li><strong>Funds:</strong> Set up and manage available funds</li>
                <li><strong>Templates:</strong> Create and manage portfolio templates</li>
                <li><strong>Analytics:</strong> Revenue reports and business performance (under development)</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
              <div>
                <h4 className="text-yellow-800 font-medium">Important System Notes</h4>
                <ul className="mt-2 text-yellow-700 text-sm space-y-1">
                  <li>• <strong>Analytics Page:</strong> Still under development - some features may not work as expected</li>
                  <li>• <strong>Known Issues:</strong> See the troubleshooting section at the end for current system limitations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: Creating Clients */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <ChevronRightIcon className="h-6 w-6 text-blue-600 mr-2" />
          Step 2: Creating Your First Client
        </h2>
        
        <div className="space-y-6">
          <div className="bg-green-50 border-l-4 border-green-400 p-6">
            <h3 className="text-xl font-medium text-green-900 mb-3">Client Group Setup Process</h3>
            <div className="text-green-800 space-y-3">
              <p><strong>1. Navigate to Clients:</strong> Click on "Clients" in the main navigation</p>
              <p><strong>2. Add New Client Group:</strong> Click the "Add Client" button</p>
              <p><strong>3. Fill in Client Group Details:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Enter the client group name (e.g., "Smith Family", "Johnson Trust", "ABC Ltd")</li>
                <li>Select client type (Individual, Family, Trust, Company)</li>
                <li>Set status (usually "Active" for new clients)</li>
              </ul>
              <p><strong>4. Save:</strong> Click save to create the client group</p>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-6">
            <h3 className="text-xl font-medium text-blue-900 mb-3">Understanding Client Groups vs Product Owners</h3>
            <div className="text-blue-800 space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-100 p-3 rounded">
                  <p><strong>👥 Client Group:</strong></p>
                  <ul className="text-sm space-y-1">
                    <li>• The main entity (family, trust, company)</li>
                    <li>• Has a single "Name" field</li>
                    <li>• Examples: "Smith Family", "Johnson Trust", "ABC Ltd"</li>
                    <li>• This is what you see in the main clients list</li>
                  </ul>
                </div>
                <div className="bg-blue-100 p-3 rounded">
                  <p><strong>👤 Product Owners:</strong></p>
                  <ul className="text-sm space-y-1">
                    <li>• Individuals within the client group</li>
                    <li>• Have first name, surname, and "known as" fields</li>
                    <li>• Examples: "John Smith", "Mary Smith", "Trustee A"</li>
                    <li>• These are assigned to specific products</li>
                  </ul>
                </div>
              </div>
              <div className="bg-blue-200 p-3 rounded mt-4">
                <p><strong>Example:</strong> "Smith Family" (client group) might have product owners "John Smith" and "Mary Smith" who each own different investment products within that family's portfolio.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 3: Adding Products */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <ChevronRightIcon className="h-6 w-6 text-blue-600 mr-2" />
          Step 3: Adding Products to Your Client
        </h2>
        
        <div className="space-y-6">
          <div className="bg-purple-50 border-l-4 border-purple-400 p-6">
            <h3 className="text-xl font-medium text-purple-900 mb-3">Product Creation Process</h3>
            <div className="text-purple-800 space-y-3">
              <p><strong>1. Open Client Details:</strong> Click on your client's name from the Clients page</p>
              <p><strong>2. Add Product:</strong> Click the "Add Product" button</p>
              <p><strong>3. Select Provider:</strong> Choose from Zurich, Aviva, or other available providers</p>
              <p><strong>4. Choose Portfolio Template:</strong> Select a template that matches the client's risk profile</p>
              <p><strong>5. Set Fees:</strong> Enter both fixed and percentage fees (both are required, use 0 if no fee applies)</p>
              <p><strong>6. Assign Product Owners:</strong> Select who owns/benefits from this product</p>
              <p><strong>7. Save:</strong> Complete the product creation</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-3">Understanding Portfolio Templates & Generations</h3>
            <div className="text-gray-700 space-y-3">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold text-gray-900 mb-2">📋 Portfolio Template</h4>
                  <ul className="text-sm space-y-1">
                    <li>• The "master blueprint" for a risk profile</li>
                    <li>• Example: "Cautious Portfolio" or "Growth Portfolio"</li>
                    <li>• Think of it as the "recipe"</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold text-gray-900 mb-2">📅 Generation</h4>
                  <ul className="text-sm space-y-1">
                    <li>• A specific version of that template</li>
                    <li>• Created at a particular point in time</li>
                    <li>• Contains actual funds and percentages</li>
                    <li>• Think of it as "making the recipe on a specific day"</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-3">Fee Configuration</h3>
            <div className="text-gray-700 space-y-3">
              <p><strong>Both fee types are required (enter 0 if no fee applies):</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Fixed Fee:</strong> Annual fixed amount in pounds</li>
                <li><strong>Percentage Fee:</strong> Annual percentage of portfolio value</li>
              </ul>
              <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                <p><strong>Example:</strong> Fixed fee "500" + Percentage fee "1.5" = £500 fixed + 1.5% annual management fee</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 4: Inputting Data */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <ChevronRightIcon className="h-6 w-6 text-blue-600 mr-2" />
          Step 4: Inputting Financial Data
        </h2>
        
        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6">
            <h3 className="text-xl font-medium text-blue-900 mb-3">Monthly Bulk Activities - Efficient Data Entry</h3>
            <div className="text-blue-800 space-y-3">
              <p><strong>Use the Monthly Bulk Activities modal to save time:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Add contributions, withdrawals, and valuations for ALL products at once</li>
                <li>Perfect for end-of-month data entry</li>
                <li>Ensures consistent dates across all client portfolios</li>
                <li>Much faster than entering data product by product</li>
              </ul>
              <div className="bg-blue-100 p-3 rounded mt-3">
                <p><strong>How to access:</strong> Look for the "Monthly Bulk Activities" button when viewing client or product data.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-3">Data Entry Guidelines</h3>
            <div className="text-gray-700 space-y-3">
              <p><strong>What to enter:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Contributions:</strong> Money going IN to the portfolio</li>
                <li><strong>Withdrawals:</strong> Money coming OUT of the portfolio</li>
                <li><strong>Valuations:</strong> Current market value of the fund/portfolio on that date</li>
                <li><strong>Dates:</strong> Use consistent date format and ensure chronological order</li>
              </ul>
              
              <div className="bg-gray-50 p-3 rounded mt-3">
                <p><strong>Important Notes:</strong></p>
                <ul className="list-disc list-inside ml-4 text-sm space-y-1">
                  <li>The system automatically handles positive/negative values based on transaction type</li>
                  <li>Ensure all activities are entered before running IRR calculations</li>
                  <li>Use consistent dates across all products for accurate reporting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 5: Generating Reports */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <ChevronRightIcon className="h-6 w-6 text-blue-600 mr-2" />
          Step 5: Generating Reports and IRR Calculations
        </h2>
        
        <div className="space-y-6">
          <div className="bg-indigo-50 border-l-4 border-indigo-400 p-6">
            <h3 className="text-xl font-medium text-indigo-900 mb-3">Running Client Reports</h3>
            <div className="text-indigo-800 space-y-3">
              <p><strong>1. Navigate to Reports:</strong> Go to the "Report Generator" from the main menu</p>
              <p><strong>2. Select Client:</strong> Choose the client group you want to report on</p>
              <p><strong>3. Set Report Parameters:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Select dates to include for each product (not start/end dates)</li>
                <li>All selected products must share the most recent date you select</li>
                <li>Choose which products to include in the report</li>
              </ul>
              <p><strong>4. Generate Report:</strong> Click "Generate Report" and wait for processing</p>
              <p><strong>5. Review & Export:</strong> Review the IRR report and use print/export options as needed</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-3">Understanding IRR (Internal Rate of Return)</h3>
            <div className="text-gray-700 space-y-3">
              <p><strong>IRR shows the annual growth rate of investments:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Positive IRR:</strong> Investment has grown (e.g., 7.5% means 7.5% annual growth)</li>
                <li><strong>Negative IRR:</strong> Investment has lost value</li>
                <li><strong>"N/A" IRR:</strong> Usually means no meaningful activity to calculate (e.g., zero valuation funds)</li>
              </ul>
              
              <div className="bg-blue-50 p-3 rounded mt-3 border-l-4 border-blue-400">
                <p><strong>IRR Calculation Requirements:</strong></p>
                <ul className="list-disc list-inside ml-4 text-sm space-y-1">
                  <li>At least one contribution or withdrawal</li>
                  <li>At least one valuation after the cash flow</li>
                  <li><strong>All funds in the portfolio must have valuations</strong> before IRR can be calculated</li>
                  <li>Proper chronological order of transactions</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-3">IRR Report - The Only Report Type</h3>
            <div className="text-gray-700 space-y-3">
              <div className="bg-indigo-50 p-4 rounded border-l-4 border-indigo-400">
                <p><strong>📈 IRR Report Features:</strong></p>
                <ul className="list-disc list-inside ml-4 text-sm space-y-1 mt-2">
                  <li>Shows Internal Rate of Return for all selected products</li>
                  <li>Fund-by-fund performance breakdown</li>
                  <li>Historical growth tracking over selected periods</li>
                  <li>Portfolio-level and individual fund IRR calculations</li>
                  <li>Professional formatting for client presentations</li>
                </ul>
              </div>
              <p className="text-gray-600 text-sm">
                <strong>Note:</strong> Currently, the IRR report is the primary and only report type available in the system. 
                It provides comprehensive performance analysis for client portfolios.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-2" />
          Common Questions and Troubleshooting
        </h2>
        
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-3">Page Loading Issues</h3>
            <div className="text-gray-700 space-y-3">
              <p><strong>If pages are loading slowly:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Wait a moment - complex reports take time to calculate</li>
                <li>Try refreshing the page (F5 or Ctrl+R)</li>
                <li>Check your internet connection</li>
                <li>Close and reopen your browser if issues persist</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-3">Data Not Showing</h3>
            <div className="text-gray-700 space-y-3">
              <p><strong>If you can't find expected data:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Check if filters are applied (status filters, date ranges, etc.)</li>
                <li>Verify you're looking in the right section (Clients vs Products vs Reports)</li>
                <li>Try clearing any search terms</li>
                <li>Check if the item status is "Active" vs "Inactive"</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-3">When Something Looks Wrong</h3>
            <div className="text-gray-700 space-y-3">
              <p className="bg-red-50 p-3 rounded border-l-4 border-red-400">
                <strong>If financial data looks incorrect:</strong> Take a screenshot showing what's wrong, note what you expected to see, and contact Jacob immediately. Don't make changes if numbers don't look right.
              </p>
              <p><strong>For other issues:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Note exactly what you were trying to do</li>
                <li>Take a screenshot of any error messages</li>
                <li>Write down the steps you took to get to the problem</li>
                <li>Check this guide first, then contact Jacob if needed</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Known Bugs Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
          Known Bugs & Workarounds
        </h2>
        
        <div className="bg-red-50 border-l-4 border-red-400 p-6">
          <div className="text-red-800 space-y-4">
            <p className="font-medium mb-4">These are current system limitations that Jacob is aware of:</p>
            
            <div className="space-y-3">
              <div className="bg-red-100 p-3 rounded">
                <p><strong>🔍 Report Display Issues:</strong></p>
                <ul className="list-disc list-inside ml-4 text-sm space-y-1">
                  <li>Fund names might overflow/cut off in report displays</li>
                </ul>
              </div>
              
              <div className="bg-red-100 p-3 rounded">
                <p><strong>💰 Cash Fund IRR Issues:</strong></p>
                <ul className="list-disc list-inside ml-4 text-sm space-y-1">
                  <li>Individual IRRs for cash funds sometimes don't trigger automatically</li>
                  <li><strong>Workaround:</strong> Add a £1 investment, save it, then delete it to trigger calculation</li>
                </ul>
              </div>
              
              <div className="bg-red-100 p-3 rounded">
                <p><strong>📊 Data Issues:</strong></p>
                <ul className="list-disc list-inside ml-4 text-sm space-y-1">
                  <li>Some products may drop off to a separate page - this is being worked on</li>
                  <li>Funds added to a product retrospectively still need valuations for those dates it wasn't in the product (needs to be valuations of zero). A permanent automation will be created after Jacob returns to make this less cumbersome</li>
                  <li>Zero valuation funds show IRR as "N/A" (this is normal when fund was dormant)</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-red-200 p-3 rounded mt-4">
              <p className="font-medium">⚠️ Important: These issues don't affect data accuracy - they're display or workflow issues. If you encounter any of these, try the suggested workarounds or contact Jacob for guidance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Still Need Help?</h2>
        <div className="text-gray-700 space-y-2">
          <p>If this guide doesn't answer your question or you're experiencing issues:</p>
          <p>
            <strong>Contact Jacob:</strong> 
            <a href="mailto:jacob.b.mcnulty.2019@gmail.com" className="text-blue-600 underline ml-2">jacob.b.mcnulty.2019@gmail.com</a> | 
            <a href="tel:07505755664" className="text-blue-600 underline ml-1">07505 755 664</a>
          </p>
          <p className="text-sm text-gray-600">Please include screenshots and describe what you were trying to do when the issue occurred.</p>
        </div>
      </section>
    </div>
  );
};

export default UserGuide;