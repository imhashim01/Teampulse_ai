import React from 'react'
import { motion } from 'framer-motion'
import { Mail, User, Clock } from 'lucide-react'

const MessagePage = () => {
  const messages = [
    { 
      sender: 'Microsoft Support',
      preview: 'Your subscription renewal is pending - please confirm your payment details',
      time: '2 hours ago',
      read: false,
      category: 'important'
    },
    { 
      sender: 'John Chen',
      preview: 'Thanks for the quick response on the project deliverables!',
      time: '5 hours ago',
      read: true,
      category: 'personal'
    },
    { 
      sender: 'System Alert',
      preview: 'Scheduled maintenance will occur this weekend. Services may be temporarily unavailable',
      time: '1 day ago',
      read: true,
      category: 'update'
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
          Messages
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 sm:p-6 bg-[#172542] rounded-xl border border-[#282354] ${
              !message.read ? 'border-l-4 border-l-[#7d98d1]' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${
                message.category === 'important' ? 'bg-red-900/20' :
                message.category === 'personal' ? 'bg-green-900/20' : 'bg-[#282354]'
              }`}>
                {message.category === 'important' ? (
                  <Mail className="w-5 h-5 text-red-400" />
                ) : message.category === 'personal' ? (
                  <User className="w-5 h-5 text-green-400" />
                ) : (
                  <Clock className="w-5 h-5 text-[#7d98d1]" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className={`text-base sm:text-lg font-medium ${
                  !message.read ? 'text-[#7d98d1]' : 'text-gray-300'
                }`}>
                  {message.sender}
                </h3>
                <p className="text-sm sm:text-base text-gray-400 mt-1 line-clamp-2">
                  {message.preview}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-red-400">{message.time}</span>
                  {!message.read && (
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

export default MessagePage