import React from 'react';
import { motion } from 'framer-motion';

const DashboardPage = () => {

  const transactions = [
    { description: 'John Chen', date: 'Mar 14', category: 'Income', amount: '+52,350.00' },
    { description: 'Microsoft Coffee', date: 'Mar 12', category: 'Food', amount: '-55.50' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#7d98d1] to-[#282354] text-transparent bg-clip-text">
          Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <motion.div
          className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Balance Summary</h3>
          <p className="text-gray-300 text-sm sm:text-base">From: 5.14 Mar. 2024</p>
        </motion.div>

        <motion.div
          className="lg:col-span-2 p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Recent Transactions</h3>
          {/* Table for medium screens and above */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[#7d98d1] border-b border-[#282354]">
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <tr key={index} className="border-b border-[#282354] last:border-0">
                    <td className="py-3 text-gray-300">{transaction.description}</td>
                    <td className="py-3 text-gray-300">{transaction.date}</td>
                    <td className="py-3 text-gray-300">{transaction.category}</td>
                    <td
                      className={`py-3 ${
                        transaction.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {transaction.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Card layout for small screens */}
          <div className="md:hidden space-y-4">
            {transactions.map((transaction, index) => (
              <div key={index} className="p-4 bg-[#282354] rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300 text-sm">{transaction.description}</span>
                  <span
                    className={`text-sm ${
                      transaction.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {transaction.amount}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  <span>{transaction.date}</span> • <span>{transaction.category}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Upcoming Payments</h3>
          <div className="space-y-2">
            {['$20.00', '$25.00', '$30.00', '$21.00'].map((amount, index) => (
              <div key={index} className="flex justify-between items-center text-gray-300 text-sm sm:text-base">
                <span>Payment {index + 1}</span>
                <span className="text-red-400">{amount}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Saving Goal</h3>
          <div className="h-2 bg-[#282354] rounded-full mb-2">
            <div
              className="h-2 bg-[#7d98d1] rounded-full transition-all duration-500"
              style={{ width: '30%' }}
            />
          </div>
          <p className="text-gray-300 text-sm sm:text-base">$1,000 progress on the board level</p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;