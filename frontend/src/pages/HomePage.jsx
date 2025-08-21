import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const HomePage = () => {
  return (
    <div className='min-h-screen flex flex-col items-center justify-center p-8'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='max-w-2xl text-center mb-12'
      >
        <h1 className='text-5xl font-bold mb-6 bg-gradient-to-r from-[#7d98d1] to-[#282354] text-transparent bg-clip-text'>
          Welcome to Our Platform
        </h1>
        <p className='text-xl text-gray-300 mb-8'>
          Secure and reliable authentication system with modern features
        </p>
        
        <div className='flex gap-6 justify-center'>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className='px-8 py-3 bg-gradient-to-r from-[#7d98d1] to-[#282354] text-white rounded-lg font-semibold shadow-lg'
          >
            <Link to='/signup'>Get Started</Link>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className='px-8 py-3 border-2 border-[#7d98d1] text-[#7d98d1] rounded-lg font-semibold hover:bg-[#7d98d1]/10'
          >
            <Link to='/login'>Demo</Link>
          </motion.button>
        </div>
      </motion.div>

      <div className='mt-16 space-y-6 w-full max-w-md'>
        <div className='px-8 py-4 bg-[#172542] rounded-xl flex justify-center'>
          <p className='text-sm text-gray-300'>
            Don't have an account?{" "}
            <Link 
              to='/signup' 
              className='text-[#7d98d1] ml-1 hover:underline font-medium'
            >
              Sign Up
            </Link>
          </p>
        </div>

        <div className='px-8 py-4 bg-[#172542] rounded-xl flex justify-center'>
          <p className='text-sm text-gray-300'>
            Already have an account?{" "}
            <Link 
              to={'/login'} 
              className='text-[#7d98d1] hover:underline font-medium'
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default HomePage