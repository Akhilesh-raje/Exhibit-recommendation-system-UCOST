import React from 'react'

interface Exhibit {
  id: string
  name: string
  category: string
  location: string
  imageUrl: string
  description: string
}

interface ExhibitCardProps {
  exhibit: Exhibit
}

const ExhibitCard: React.FC<ExhibitCardProps> = ({ exhibit }) => {
  return (
    <div className="mobile-card p-4">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <img
            src={exhibit.imageUrl}
            alt={exhibit.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {exhibit.name}
          </h4>
          <p className="text-xs text-gray-500 mb-1">
            {exhibit.category} • {exhibit.location}
          </p>
          <p className="text-xs text-gray-600 line-clamp-2">
            {exhibit.description}
          </p>
        </div>
        <div className="flex-shrink-0">
          <button className="text-primary-600 hover:text-primary-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExhibitCard 