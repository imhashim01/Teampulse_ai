import React, { useState } from 'react';
import { motion } from 'framer-motion';

const SalesReport = () => {
  // Sample sales data
  const salesData = [
    { product: 'Widget A', unitsSold: 100, revenue: 1000.00, profit: 300.00 },
    { product: 'Gadget B', unitsSold: 50, revenue: 1000.00, profit: 400.00 },
    { product: 'Tool C', unitsSold: 75, revenue: 1125.00, profit: 375.00 },
    { product: 'Device D', unitsSold: 20, revenue: 600.00, profit: 180.00 },
  ];

  // Calculate summary metrics
  const totalSales = salesData.reduce((sum, item) => sum + item.revenue, 0).toFixed(2);
  const totalProfit = salesData.reduce((sum, item) => sum + item.profit, 0).toFixed(2);
  const totalOrders = salesData.length;

  // Time period filter state
  const [timePeriod, setTimePeriod] = useState('Last 7 Days');
  const timePeriods = ['Last 7 Days', 'This Month', 'This Year'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#7d98d1] to-[#282354] text-transparent bg-clip-text">
          Sales Report
        </h1>
        <div className="flex space-x-2">
          {timePeriods.map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm sm:text-base ${
                timePeriod === period
                  ? 'bg-[#7d98d1] text-white'
                  : 'bg-[#282354] text-gray-300 hover:bg-[#7d98d1] hover:text-white'
              }`}
            >
              {period}
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
          <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-2">Total Sales</h3>
          <p className="text-gray-300 text-sm sm:text-base">${totalSales}</p>
        </motion.div>
        <motion.div
          className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-2">Total Profit</h3>
          <p className="text-gray-300 text-sm sm:text-base">${totalProfit}</p>
        </motion.div>
        <motion.div
          className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-2">Number of Orders</h3>
          <p className="text-gray-300 text-sm sm:text-base">{totalOrders}</p>
        </motion.div>
      </div>

      {/* Sales Breakdown */}
      <motion.div
        className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Sales Breakdown</h3>
        {/* Table for medium screens and above */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[#7d98d1] border-b border-[#282354]">
                <th className="pb-3">Product</th>
                <th className="pb-3">Units Sold</th>
                <th className="pb-3">Revenue</th>
                <th className="pb-3">Profit</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map((item, index) => (
                <tr key={index} className="border-b border-[#282354] last:border-0">
                  <td className="py-3 text-gray-300">{item.product}</td>
                  <td className="py-3 text-gray-300">{item.unitsSold}</td>
                  <td className="py-3 text-gray-300">${item.revenue.toFixed(2)}</td>
                  <td className="py-3 text-gray-300">${item.profit.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Cards for small screens */}
        <div className="md:hidden space-y-4">
          {salesData.map((item, index) => (
            <div key={index} className="p-4 bg-[#282354] rounded-lg">
              <div className="text-gray-300 text-sm font-semibold">{item.product}</div>
              <div className="text-gray-400 text-xs">Units Sold: {item.unitsSold}</div>
              <div className="text-gray-400 text-xs">Revenue: ${item.revenue.toFixed(2)}</div>
              <div className="text-gray-400 text-xs">Profit: ${item.profit.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SalesReport;