import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Card, Button, Input, StepWarsLogo, Eye, EyeOff } from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store";
import { register, clearError } from "../store/slices/authSlice";
import { cn } from "../lib/utils";

export default function Register() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

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
    setValidationError("");

    if (password !== confirmPassword) {
      setValidationError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters");
      return;
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    dispatch(register({ name, email, password, timezone }));
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-dvh flex flex-col justify-center px-4 py-12 bg-[var(--color-background)]">
      <div className="max-w-sm mx-auto w-full animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className={cn(
            "w-20 h-20 rounded-[var(--radius-xl)]",
            "bg-black",
            "flex items-center justify-center mx-auto mb-4",
            "shadow-lg shadow-black/30"
          )}>
            <StepWarsLogo className="w-16 h-16 text-[#f5c518]" />
          </div>
          <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">
            Join Step Wars
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Create your account to start competing
          </p>
        </div>

        {/* Register Form */}
        <Card className="animate-slide-up stagger-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />

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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              }
            />

            <Input
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            {displayError && (
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-[14px]">
                {displayError}
              </div>
            )}

            <Button type="submit" fullWidth isLoading={isLoading}>
              Create Account
            </Button>
          </form>
        </Card>

        {/* Sign In Link */}
        <p className="text-center mt-6 text-[var(--color-text-secondary)]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-[var(--color-accent)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
