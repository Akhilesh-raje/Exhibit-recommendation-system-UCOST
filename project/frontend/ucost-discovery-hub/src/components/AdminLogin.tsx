import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lock, User, Key, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/desktop-config';

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminLogin({ isOpen, onClose, onSuccess }: AdminLoginProps) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotCredentials, setShowForgotCredentials] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [newCredentials, setNewCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showCustomPassword, setShowCustomPassword] = useState(false);
  const [secretCodeVerified, setSecretCodeVerified] = useState(false);
  const { toast } = useToast();

  // Master credentials (base64 encoded: adminucost:ucost@2025)
  const masterCredentials = {
    username: 'adminucost',
    password: 'ucost@2025',
    encoded: 'YWRtaW51Y29zdDp1Y29zdEAyMDI1'
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simple credential check for now (can be replaced with API call later)
    setTimeout(() => {
      if (credentials.username === 'admin' && credentials.password === 'ucost@2025') {
        // Store a simple token
        localStorage.setItem('adminToken', 'demo-token');

        toast({
          title: "Welcome Admin!",
          description: "Successfully logged in to admin panel.",
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  // Get current time in 12-hour format for secret code
  const getCurrentTimeCode = () => {
    const now = new Date();
    const hours = now.getHours() % 12 || 12; // Convert to 12-hour format
    const minutes = now.getMinutes();
    return `${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`;
  };

  const handleSecretCodeVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Get current time code
    const currentTimeCode = getCurrentTimeCode();

    try {
      const response = await fetch(`${getApiUrl()}/auth/verify-secret-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secretCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setSecretCodeVerified(true);
        toast({
          title: "Secret Code Verified!",
          description: "You can now set new credentials.",
        });
      } else {
        toast({
          title: "Invalid Secret Code",
          description: data.error || "Please check the current time and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/auth/test-reset-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secretCode: secretCode,
          newUsername: customUsername,
          newPassword: customPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewCredentials({
          username: data.credentials.username,
          password: data.credentials.password
        });

        toast({
          title: "Credentials Set Successfully!",
          description: "Your new credentials have been set.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to set credentials.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCredentials({ username: '', password: '' });
    setSecretCode('');
    setNewCredentials({ username: '', password: '' });
    setCustomUsername('');
    setCustomPassword('');
    setSecretCodeVerified(false);
    setShowForgotCredentials(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Admin Access
          </DialogTitle>
        </DialogHeader>

        {!showForgotCredentials ? (
          // Login Form
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  className="pl-10"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  className="pl-10 pr-10"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-6 w-6 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setShowForgotCredentials(true)}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                <Key className="h-4 w-4 mr-1" />
                Forgot Credentials?
              </Button>
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                <p className="font-mono">YWRtaW51Y29zdDp1Y29zdEAyMDI1</p>
              </div>
            </div>
          </form>
        ) : (
          // Forgot Credentials Form
          <div className="space-y-4">
            {!secretCodeVerified ? (
              // Secret Code Verification Step
              <form onSubmit={handleSecretCodeVerification} className="space-y-4">
                <div className="text-center space-y-2">
                  <Key className="h-8 w-8 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Verify Secret Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the secret code to verify your identity.
                  </p>
                  <p className="text-xs text-blue-600 italic">
                    "A save in time saves nine"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secretCode">Secret Code</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="secretCode"
                      type="password"
                      placeholder="Enter secret code"
                      className="pl-10"
                      value={secretCode}
                      onChange={(e) => setSecretCode(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotCredentials(false)}
                    className="flex-1"
                  >
                    Back to Login
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifying..." : "Verify Secret Code"}
                  </Button>
                </div>
              </form>
            ) : (
              // Credential Input Step
              <form onSubmit={handleForgotCredentials} className="space-y-4">
                <div className="text-center space-y-2">
                  <Key className="h-8 w-8 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Set New Admin Credentials</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the secret code and your desired credentials
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customUsername">New Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customUsername"
                      type="text"
                      placeholder="Enter new username (min 3 characters)"
                      className="pl-10"
                      value={customUsername}
                      onChange={(e) => setCustomUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customPassword"
                      type={showCustomPassword ? "text" : "password"}
                      placeholder="Enter new password (min 6 characters)"
                      className="pl-10 pr-10"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-6 w-6 p-0"
                      onClick={() => setShowCustomPassword(!showCustomPassword)}
                    >
                      {showCustomPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSecretCodeVerified(false)}
                    className="flex-1"
                  >
                    Back to Secret Code
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? "Setting..." : "Set Credentials"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}