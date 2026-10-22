import { Check, X } from 'lucide-react';
import React from 'react'

const PasswordCriteria = ({password}) => {
    const criteria = [
        { label: "At least 6 characters", met: password.length >= 6 },
        { label: "At least one lowercase letter", met: /[a-z]/.test(password) },
        { label: "At least one uppercase letter", met: /[A-Z]/.test(password) },
        { label: "At least one number", met: /\d/.test(password) },
        { label: "At least one special character", met: /[^A-Za-z0-9]/.test(password) }
    ];

    return (
        <div className='mt-2 space-y-1'>
            {criteria.map((item) => (
                <div key={item.label} className='flex items-center text-xs'>
                    {item.met ? (
                        <Check className='size-4 text-accent mr-2' /> 
                    ) : (
                        <X className='size-4 text-[#A3A3A3] mr-2' />
                    )} 
                    <span className={item.met ? 'text-accent' : 'text-[#A3A3A3]'}>
                        {item.label}
                    </span>
                </div>
            ))}
        </div>
    )
}

const PasswordStrengthMeter = ({ password }) => {
    const getstrength = (pass) => {
        let strength = 0;
        if (pass.length > 6) {
            strength++;
        }
        if (pass.match(/[a-z]/) && pass.match(/[A-Z]+/)) {
            strength++;
        }
        if (pass.match(/\d/)) {
            strength++;
        }
        if (pass.match(/[^A-Za-z0-9]+/)) {
            strength++;
        }
        return strength;
    };

    const strength = getstrength(password);

    const getColor = (strength) => {
        if (strength === 0) return 'text-red-600';      // Light blue
        if (strength === 1) return 'text-orange-600';   // Light blue with opacity
        if (strength === 2) return 'text-amber-600';      // Dark purple-blue
        if (strength === 3) return 'text-blue-600';      // Navy blue
        return 'text-emerald-600' ;                          // Darkest base
    };

    const getstrengthText = (strength) => {
        const strengthLabels = {
            0: 'Very Weak',
            1: 'Weak',
            2: 'Fair',
            3: 'Good',
            4: 'Strong'
        };
        return strengthLabels[Math.min(strength, 4)];
    };

    const getBarColor = (index) => {
        const strengthColors = [
            'bg-red-500',    // Very Weak
            'bg-orange-500', // Weak
            'bg-yellow-500', // Fair
            'bg-blue-500',   // Good
            'bg-emerald-500'  // Strong
        ];
        
        if (index < strength) {
            return strengthColors[Math.min(strength, 4)];
        }
        return 'bg-[#E5E3DD]'; // Inactive bars
    };

    return (
        <div className='mt-2'>
        <div className='flex justify-between items-center mb-1 space-x-1'>
            <span className='text-xs text-accent'>Password Strength:</span>
            <span className={`text-xs ${getColor(strength)}`}>
                {getstrengthText(strength)}
            </span>
        </div>

        <div className='flex gap-1.5 mb-4'>
            {[...Array(4)].map((_, index) => (
                <div
                    key={index}
                    className={`h-1 w-1/4 rounded-full transition-all duration-300 ${
                        getBarColor(index)
                    } ${index < strength ? 'opacity-100' : 'opacity-40'}`}
                />
            ))}
        </div>
        
        <PasswordCriteria password={password} />
    </div>
    );
};

export default PasswordStrengthMeter;