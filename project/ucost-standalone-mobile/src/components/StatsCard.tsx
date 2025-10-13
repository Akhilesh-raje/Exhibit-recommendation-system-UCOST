import React from 'react'

interface StatsCardProps {
  title: string
  value: string
  icon: string
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon }) => {
  return (
    <div className="mobile-card text-center p-4">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-primary-600 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  )
}

export default StatsCard 