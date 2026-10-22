import React from 'react'
import { motion } from 'framer-motion'

const LoadingSpinner = () => {
  return (
    <div className='min-h-screen bg-canvas flex items-center justify-center'>
      <motion.div
        className='w-10 h-10 border-[3px] border-line border-t-accent rounded-full'
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

export default LoadingSpinner
