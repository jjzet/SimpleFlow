import { SignUpForm } from '@/components/auth/signup-form';
import Logo from '../../components/logo';

export default function SignUpPage() {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <Logo className="auth-logo" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Create account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your details to get started
            </p>
          </div>
          <SignUpForm />
        </div>
      </div>
    </div>
  );
}
