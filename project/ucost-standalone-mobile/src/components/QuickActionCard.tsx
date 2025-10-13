import React from 'react'

interface QuickActionCardProps {
  title: string
  icon: string
  onClick: () => void
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, icon, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="touch-button w-full text-center p-4 rounded-lg transition-all duration-200 hover:bg-primary-700 active:scale-95"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium">{title}</div>
    </button>
  )
}

export default QuickActionCard 