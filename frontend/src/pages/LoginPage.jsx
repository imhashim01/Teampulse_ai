import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader, Lock, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import Input from '../components/Input';
import { useAuthStore } from '../store/authStore';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault(); 
    await login(email, password);
  }

  return (
    <motion.div     
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className='max-w-md w-full bg-[#0e0b21] backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-[#282354]'
    >
      <div className='p-8'>
        <h2 className='text-3xl font-bold mb-6 text-center bg-gradient-to-r from-[#7d98d1] to-[#282354] text-transparent bg-clip-text'>
          Welcome Back
        </h2>

        <form onSubmit={handleLogin}>
          <Input
            icon={Mail}
            type='email'
            placeholder='Email Address'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            icon={Lock}
            type='password'
            placeholder='Password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className='flex items-center mb-6'>
            <Link 
              to='/forgot-password' 
              className='text-sm text-[#7d98d1] hover:underline'
            >
              Forgot Password?
            </Link>
          </div>
          {error && <p className='text-red-500 font-semibold mb-2'>{error}</p>}

          <motion.button
            className='mt-5 w-full py-3 px-4 bg-gradient-to-r from-[#7d98d1] to-[#282354] text-white font-bold rounded-lg shadow-lg hover:from-[#7d98d1]/90 hover:to-[#282354]/90 focus:outline-none focus:ring-2 focus:ring-[#7d98d1] focus:ring-offset-2 focus:ring-offset-[#0e0b21] transition duration-200'
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type='submit'
            disabled={isLoading}
          >
            {isLoading ? 
              <Loader size='1.5rem' className='animate-spin mx-auto text-white' /> 
              : 'Login'
            }
          </motion.button>
        </form>
      </div>

      <div className='px-8 py-4 bg-[#172542] flex justify-center'>
        <p className='text-sm text-gray-300'>
          Don't have an account?{" "}
          <Link 
            to='/signup' 
            className='text-[#7d98d1] ml-1 hover:underline'
          >
            Sign Up
          </Link>
        </p>
      </div>
    </motion.div>
  )
}

export default LoginPage