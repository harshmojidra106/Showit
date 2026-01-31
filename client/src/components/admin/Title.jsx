import React from 'react'

const Title = ({text1,text2}) => {
  return (
    // this for all admin page in title
    <h1 className='font-medium text-2xl'>
      {text1} 
      <span  className='pl-1 undeline text-primary'>{text2}</span>
    </h1>
  )
}

export default Title
