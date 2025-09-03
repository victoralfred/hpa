# HPA Management Platform

A modern, comprehensive management interface for the Horizontal Pod Autoscaler (HPA) Platform built with SolidJS, TypeScript, and a custom design system.

## Features

### 🎛️ Complete Management Interface
- **Dashboard** - System overview with metrics and KPIs
- **Certificate Manager** - Issue, revoke, and download SSL/TLS certificates
- **Token Manager** - Create and manage API tokens for agents
- **Session Monitor** - Real-time monitoring of agent connections
- **User Management** - User accounts, roles, and permissions
- **Security Audit** - Comprehensive event logging and security monitoring

### 🎨 Modern UI/UX
- Clean, professional SaaS-style interface
- Responsive design for all device sizes
- Custom component library with consistent design tokens
- Accessible components following WCAG guidelines
- Dark/light theme support (coming soon)

### 🔧 Technical Features
- **SolidJS** - Fast, reactive UI framework
- **TypeScript** - Full type safety throughout
- **Component Architecture** - Reusable, well-structured components
- **API Integration** - Ready for backend integration
- **Real-time Updates** - Live data and session monitoring
- **Form Validation** - Comprehensive validation utilities
- **Export Functionality** - CSV export for audit logs

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your API configuration
   ```

3. **Development Server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:3000` (or next available port)

4. **Build for Production**
   ```bash
   npm run build
   npm run serve
   ```

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── ui/             # Basic UI components (Button, Input, etc.)
│   └── layout/         # Layout components (Header, Sidebar, etc.)
├── pages/              # Application pages
│   ├── Dashboard.tsx   # System overview
│   ├── Certificates.tsx
│   ├── Tokens.tsx
│   ├── Sessions.tsx
│   ├── Users.tsx
│   └── Audit.tsx
├── services/           # API and external services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── styles/             # Global styles and design tokens
└── assets/             # Static assets
```

## Component Library

### UI Components
- **Button** - Multiple variants, sizes, loading states
- **Input** - Text inputs with validation and icons  
- **Card** - Content containers with headers/footers
- **Badge** - Status indicators and labels
- **Modal** - Accessible modal dialogs
- **Table** - Data tables with sorting and pagination
- **LoadingSpinner** - Loading state indicators

### Layout Components
- **Layout** - Main application layout wrapper
- **Header** - Top navigation with user menu
- **Sidebar** - Side navigation with routing

## API Integration

The application includes a complete API service layer in `src/services/api.ts`:

- RESTful API client with authentication
- Type-safe request/response handling
- Error handling and retry logic
- File upload/download support
- Mock data for development

### Configuration

Update `.env` file:
```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## Features Overview

### Dashboard
- System health overview
- Key performance metrics
- Recent activity summaries
- Quick access to critical information

### Certificate Manager
- Issue new SSL/TLS certificates
- View certificate details and status
- Revoke certificates
- Download certificates in various formats
- Expiration monitoring and alerts

### Token Manager  
- Create API tokens with custom permissions
- Rotate existing tokens
- Revoke compromised tokens
- Usage tracking and analytics

### Session Monitor
- Real-time agent connection monitoring
- Session duration and data transfer tracking
- Terminate problematic sessions
- Connection health indicators

### User Management
- Create and manage user accounts
- Role-based access control (Admin, Operator, Viewer)
- User status management (active, suspended, inactive)
- Last login tracking

### Security Audit
- Comprehensive event logging
- Filtering and search capabilities
- Export audit logs to CSV
- Security event categorization
- Real-time monitoring alerts

## Security Features

- Type-safe API communication
- Input validation and sanitization
- Role-based access control
- Audit logging for all actions
- Secure authentication token handling
- XSS and CSRF protection

## Performance

- Lazy loading and code splitting
- Optimized bundle size
- Efficient re-rendering with SolidJS
- Responsive images and assets
- Progressive web app capabilities (coming soon)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run serve` - Preview production build
- `npm run type-check` - Run TypeScript type checking

### Code Style
- ESLint configuration for code quality
- Prettier for consistent formatting
- TypeScript for type safety
- Component-based architecture

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy the `dist/` folder** to your web server
   - Static hosting (Netlify, Vercel, etc.)
   - Docker container
   - Traditional web server

3. **Configure environment variables** for production API endpoints

## Contributing

1. Follow the existing code structure and patterns
2. Add TypeScript types for all new features
3. Include proper error handling
4. Test components thoroughly
5. Update documentation as needed

## Architecture Notes

- **SolidJS** provides excellent performance with fine-grained reactivity
- **Component composition** over inheritance
- **Type-first development** with comprehensive TypeScript coverage
- **Separation of concerns** between UI, business logic, and data
- **Accessibility-first** design approach

## Future Enhancements

- [ ] Dark mode theme support
- [ ] Advanced filtering and search
- [ ] Bulk operations for certificates/tokens
- [ ] Real-time notifications
- [ ] Advanced dashboard widgets
- [ ] Mobile app companion
- [ ] WebSocket integration for real-time updates
- [ ] Advanced reporting and analytics

## License

This project is part of the HPA Platform and follows the same licensing terms.

---

**Built with ❤️ using SolidJS and TypeScript**
