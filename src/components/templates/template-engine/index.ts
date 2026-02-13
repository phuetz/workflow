// Types
export * from './types';

// Data
export { TEMPLATE_CATEGORIES, INTELLIGENT_TEMPLATES } from './templateData';

// Components
export { default as TemplateCard, getDifficultyColor } from './TemplateCard';
export { default as TemplateSearch } from './TemplateSearch';
export { default as TemplateCategories } from './TemplateCategories';
export { default as TemplateSuggestions } from './TemplateSuggestions';
export { default as TemplateDetail } from './TemplateDetail';
export { default as TemplateGrid } from './TemplateGrid';

// Hooks
export { useTemplates } from './useTemplates';
export type { UseTemplatesReturn } from './useTemplates';
