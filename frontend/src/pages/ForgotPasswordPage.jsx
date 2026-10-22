import { motion } from 'framer-motion'
import React, { useState } from 'react'
import { Logo } from '../components/ui';
import { useAuthStore } from '../store/authStore'
import Input from '../components/Input'
import { ArrowLeft, Loader, Mail} from "lucide-react"
import {Link} from "react-router-dom"

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const  {isLoading, forgotPassword} = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        await forgotPassword(email);
        setIsSubmitted(true);
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
                    Forgot Password
                </h2>

                {!isSubmitted ? ( 
                    <form onSubmit={handleSubmit}>
                        <p className='text-muted text-center mb-6'>
                            Enter your email address to receive a password reset link.
                        </p>
                        <Input
                            icon={Mail}
                            type='email'
                            placeholder='Email Address'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98}}
                            className='btn-primary w-full py-2.5 mt-2'
                            type='submit'
                        >
                            {isLoading ? 
                                <Loader className='size-6 animate-spin mx-auto'/> : 
                                "Send Reset Link"
                            }
                        </motion.button>
                    </form>
                ) : (
                    <div className='text-center'>
                        <motion.div
                            initial={{ scale: 0}}
                            animate={{ scale: 1}}
                            transition={{ type: "spring", stiffness: 500, damping: 30}}
                            className='w-14 h-14 bg-accent-soft rounded-full flex items-center justify-center mx-auto mb-4'
                        >
                            <Mail className="h-7 w-7 text-accent"/>
                        </motion.div>
                        <p className="text-muted mb-6">
                            If an account exists for {email}, you'll receive a password reset link shortly.
                        </p>
                    </div>
                )}
            </div>

            <div className='px-8 py-4 bg-canvas border-t border-line flex justify-center'>
                <Link 
                    to={"/login"} 
                    className="text-sm text-accent hover:underline flex items-center"
                >
                    <ArrowLeft className="h-4 w-4 mr-2"/> 
                    Back to Login
                </Link>
            </div>
        </motion.div>
    )
}

export default ForgotPasswordPage