# Maxfacts Codebase Overview

## Application Purpose
Maxfacts is a medical content management system (CMS) focused on swallowing and oral feeding difficulties (dysphagia). It provides educational content, interactive assessment tools, and recipe suggestions for healthcare professionals and patients.

## Tech Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** database with Mongoose ODM
- **Handlebars** templating engine for server-side rendering
- **Passport.js** for Google OAuth authentication (restricted to @york.ac.uk emails)

### Frontend
- Server-rendered HTML via Handlebars templates
- **React** components for interactive features (loaded as needed)
- **SCSS/Sass** styling with Bourbon framework
- **Webpack** for bundling client-side JavaScript

### Infrastructure
- **Docker** containerization with multi-stage builds
- **Docker Compose** for local development and staging
- **Nginx** as reverse proxy
- **AWS** deployment (EC2, S3, CloudFront, Route53)
- **Terraform** for infrastructure as code

## Project Structure

```
/
├── app.js                 # Main Express application entry point
├── models/               # MongoDB/Mongoose models
│   ├── content.js        # Main page/article model
│   ├── user.js           # User authentication
│   ├── image.js          # Image asset management
│   ├── video.js          # Video asset management
│   ├── recipe.js         # Recipe content type
│   └── option.js         # System configuration
├── routes/               # Express route handlers
│   ├── index.js          # Main content routing
│   ├── dashboard.js      # Admin interface routes
│   ├── dashboard/        # Dashboard sub-routes
│   ├── search.js         # Search functionality
│   ├── recipes.js        # Recipe browser
│   ├── magic_triangle.js # Interactive questionnaire
│   └── feedback.js       # User feedback system
├── templates/            # Handlebars view templates
│   ├── layouts/          # Page layouts (main, home, dashboard)
│   ├── partials/         # Reusable template components
│   └── *.hbs             # Individual page templates
├── client/               # Frontend JavaScript (webpack builds)
│   ├── editor/           # Slate.js rich text editor
│   ├── magic-triangle/   # React interactive assessment tool
│   ├── recipe-browser/   # React recipe search interface
│   └── multipart-player/ # Custom video player
├── static/               # Static assets (CSS, images, JS)
├── data/                 # MongoDB data
│   └── dump/            # BSON database exports
├── docker-compose.yaml   # Production Docker configuration
├── nginx.conf           # Nginx reverse proxy config
└── package.json         # Node.js dependencies
```

## Key Architecture Patterns

### Express Middleware Stack (app.js)
1. Morgan logging with custom formatters
2. Body parser for form handling
3. MongoDB session store
4. Passport Google OAuth authentication
5. Flash messaging
6. User validation middleware
7. Static file serving

### Content Management
- **Hierarchical URI structure**: Content organized in tree with normalized URLs
- **Content types**: page, directory, alphabetical, level1/2/3
- **Automatic features**: Breadcrumbs, next page suggestions, link validation
- **Rich text editing**: Slate.js editor with restricted HTML tags

### Authentication & Access Control
- Google OAuth2 restricted to @york.ac.uk email addresses
- Session-based authentication with MongoDB store
- Protected dashboard routes require login
- User model tracks permissions and content authorship

## Development Commands

```bash
# Local development with Docker
docker-compose up

# Run tests
npm test

# Build client-side JavaScript
npm run build

# Watch for changes during development
npm run watch
```

## Important Implementation Details

### URI Normalization
- All URIs are normalized: lowercase, dashes instead of spaces/underscores
- Automatic redirects for changed URIs
- Content model tracks previous URIs for updating links

### Content Features
- Full-text search with weighted fields (title > description > body)
- Broken link detection across all content
- Author attribution tracking
- Order/hide controls for navigation
- Further reading associations

### Media Management
- Images and videos stored with S3/CloudFront integration
- Dashboard provides upload/management interface
- Multipart video support for educational content

### Interactive Components
- **Magic Triangle**: React/Redux questionnaire for assessment
- **Recipe Browser**: Search and filter recipes by dietary requirements
- **Rich Text Editor**: Slate.js with custom schema and Word paste normalization

## Environment Variables
Required environment variables (loaded from .env):
- `MONGO_URI`: MongoDB connection string
- `OAUTH_CALLBACK`, `OAUTH_CLIENTID`, `OAUTH_SECRET`: Google OAuth config
- `MAILER_HOST`, `MAILER_PORT`, `MAILER_USER`, `MAILER_PASS`: Email configuration
- `STATIC_FS`: Additional static file directory path

## Testing & Quality
- Test suite using Mocha/Chai
- Tests for models, HTTP endpoints
- Link validation and content integrity checks
- Staging environment with separate Docker Compose config

## Security Considerations
- Authentication restricted to York University emails
- Session-based security with secure MongoDB storage
- HTML sanitization for user-generated content
- Environment variable validation on startup