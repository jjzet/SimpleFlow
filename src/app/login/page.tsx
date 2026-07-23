import { LoginForm } from '@/components/auth/login-form';
import Logo from '../../components/logo';
import DotGrid from '@/components/ui/dot-grid';

export default function LoginPage() {
  return (
    <div
      className="relative min-h-screen"
      style={{ backgroundColor: '#2F3437' }}
    >
      <div className="absolute inset-0 z-0">
        <DotGrid
          dotSize={4}
          gap={12}
          baseColor="#555555"
          activeColor="#FF5500"
          proximity={120}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
        />
      </div>
      <div className="auth-page relative z-10">
        <div className="auth-container">
          <div className="auth-card bg-background/80 backdrop-blur-sm">
            <div className="auth-header">
              <Logo className="auth-logo" />
              <h1 className="text-2xl font-semibold tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
