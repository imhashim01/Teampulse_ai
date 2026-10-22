import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Input from '../components/Input';
import { Loader, Lock, Mail, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import { Logo } from '../components/ui';
import { useAuthStore } from '../store/authStore';

const SignUpPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const { signup, error, isLoading } = useAuthStore();

  const handleSignup = async(e) => {
    e.preventDefault();
    try {
      await signup(email, password, name);
      navigate('/verify-email');
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className='max-w-md w-full card overflow-hidden'>

      <div className='p-8'>
        <Logo className='justify-center mb-6' />
        <h2 className='text-xl font-semibold mb-1 text-center text-ink'>
          Create Account
        </h2>

        <p className='text-sm text-muted text-center mb-6'>Start leading with clarity, not guesswork.</p>
        <form onSubmit={handleSignup}>
          <Input
            icon={User}
            type='text'
            placeholder='Username'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
          {error && <p className='text-red-600 font-semibold mt-2'>{error}</p>}
          <PasswordStrengthMeter password={password} />

          <motion.button
            className='btn-primary w-full py-2.5 mt-2'
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type='submit'
            disabled={isLoading}
          >
            {isLoading ? <Loader className='animate-spin mx-auto' size={24} /> : 'Sign Up'}
          </motion.button>
        </form>
      </div>

      <div className='px-8 py-4 bg-canvas border-t border-line flex justify-center'>
        <p className='text-sm text-muted'>
          Already have an account?{" "}
          <Link to={'/login'} className='text-accent hover:underline font-medium'>
              Login
          </Link>
        </p>
      </div>
    </motion.div>
  )
}

export default SignUpPage