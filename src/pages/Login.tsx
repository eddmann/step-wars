import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  Card,
  Button,
  Input,
  StepWarsLogo,
  Eye,
  EyeOff,
} from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store";
import { login, clearError } from "../store/slices/authSlice";

export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error } = useAppSelector(
    (state) => state.auth,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(login({ email, password }));
  };

  return (
    <div className="min-h-dvh flex flex-col justify-center px-4 py-12 bg-[var(--color-background)]">
      <div className="max-w-sm mx-auto w-full animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-[var(--radius-xl)] flex items-center justify-center mx-auto mb-4"
            style={{
              backgroundColor: "var(--color-logo-bg)",
              border: "1px solid var(--color-logo-border)",
              boxShadow: "var(--color-logo-shadow)",
            }}
          >
            <StepWarsLogo
              className="w-16 h-16"
              style={{ color: "var(--color-logo-text)" }}
            />
          </div>
          <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">
            Step Wars
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Welcome back!
          </p>
        </div>

        {/* Login Form */}
        <Card className="animate-slide-up stagger-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              }
            />

            {error && (
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-[14px]">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth isLoading={isLoading}>
              Sign In
            </Button>
          </form>
        </Card>

        {/* Sign Up Link */}
        <p className="text-center mt-6 text-[var(--color-text-secondary)]">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-[var(--color-accent)] hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
