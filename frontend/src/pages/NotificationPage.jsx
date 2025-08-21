import React from 'react'
import { motion } from 'framer-motion'

const NotificationPage = () => {
  const notifications = [
    { 
      title: 'Payment Received', 
      message: 'You\'ve received $2,500 from Microsoft Corporation',
      time: '2 hours ago',
      read: false,
      type: 'payment'
    },
    { 
      title: 'Account Alert', 
      message: 'Unusual login attempt detected from new device',
      time: '5 hours ago',
      read: true,
      type: 'security'
    },
    { 
      title: 'Statement Available', 
      message: 'Your March 2024 account statement is now available',
      time: '1 day ago',
      read: true,
      type: 'update'
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
    >
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#7d98d1] to-[#282354] text-transparent bg-clip-text">
          Notifications
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {notifications.map((notification, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354] ${
              !notification.read ? 'border-l-4 border-l-[#7d98d1]' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${
                notification.type === 'payment' ? 'bg-green-900/20' :
                notification.type === 'security' ? 'bg-red-900/20' : 'bg-[#282354]'
              }`}>
                {notification.type === 'payment' ? (
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ) : notification.type === 'security' ? (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-[#7d98d1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className={`text-base sm:text-lg font-medium ${
                  !notification.read ? 'text-[#7d98d1]' : 'text-gray-300'
                }`}>
                  {notification.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-400 mt-1">
                  {notification.message}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-red-400">{notification.time}</span>
                  {!notification.read && (
                    <span className="px-2 py-1 text-xs bg-[#282354] rounded-full text-[#7d98d1]">
                      New
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default NotificationPage