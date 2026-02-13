# Template Marketplace Components

A comprehensive, beautiful template marketplace with community features, ratings, reviews, and analytics.

## Overview

This marketplace system provides a complete solution for browsing, discovering, and managing workflow templates. It includes advanced search, filtering, community features, and detailed analytics.

## Components

### 1. TemplateGallery

Main marketplace view with grid/list layouts and advanced filtering.

**Features:**
- Grid and list view modes
- Category navigation sidebar
- Advanced filtering (difficulty, pricing, author type, rating)
- Full-text search with autocomplete
- Sorting (popular, recent, rating, installs, name)
- Pagination with infinite scroll support
- Loading skeletons
- Responsive design

**Usage:**
```tsx
import { TemplateGallery } from './components/marketplace';

<TemplateGallery
  onTemplateSelect={(template) => console.log('Selected:', template)}
  initialCategory="business_automation"
  showHeader={true}
/>
```

**Props:**
- `onTemplateSelect?: (template: WorkflowTemplate) => void` - Template selection callback
- `initialCategory?: TemplateCategory` - Initial category filter
- `showHeader?: boolean` - Show/hide header (default: true)

---

### 2. TemplateCard

Beautiful template card with preview, rating, and quick actions.

**Features:**
- Grid view (vertical card)
- List view (horizontal compact)
- Preview images with fallback
- Star ratings display
- Download count, setup time, difficulty badges
- Author badges (official, verified, community)
- Featured badge
- Favorite/like button
- Quick install action
- Hover effects and animations
- Premium/pricing badges

**Usage:**
```tsx
import { TemplateCard } from './components/marketplace';

<TemplateCard
  template={template}
  onClick={() => console.log('View details')}
  onInstall={(template) => console.log('Installing:', template)}
  onFavorite={(template) => console.log('Favorited:', template)}
  compact={false}
  darkMode={false}
/>
```

**Props:**
- `template: WorkflowTemplate` - Template data
- `onClick?: () => void` - Card click handler
- `onInstall?: (template: WorkflowTemplate) => void` - Install action
- `onFavorite?: (template: WorkflowTemplate) => void` - Favorite toggle
- `compact?: boolean` - Use compact list view
- `darkMode?: boolean` - Dark mode styling
- `isFavorited?: boolean` - Initial favorite state

---

### 3. TemplateDetails

Full template details modal with screenshots, reviews, and installation.

**Features:**
- Tabbed interface (Overview, Setup, Reviews, Analytics, Related)
- Screenshot carousel with navigation
- Video demo integration
- Complete documentation display
- Requirements and credentials list
- Tags and metadata
- Installation modal with confirmation
- Favorite and share actions
- Related templates
- Responsive modal design

**Usage:**
```tsx
import { TemplateDetails } from './components/marketplace';

<TemplateDetails
  template={template}
  onClose={() => setShowDetails(false)}
  onInstall={(template) => console.log('Installing:', template)}
  darkMode={false}
/>
```

**Props:**
- `template: WorkflowTemplate` - Template to display
- `onClose: () => void` - Close modal handler
- `onInstall?: (template: WorkflowTemplate) => void` - Install callback
- `darkMode?: boolean` - Dark mode styling

---

### 4. RatingSystem

Complete rating and review system with voting and moderation.

**Features:**
- Rating overview with distribution
- Write review form with pros/cons
- Review filtering (sentiment, verified, sort)
- Star rating component (interactive)
- Helpful/unhelpful voting
- Report review functionality
- Verified install badges
- Review moderation status
- Rating histogram

**Usage:**
```tsx
import { RatingSystem } from './components/marketplace';

<RatingSystem
  templateId="template-123"
  darkMode={false}
  onSubmitReview={(review) => console.log('New review:', review)}
/>
```

**Props:**
- `templateId: string` - Template ID for reviews
- `darkMode?: boolean` - Dark mode styling
- `onSubmitReview?: (review: Partial<TemplateReview>) => void` - Review submission callback

---

### 5. SearchBar

Advanced search with autocomplete and suggestions.

**Features:**
- Real-time search with debouncing
- Autocomplete suggestions
- Recent searches (localStorage)
- Popular searches
- Keyboard navigation (arrow keys, enter, escape)
- Clear search button
- Search history management
- Click outside to close

**Usage:**
```tsx
import { SearchBar } from './components/marketplace';

<SearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  onSearch={(query) => console.log('Search:', query)}
  placeholder="Search templates..."
  darkMode={false}
  showSuggestions={true}
/>
```

