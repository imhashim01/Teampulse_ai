import React from 'react'

const Input = ({icon: Icon, ...props}) => {
  return (
    <div className='relative mb-4'>
      <div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
        <Icon className='size-4 text-muted' />
      </div>
      <input {...props} className='field pl-9 py-2.5' />
    </div>
  )
}

export default Input
