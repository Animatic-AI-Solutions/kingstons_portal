import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms and Conditions</h1>
      
      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
          <p className="text-gray-600 mb-4">
            Welcome to Kingston's Financial. By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Use License</h2>
          <p className="text-gray-600 mb-4">
            Permission is granted to temporarily access the materials (information or software) on Kingston's Financial's website for personal, non-commercial transitory viewing only.
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4">
            <li className="mb-2">This is the license, not a transfer of title</li>
            <li className="mb-2">You may not modify or copy the materials</li>
            <li className="mb-2">You may not use the materials for any commercial purpose</li>
            <li className="mb-2">You may not attempt to decompile or reverse engineer any software</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Disclaimer</h2>
          <p className="text-gray-600 mb-4">
            The materials on Kingston's Financial's website are provided on an 'as is' basis. Kingston's Financial makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Limitations</h2>
          <p className="text-gray-600 mb-4">
            In no event shall Kingston's Financial or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Kingston's Financial's website.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Revisions and Errata</h2>
          <p className="text-gray-600 mb-4">
            The materials appearing on Kingston's Financial's website could include technical, typographical, or photographic errors. Kingston's Financial does not warrant that any of the materials on its website are accurate, complete or current.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Contact Information</h2>
          <p className="text-gray-600">
            If you have any questions about these Terms and Conditions, please contact us at:
          </p>
          <p className="text-gray-600">
            Kingston's Financial<br />
            Email: info@kingstonsfinancial.com<br />
            Website: <a href="https://www.kingstonsfinancial.com" className="text-blue-600 hover:text-blue-800">www.kingstonsfinancial.com</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms; 