import React from 'react';
import { Download } from 'lucide-react';
import { IntelligentTemplate } from './types';
import { getDifficultyColor } from './TemplateCard';

interface TemplateDetailProps {
  template: IntelligentTemplate;
  onBack: () => void;
  onApply: (template: IntelligentTemplate) => void;
}

export default function TemplateDetail({ template, onBack, onApply }: TemplateDetailProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-purple-600 hover:text-purple-700 mb-4"
        >
          Retour aux templates
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">{template.name}</h3>
            <p className="text-gray-600 mb-4">{template.description}</p>
            <div className="flex items-center space-x-4 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm ${getDifficultyColor(template.difficulty)}`}>
                {template.difficulty}
              </span>
              <span className="text-sm text-gray-600">
                {template.estimatedTime}min
              </span>
              <span className="text-sm text-gray-600">
                ${template.estimatedCost}/mois
              </span>
              <span className="text-sm text-gray-600">
                {template.optimizationScore}% optimise
              </span>
            </div>
          </div>
          <button
            onClick={() => onApply(template)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Utiliser ce template</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">Cas d'usage</h4>
          <ul className="text-sm text-green-700 space-y-1">
            {template.useCases.map((useCase, index) => (
              <li key={index}>{useCase}</li>
            ))}
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Prerequis</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            {template.requirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-semibold text-purple-800 mb-2">Benefices</h4>
          <ul className="text-sm text-purple-700 space-y-1">
            {template.benefits.map((benefit, index) => (
              <li key={index}>{benefit}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="font-semibold mb-3">Metriques de performance</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{template.optimizationScore}%</div>
            <div className="text-sm text-gray-600">Optimisation</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{template.reliability}%</div>
            <div className="text-sm text-gray-600">Fiabilite</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{template.popularity}%</div>
            <div className="text-sm text-gray-600">Popularite</div>
          </div>
        </div>
      </div>
    </div>
  );
}
