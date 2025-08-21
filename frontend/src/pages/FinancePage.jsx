import React, { useState } from 'react';
import { motion } from 'framer-motion';

const FinancePage = () => {
  // Sample transaction data
  const transactions = [
    { id: 1, date: 'Mar 14', description: 'John Chen', category: 'Income', amount: 52350.00 },
    { id: 2, date: 'Mar 12', description: 'Microsoft Coffee', category: 'Food', amount: -55.50 },
    { id: 3, date: 'Mar 10', description: 'Office Supplies', category: 'Expenses', amount: -120.00 },
    { id: 4, date: 'Mar 8', description: 'Freelance Work', category: 'Income', amount: 1500.00 },
  ];

  // Sample budget data
  const budgets = [
    { category: 'Food', spent: 200, total: 500 },
    { category: 'Utilities', spent: 150, total: 300 },
    { category: 'Entertainment', spent: 100, total: 200 },
  ];

  // Calculate summary metrics
  const totalIncome = transactions
    .filter((t) => t.category === 'Income')
    .reduce((sum, t) => sum + t.amount, 0)
    .toFixed(2);
  const totalExpenses = transactions
    .filter((t) => t.category !== 'Income')
    .reduce((sum, t) => sum + t.amount, 0)
    .toFixed(2);
  const netProfit = (totalIncome - Math.abs(totalExpenses)).toFixed(2);

  // Date range filter state
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const dateRanges = ['Last 7 Days', 'Last 30 Days', 'This Year'];

  return (
    <div className=' pt-24'>
          <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-4 sm:p-6"
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#7d98d1] to-[#282354] text-transparent bg-clip-text">
          Finance Manager
        </h1>
        <div className="flex space-x-2">
          {dateRanges.map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm sm:text-base ${
                dateRange === range
                  ? 'bg-[#7d98d1] text-white'
                  : 'bg-[#282354] text-gray-300 hover:bg-[#7d98d1] hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <motion.div
          className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-2">Total Income</h3>
          <p className="text-gray-300 text-sm sm:text-base">${totalIncome}</p>
        </motion.div>
        <motion.div
          className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-2">Total Expenses</h3>
          <p className="text-gray-300 text-sm sm:text-base">${Math.abs(totalExpenses)}</p>
        </motion.div>
        <motion.div
          className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-2">Net Profit/Loss</h3>
          <p className={`text-sm sm:text-base ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${netProfit}
          </p>
        </motion.div>
      </div>

      {/* Transaction List */}
      <motion.div
        className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354] mb-6 sm:mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Recent Transactions</h3>
        {/* Table for medium screens and above */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[#7d98d1] border-b border-[#282354]">
                <th className="pb-3">Date</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-[#282354] last:border-0">
                  <td className="py-3 text-gray-300">{transaction.date}</td>
                  <td className="py-3 text-gray-300">{transaction.description}</td>
                  <td className="py-3 text-gray-300">{transaction.category}</td>
                  <td
                    className={`py-3 ${
                      transaction.amount >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Cards for small screens */}
        <div className="md:hidden space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="p-4 bg-[#282354] rounded-lg">
              <div className="text-gray-300 text-sm font-semibold">{transaction.description}</div>
              <div className="text-gray-400 text-xs">{transaction.date} • {transaction.category}</div>
              <div
                className={`text-sm ${
                  transaction.amount >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {transaction.amount >= 0 ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Budget Overview */}
      <motion.div
        className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Budget Overview</h3>
        <div className="space-y-4">
          {budgets.map((budget, index) => (
            <div key={index} className="flex flex-col space-y-2">
              <div className="flex justify-between text-gray-300 text-sm sm:text-base">
                <span>{budget.category}</span>
                <span>${budget.spent} / ${budget.total}</span>
              </div>
              <div className="w-full bg-[#282354] rounded-full h-2">
                <div
                  className="bg-[#7d98d1] h-2 rounded-full"
                  style={{ width: `${(budget.spent / budget.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
    </div>

  );
};

export default FinancePage;