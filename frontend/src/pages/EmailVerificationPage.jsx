import React, { useEffect } from 'react'
import { useState, useRef } from 'react';
import { motion } from 'framer-motion'; 
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const EmailVerificationPage = () => {

    const [code, setCode] = useState(["","","","","",""]);
    const inputRefs = useRef([]);
    const navigate = useNavigate();

    const {error,isLoading,verifyEmail} = useAuthStore();

    const handleChange = (index, value) => {
        const newCode = [...code];

        if (value.length > 1) {
            const pastedCode = value.slice(0,6).split('');
            for (let i = 0; i < 6; i++) {
                newCode[i] = pastedCode[i] || '';
            }
            setCode(newCode);

            const lastFilledIndex = newCode.findLastIndex((digit) => digit !== '');
            const focusIndex = lastFilledIndex < 5 ? lastFilledIndex + 1 : 5;
            inputRefs.current[focusIndex].focus();
            
        } else {
            newCode[index] = value;
            setCode(newCode);

            if (value && index < 5) {
                inputRefs.current[index + 1].focus();
            }
            
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key ==="Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        const verificationCode = code.join('');
        try {
            await verifyEmail(verificationCode);
            navigate('/dashboard');  
            toast.success('Email verified successfully');
        } catch (error) {
            console.log(error);
            
        }
    };
    useEffect(() => {
        if (code.every((digit) => digit !== '')) {
            handleSubmit(new Event('submit'));
        }
    }, [code]);  

    return (
        <div className='max-w-md w-full card overflow-hidden'>
            <motion.div 
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className='card p-8 w-full max-w-md'
            >
                <Logo className='justify-center mb-6' />
            <h2 className='text-xl font-semibold mb-1 text-center text-ink'>
                    Verify Your Email
                </h2>
                <p className='text-center text-muted mb-6'>
                    Enter the 6-digit verification code sent to your email address
                </p>
                <form onSubmit={handleSubmit} className='space-y-6'>
                    <div className='flex justify-between'>
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                type='text'
                                maxLength='6'
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className='w-11 h-12 text-center text-xl font-semibold bg-white rounded-lg border border-line focus:border-accent focus:ring-2 focus:ring-accent/15 text-ink outline-none'
                            />
                        ))}
                    </div>
                    {error && <p className='text-red-600 font-semibold mt-2'>{error}</p>}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type='submit'
                        disabled={isLoading || code.some((digit) => !digit)}
                        className='btn-primary w-full py-2.5 mt-2'
                    >
                        {isLoading ? 'Verifying...' : 'Verify Email'}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    )
}

export default EmailVerificationPage