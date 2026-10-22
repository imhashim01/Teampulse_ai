import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader, Lock, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import Input from '../components/Input';
import { Logo } from '../components/ui';
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
      className='max-w-md w-full card overflow-hidden'
    >
      <div className='p-8'>
        <Logo className='justify-center mb-6' />
        <h2 className='text-xl font-semibold mb-1 text-center text-ink'>
          Welcome Back
        </h2>

        <p className='text-sm text-muted text-center mb-6'>Log in to see how your team is really doing.</p>
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
              className='text-sm text-accent hover:underline'
            >
              Forgot Password?
            </Link>
          </div>
          <button type='button' className='w-full text-xs text-muted hover:text-accent mb-3' onClick={() => { setEmail('lead@teampulse.demo'); setPassword('Demo@1234'); }}>
            Fill demo lead account (Usman)
          </button>
          {error && <p className='text-red-600 font-semibold mb-2'>{error}</p>}

          <motion.button
            className='btn-primary w-full py-2.5 mt-2'
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type='submit'
            disabled={isLoading}
          >
            {isLoading ? 
              <Loader size='1.5rem' className='animate-spin mx-auto' /> 
              : 'Login'
            }
          </motion.button>
        </form>
      </div>

      <div className='px-8 py-4 bg-canvas border-t border-line flex justify-center'>
        <p className='text-sm text-muted'>
          Don't have an account?{" "}
          <Link 
            to='/signup' 
            className='text-accent ml-1 hover:underline'
          >
            Sign Up
          </Link>
        </p>
      </div>
    </motion.div>
  )
}

export default LoginPage