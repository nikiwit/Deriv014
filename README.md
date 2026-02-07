# DerivHR Platform

An AI-powered HR management platform for modern workforce operations.

## Features

- **New Employee Onboarding**: Streamlined onboarding workflow with AI-powered compliance checks
- **Dual Mode Interface**: Choose between Form Mode (structured) or AI Chat Mode (conversational)
- **4-Step Wizard**: Personal Info → Employment → Compliance → Review
- **Real-time Validation**: Instant feedback on form fields
- **AI-Generated Plans**: Personalized onboarding journeys for each employee
- **Employee Management**: Track onboarding progress and status
- **Document Generation**: Smart contracts and compliance documents
- **Leave Management**: Global E-Leave system with approval workflows
- **Workforce Analytics**: AI-driven insights into workforce health
- **Knowledge Base**: Centralized document and policy management

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/nikiwit/Deriv014.git
cd Deriv014
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory and add your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3002`

## Usage

### Login

Access the platform at `http://localhost:3002` and choose your role:

- **HR Admin**: Full access to all HR management features
- **Employee**: Personal dashboard for onboarding, leave, and documents
- **New Employee Onboarding**: Start onboarding without authentication

### New Employee Onboarding

1. Click the **"New Employee Onboarding"** button on the login page
2. Choose between **Form Mode** or **AI Chat Mode**
3. Complete the 4-step wizard:
   - **Personal Info**: Full name and email
   - **Employment**: Role, department, start date, and salary
   - **Compliance**: Nationality and NRIC (for Malaysian employees)
   - **Review**: Verify all information before submission
4. View the success screen with employee details and AI-generated onboarding plan
5. Create another employee or return to login

### Dashboard (HR Admin)

- **Overview**: Executive summary with key metrics
- **Onboarding AI**: Manage employee onboarding journeys
- **Smart Contracts**: Generate employment contracts
- **DerivHR Agents**: AI-powered HR assistance
- **Knowledge Base**: Document and policy management
- **Workforce AI**: Predictive analytics and insights
- **Model Lab**: Train and test AI models
- **E-Leave (Global)**: Leave management system

### Employee Portal

- **Dashboard**: Personal overview and quick actions
- **My Onboarding**: Track and complete onboarding tasks
- **My Leave**: Request and manage leave
- **My Documents**: Access personal documents
- **My Profile**: Update personal information

## Project Structure

```
DerivHR/
├── components/
│   ├── auth/              # Authentication components
│   ├── employee/           # Employee portal components
│   ├── onboarding/         # Onboarding-specific components
│   ├── Dashboard.tsx        # HR Admin dashboard
│   ├── Onboarding.tsx       # Onboarding management
│   └── ...                # Other feature components
├── contexts/
│   └── AuthContext.tsx    # Authentication context
├── services/
│   ├── geminiService.ts    # AI service integration
│   └── ...                # Other services
├── types.ts                # TypeScript type definitions
├── constants.tsx           # App constants and data
├── App.tsx                # Main app component
└── index.html              # HTML entry point
```

## Technologies

- **React 19**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **Lucide React**: Icons
- **Recharts**: Data visualization
- **Google Gemini AI**: AI-powered features

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Environment Variables

- `GEMINI_API_KEY`: Required for AI features (onboarding, document generation, etc.)

## Deployment

The application can be deployed to any static hosting service:

1. Build the application:
```bash
npm run build
```

2. Deploy the `dist` folder to your hosting provider

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.
