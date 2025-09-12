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

      {/* System Maintenance Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <ChevronRightIcon className="h-6 w-6 text-orange-600 mr-2" />
          System Maintenance & Technical Documentation
        </h2>
        
        <div className="space-y-6">
          <div className="bg-orange-50 border-l-4 border-orange-400 p-6">
            <h3 className="text-xl font-medium text-orange-900 mb-3">🔧 For System Administration & Emergency Maintenance</h3>
            <div className="text-orange-800 space-y-3">
              <p><strong>Project Continuity Guide:</strong> If Jacob is unavailable and you need to maintain, troubleshoot, or understand the system technical details, a comprehensive technical guide is available.</p>
              
              <div className="bg-orange-100 p-4 rounded mt-4">
                <p className="font-medium text-orange-900 mb-2">📋 Complete Technical Documentation:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                  <li><strong>Location:</strong> <code>docs/PROJECT_CONTINUITY_GUIDE.md</code></li>
                  <li><strong>Contains:</strong> Database access, server details, deployment procedures, backup processes</li>
                  <li><strong>Emergency contacts:</strong> Jacob McNulty (07505755664), Gabriella Cuba (07715898405)</li>
                  <li><strong>Server details:</strong> Kingston03 VM, database credentials, environment setup</li>
                  <li><strong>Backup location:</strong> C:\DatabaseBackups\KingstonsPortal\</li>
                </ul>
              </div>
              
              <div className="bg-red-100 p-4 rounded mt-4">
                <p className="font-medium text-red-900 mb-2">🚨 Emergency System Access:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                  <li><strong>Production System:</strong> http://intranet.kingston.local</li>
                  <li><strong>API Documentation:</strong> http://intranet.kingston.local:8001/docs</li>
                  <li><strong>Database:</strong> PostgreSQL on Kingston03 server (192.168.0.223)</li>
                  <li><strong>Health Check:</strong> http://intranet.kingston.local:8001/api/health</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Source Code Access Instructions */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6">
            <h3 className="text-xl font-medium text-blue-900 mb-3">📥 Accessing Source Code & Technical Documentation</h3>
            <div className="text-blue-800 space-y-4">
              <div className="bg-blue-100 p-3 rounded border-l-4 border-blue-500">
                <p className="font-semibold text-blue-900 mb-2">🎯 PRIMARY OBJECTIVE: Access PROJECT_CONTINUITY_GUIDE.md</p>
                <p className="text-sm">
                  This critical document contains complete system handover procedures, database details, 
                  emergency contacts, and troubleshooting information essential for system continuity.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-blue-900 mb-2">📂 Source Code Access Options</h4>
                <div className="space-y-3">
                  <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                    <p className="font-semibold text-green-800 mb-2">🌟 Recommended: Clone from Git Repository</p>
                    <div className="text-sm text-green-700">
                      <p className="mb-2">The official Kingston's Portal repository is hosted on GitHub:</p>
                      <div className="bg-white p-2 rounded border">
                        <code className="text-xs font-mono text-gray-800">
                          https://github.com/Animatic-AI-Solutions/kingstons_portal
                        </code>
                      </div>
                      <p className="text-xs mt-1 text-green-600">
                        ✓ Always up-to-date ✓ Version controlled ✓ Complete history ✓ All documentation included
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                    <p className="font-semibold text-blue-800 mb-2">💻 Alternative: VM Access</p>
                    <div className="text-sm text-blue-700 space-y-2">
                      <div>
                        <p className="font-semibold">Jacob's Development VM:</p>
                        <p className="text-xs">Cloned repository available locally</p>
                      </div>
                      <div>
                        <p className="font-semibold">Kingston03 Production VM (192.168.0.223):</p>
                        <ul className="text-xs space-y-1 ml-3">
                          <li>• Cloned repository available</li>
                          <li>• Production deployment: <code className="bg-gray-100 px-1 rounded">C:\Apps\portal_api\</code></li>
                          <li>• Frontend deployment: <code className="bg-gray-100 px-1 rounded">C:\inetpub\wwwroot\OfficeIntranet\</code></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-blue-900 mb-2">🔍 How to Access the Critical Documentation</h4>
                
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded border">
                    <p className="font-semibold text-gray-800 text-sm mb-2">Method 1: Clone Git Repository (Recommended)</p>
                    <div className="text-xs text-gray-600 space-y-2">
                      <div className="bg-yellow-50 p-2 rounded mb-2">
                        <p className="text-yellow-800"><strong>Prerequisites:</strong> Git must be installed on your system</p>
                        <p className="text-yellow-700 text-xs mt-1">
                          Don't have Git? Download from <a href="https://git-scm.com/download/windows" className="text-blue-600 underline">https://git-scm.com/download/windows</a>
                        </p>
                      </div>
                      <p><strong>Step-by-step instructions:</strong></p>
                      <ol className="ml-3 space-y-1">
                        <li>1. Open Command Prompt or PowerShell</li>
                        <li>2. Navigate to where you want to download the code (e.g., <code className="bg-gray-100 px-1 rounded">cd C:\</code>)</li>
                        <li>3. Clone the repository:</li>
                      </ol>
                      <div className="bg-gray-100 p-2 rounded mt-2">
                        <code className="text-xs font-mono">
                          git clone https://github.com/Animatic-AI-Solutions/kingstons_portal.git<br/>
                          cd kingstons_portal<br/>
                          git checkout main
                        </code>
                      </div>
                      <p className="mt-2"><strong>Access documentation:</strong></p>
                      <div className="bg-gray-100 p-2 rounded">
                        <code className="text-xs font-mono">
                          type docs\PROJECT_CONTINUITY_GUIDE.md
                        </code>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded border">
                    <p className="font-semibold text-gray-800 text-sm mb-2">Method 2: Access via Jacob's VM</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Requirements:</strong> Access to Jacob's development environment</p>
                      <ol className="ml-3 space-y-1 mt-1">
                        <li>1. Connect to Jacob's development VM</li>
                        <li>2. Navigate to the cloned repository location</li>
                        <li>3. Open the <code className="bg-gray-100 px-1 rounded">docs</code> folder</li>
                        <li>4. Access <strong>PROJECT_CONTINUITY_GUIDE.md</strong></li>
                      </ol>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded border">
                    <p className="font-semibold text-gray-800 text-sm mb-2">Method 3: Access via Kingston03 VM</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Requirements:</strong> Company network access + Kingston03 admin credentials</p>
                      <ol className="ml-3 space-y-1 mt-1">
                        <li>1. Connect to company network (VPN if remote)</li>
                        <li>2. Remote Desktop to 192.168.0.223 (Kingston03)</li>
                        <li>3. Navigate to the cloned repository location</li>
                        <li>4. Access <code className="bg-gray-100 px-1 rounded">docs\PROJECT_CONTINUITY_GUIDE.md</code></li>
                      </ol>
                      <div className="bg-yellow-50 p-2 rounded mt-2">
                        <p className="text-yellow-700 text-xs">
                          <strong>Note:</strong> Production files are deployed separately at <code>C:\Apps\portal_api\</code> 
                          and <code>C:\inetpub\wwwroot\OfficeIntranet\</code> but the full repository with 
                          documentation is also available on this VM.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-blue-900 mb-2">📁 Complete Project Structure</h4>
                <div className="bg-white p-3 rounded border">
                  <div className="bg-gray-100 p-2 rounded font-mono text-xs overflow-x-auto">
                    <pre>{`kingstons_portal/
├── 📁 backend/              # Python FastAPI Backend
├── 📁 frontend/             # React TypeScript Frontend  
├── 📁 docs/                 # 📚 COMPREHENSIVE DOCUMENTATION
│   ├── 📄 README.md         # Main navigation hub
│   ├── 📄 PROJECT_CONTINUITY_GUIDE.md  # ⚠️ CRITICAL DOCUMENT
│   └── 📁 [01-10]_*/       # 10 organized documentation sections
├── 📄 .env                  # Environment configuration
├── 📄 deploy_minimal.ps1    # Deployment automation
└── 📄 database_backup_organized.ps1  # Backup procedures`}</pre>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-blue-900 mb-2">📋 Next Steps After Accessing Source Code</h4>
                <div className="bg-white p-3 rounded border">
                  <ol className="text-sm space-y-2">
                    <li><strong>1. Read PROJECT_CONTINUITY_GUIDE.md</strong> - Emergency procedures and system details</li>
                    <li><strong>2. Explore docs/README.md</strong> - Complete system overview and navigation</li>
                    <li><strong>3. Review docs/03_architecture/</strong> - Technical architecture details</li>
                    <li><strong>4. Check docs/02_getting_started/</strong> - Development setup instructions</li>
                  </ol>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <h4 className="font-semibold text-yellow-800 mb-2">🔒 Security Note</h4>
                <p className="text-yellow-700 text-sm">
                  Source code contains sensitive configuration information. Access should be limited 
                  to authorized personnel only. Never commit <code className="bg-yellow-100 px-1 rounded">.env</code> files 
                  to version control and protect database credentials.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6">
            <h3 className="text-xl font-medium text-yellow-900 mb-3">📚 Additional Technical Resources</h3>
            <div className="text-yellow-800 space-y-3">
              <p>The project includes extensive technical documentation in the <code>docs/</code> folder:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Architecture:</strong> System design and database schema</li>
                <li><strong>Development:</strong> Setup procedures and coding standards</li>
                <li><strong>Operations:</strong> Deployment and maintenance procedures</li>
                <li><strong>Security:</strong> Authentication and access control details</li>
              </ul>
              <p className="text-sm italic mt-3">This documentation is designed to enable any qualified developer to maintain the system in Jacob's absence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Need Help? Follow This Order</h2>
        
        <div className="space-y-4">
          <div className="bg-white border-l-4 border-blue-500 p-4 rounded-r">
            <h3 className="font-semibold text-gray-900 mb-2">📋 Step-by-Step Support Process</h3>
            <div className="space-y-3 text-gray-700">
              <div className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                <div>
                  <p><strong>First:</strong> Ask Dawn or Sean for help - they know the system well and can resolve most user questions.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                <div>
                  <p><strong>Then:</strong> If they can't help, work through this User Guide carefully - most questions are answered here.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                <div>
                  <p><strong>Finally:</strong> If you still need help, contact Jacob:</p>
                  <div className="ml-4 mt-2 space-y-1">
                    <p>
                      <strong>📧 Email:</strong> 
                      <a href="mailto:jacob.b.mcnulty.2019@gmail.com" className="text-blue-600 underline ml-2">jacob.b.mcnulty.2019@gmail.com</a>
                    </p>
                    <p>
                      <strong>📞 Phone:</strong> 
                      <a href="tel:07505755664" className="text-blue-600 underline ml-2">07505 755 664</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r">
            <h3 className="font-medium text-yellow-800 mb-2">💡 When Contacting Jacob:</h3>
            <ul className="text-yellow-700 text-sm space-y-1 list-disc list-inside">
              <li>Include screenshots of the issue</li>
              <li>Describe exactly what you were trying to do</li>
              <li>Mention that you've already asked Dawn/Sean and checked this guide</li>
              <li>For urgent technical/system issues when Jacob is unavailable, contact Gabriella Cuba: <a href="tel:07715898405" className="text-yellow-600 underline">07715 898 405</a></li>
            </ul>
          </div>
          
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r">
            <h3 className="font-medium text-red-800 mb-2">🚨 System Emergency (Jacob Unavailable):</h3>
            <p className="text-red-700 text-sm">For critical system failures when Jacob cannot be reached, refer to the <strong>System Maintenance & Technical Documentation</strong> section above for emergency procedures and technical contacts.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UserGuide;