**Props:**
- `value: string` - Current search value
- `onChange: (value: string) => void` - Change handler
- `onSearch?: (query: string) => void` - Search submission
- `placeholder?: string` - Input placeholder
- `darkMode?: boolean` - Dark mode styling
- `showSuggestions?: boolean` - Enable suggestions dropdown

---

### 6. CommunityFeatures

User profiles, collections, and social features.

**Features:**
- Trending templates (weekly)
- Top authors showcase
- User profiles with stats
- Follow/unfollow functionality
- Curated template collections
- Achievement badges system
- User analytics
- Social links integration

**Usage:**
```tsx
import { CommunityFeatures } from './components/marketplace';

<CommunityFeatures darkMode={false} />
```

**Props:**
- `darkMode?: boolean` - Dark mode styling

---

### 7. TemplateSubmission

Template creation, publishing, and analytics dashboard.

**Features:**
- Template editor with markdown support
- Screenshot upload (drag & drop)
- Category and tags management
- Documentation sections (overview, setup, usage)
- Video URL integration
- Draft saving
- Submit for review workflow
- My templates management
- Analytics dashboard with charts
- Install metrics and trends

**Usage:**
```tsx
import { TemplateSubmission } from './components/marketplace';

<TemplateSubmission
  darkMode={false}
  onSubmit={(submission) => console.log('Submitted:', submission)}
/>
```

**Props:**
- `darkMode?: boolean` - Dark mode styling
- `onSubmit?: (submission: TemplateSubmission) => void` - Submission callback

---

## Backend APIs

### Reviews API (`/api/reviews`)

```typescript
// GET /api/reviews/:templateId
// Get all reviews for a template
GET /api/reviews/template-123?sortBy=recent&sentiment=positive&verified=true

// POST /api/reviews/:templateId
// Submit a new review
POST /api/reviews/template-123
{
  "rating": 5,
  "title": "Excellent template!",
  "body": "Very useful and well documented",
  "pros": ["Easy to use", "Great support"],
  "cons": []
}

// POST /api/reviews/:templateId/:reviewId/vote
// Vote on a review
POST /api/reviews/template-123/review-456/vote
{
  "helpful": true
}

// POST /api/reviews/:templateId/:reviewId/report
// Report a review
POST /api/reviews/template-123/review-456/report
{
  "reason": "Spam"
}
```

### Templates API (Enhanced)

```typescript
// GET /api/templates
// List templates with filters
GET /api/templates?category=business_automation&difficulty=intermediate&pricing=free&minRating=4

// GET /api/templates/:id/analytics
// Get template analytics
GET /api/templates/template-123/analytics

// POST /api/templates/submissions
// Submit a new template
POST /api/templates/submissions
{
  "name": "My Template",
  "description": "Description",
  "category": "business_automation",
  // ...more fields
}
```

## Types

All TypeScript types are defined in:
- `/src/types/templates.ts` - Base template types
- `/src/types/marketplaceEnhanced.ts` - Enhanced marketplace types

Key types:
- `WorkflowTemplate` - Template data structure
- `TemplateReview` - Review with ratings and voting
- `RatingDistribution` - Rating statistics
- `UserProfile` - Author/user profile
- `TemplateCollection` - Curated collection
- `TemplateAnalytics` - Analytics data
- `TemplateSubmission` - Submission workflow

## Testing

Comprehensive test coverage with Vitest and React Testing Library:

```bash
# Run all marketplace tests
npm run test -- marketplace

# Run specific test file
npm run test -- TemplateGallery.test.tsx

# Run with coverage
npm run test:coverage
```

Test files:
- `TemplateGallery.test.tsx` - Gallery component tests
- `TemplateCard.test.tsx` - Card component tests
- `RatingSystem.test.tsx` - Rating system tests

## Styling

All components use Tailwind CSS with:
- Dark mode support
- Responsive design (mobile, tablet, desktop)
- Accessible (ARIA labels, keyboard navigation)
- Smooth animations and transitions
- Consistent design system

## Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus management
- Screen reader friendly
- Semantic HTML
- Color contrast compliance

## Performance

- Lazy loading of images
- Virtual scrolling for large lists
- Debounced search inputs
- Memoized calculations
- Optimistic UI updates
- Loading skeletons

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] GraphQL integration
- [ ] Real-time notifications
- [ ] Template versioning
- [ ] A/B testing framework
- [ ] Advanced analytics charts
- [ ] Export/import templates
- [ ] Template dependencies
- [ ] Collaborative editing
- [ ] Template comments
- [ ] Social media integration

## Contributing

1. Follow the existing component patterns
2. Add comprehensive tests
3. Update types as needed
4. Maintain dark mode support
5. Ensure accessibility
6. Document new features

## License

See project LICENSE file.
