import React from 'react'

const Input = ({icon: Icon, ...props}) => {
  return (
    <div className='relative mb-6'>
      <div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
        <Icon className='size-5 text-[#7d98d1]' />
      </div>
      <input
        {...props}
        className='w-full pl-10 pr-3 py-2 bg-[#0e0b21] bg-opacity-70 rounded-lg border border-[#282354] focus:border-[#7d98d1] focus:ring-2 focus:ring-[#7d98d1] text-white placeholder-gray-400 transition duration-200'
      />
    </div>
  )
}

export default Input