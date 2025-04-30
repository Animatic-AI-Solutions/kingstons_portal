import React from 'react';

const Cookies: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Cookie Policies</h1>
      
      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. What Are Cookies</h2>
          <p className="text-gray-600 mb-4">
            Cookies are small text files that are placed on your computer or mobile device when you visit our website. They are widely used to make websites work more efficiently and provide a better user experience.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. How We Use Cookies</h2>
          <p className="text-gray-600 mb-4">
            We use cookies for the following purposes:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4">
            <li className="mb-2">Authentication and security</li>
            <li className="mb-2">Preferences and settings</li>
            <li className="mb-2">Analytics and performance</li>
            <li className="mb-2">User experience enhancement</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Types of Cookies We Use</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Essential Cookies</h3>
              <p className="text-gray-600">
                These cookies are necessary for the website to function properly and cannot be disabled.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Performance Cookies</h3>
              <p className="text-gray-600">
                These cookies help us understand how visitors interact with our website.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Functionality Cookies</h3>
              <p className="text-gray-600">
                These cookies enable enhanced functionality and personalization.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Managing Cookies</h2>
          <p className="text-gray-600 mb-4">
            Most web browsers allow you to control cookies through their settings preferences. However, limiting cookies may affect your experience of our website.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Changes to Our Cookie Policy</h2>
          <p className="text-gray-600 mb-4">
            We may update our Cookie Policy from time to time. Any changes will be posted on this page with an updated revision date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Contact Us</h2>
          <p className="text-gray-600">
            If you have any questions about our Cookie Policy, please contact us at:
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

export default Cookies; 