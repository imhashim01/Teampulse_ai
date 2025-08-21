import React from 'react'
import { motion } from 'framer-motion'

const LoadingSpinner = () => {
  return (
    <div className='min-h-screen bg-gradient-to-br from-[#0e0b21] via-[#172542] to-[#282354] flex items-center justify-center relative overflow-hidden'>
      {/* Loading spinner */}
      <motion.div
        className='w-16 h-16 border-4 border-t-4 border-t-[#7d98d1] border-x-[#282354]/50 rounded-full'
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

export default LoadingSpinner