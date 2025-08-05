import React from 'react'

interface HelloWorldProps {
  name?: string
}

const HelloWorld: React.FC<HelloWorldProps> = ({ name = 'World' }) => {
  return (
    <div>
      <h2>Hello, {name}!</h2>
      <p>This is a test component to verify the development environment.</p>
    </div>
  )
}

export default HelloWorld
