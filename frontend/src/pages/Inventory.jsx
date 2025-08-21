import React from 'react';
import { motion } from 'framer-motion';

const Inventory = () => {
  // Sample inventory items
  const items = [
    { id: 1, name: 'Widget A', sku: 'WID-A', quantity: 100, unitPrice: 10.00, category: 'Widgets' },
    { id: 2, name: 'Gadget B', sku: 'GAD-B', quantity: 50, unitPrice: 20.00, category: 'Gadgets' },
    { id: 3, name: 'Tool C', sku: 'TOL-C', quantity: 75, unitPrice: 15.00, category: 'Tools' },
    { id: 4, name: 'Device D', sku: 'DEV-D', quantity: 20, unitPrice: 30.00, category: 'Devices' },
  ];

  // Calculate summary metrics
  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#7d98d1] to-[#282354] text-transparent bg-clip-text">
          Inventory
        </h1>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search items..."
            className="px-4 py-2 bg-[#282354] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7d98d1] w-full sm:w-auto"
          />
          <button className="px-4 py-2 bg-gradient-to-r from-[#7d98d1] to-[#282354] text-white font-bold rounded-lg hover:from-[#282354] hover:to-[#7d98d1]">
            Add Item
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Inventory Items List */}
        <motion.div
          className="lg:col-span-2 p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Inventory Items</h3>
          {/* Table for medium screens and above */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[#7d98d1] border-b border-[#282354]">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">SKU</th>
                  <th className="pb-3">Quantity</th>
                  <th className="pb-3">Unit Price</th>
                  <th className="pb-3">Category</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-[#282354] last:border-0">
                    <td className="py-3 text-gray-300">{item.name}</td>
                    <td className="py-3 text-gray-300">{item.sku}</td>
                    <td className="py-3 text-gray-300">{item.quantity}</td>
                    <td className="py-3 text-gray-300">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-3 text-gray-300">{item.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cards for small screens */}
          <div className="md:hidden space-y-4">
            {items.map((item) => (
              <div key={item.id} className="p-4 bg-[#282354] rounded-lg">
                <div className="text-gray-300 text-sm font-semibold">{item.name}</div>
                <div className="text-gray-400 text-xs">SKU: {item.sku}</div>
                <div className="text-gray-400 text-xs">Quantity: {item.quantity}</div>
                <div className="text-gray-400 text-xs">Unit Price: ${item.unitPrice.toFixed(2)}</div>
                <div className="text-gray-400 text-xs">Category: {item.category}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="space-y-4 lg:space-y-6">
          <motion.div
            className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
          >
            <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Total Items</h3>
            <p className="text-gray-300 text-sm sm:text-base">{totalItems}</p>
          </motion.div>
          <motion.div
            className="p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354]"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
          >
            <h3 className="text-lg sm:text-xl font-semibold text-[#7d98d1] mb-4">Total Inventory Value</h3>
            <p className="text-gray-300 text-sm sm:text-base">${totalValue}</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Inventory;