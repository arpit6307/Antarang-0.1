import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');

    const { signIn, resetPassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            await signIn(email, password);
            navigate('/');
        } catch (err) {
            setError('Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            setResetMessage('');
            setError('');
            await resetPassword(resetEmail);
            setResetMessage('Check your inbox for further instructions.');
        } catch (err) {
            setError('Failed to reset password.');
        }
    };

    return (
        <div className="flex min-h-screen bg-midnight font-sans">
            {/* Left side panel (Desktop only) */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-midnight">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-full bg-midnight-light/30 border-l border-gold/10 transform skew-x-12 translate-x-16"></div>
                
                <div className="relative z-10 flex items-center space-x-3">
                    <Icon name="book" className="w-8 h-8 text-gold" />
                    <span className="text-gold font-serif text-2xl tracking-wide">Antarang</span>
                </div>
                
                <div className="relative z-10 max-w-md mx-auto flex flex-col items-center text-center">
                    <Icon name="quill" className="w-32 h-32 text-gold-light mb-8 opacity-80" />
                    <h1 className="text-5xl font-serif text-cream mb-6 leading-tight">
                        Your Life,<br />Beautifully Penned.
                    </h1>
                    <p className="text-xl text-gold-light font-serif italic">
                        अंतरंग — a diary as close as your own heart
                    </p>
                </div>
                
                <div className="relative z-10">
                    <Footer />
                </div>
            </div>

            {/* Right side form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 bg-midnight-light border-l border-gold/20">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex justify-center items-center space-x-2 mb-10">
                        <Icon name="book" className="w-8 h-8 text-gold" />
                        <span className="text-gold font-serif text-3xl">Antarang</span>
                    </div>

                    <div className="bg-midnight border border-gold/20 rounded-xl p-8 shadow-2xl">
                        <h2 className="text-3xl font-serif text-gold mb-2 text-center">Welcome Back</h2>
                        <p className="text-cream-dark/70 text-center mb-8">Sign in to continue your journey</p>

                        {error && (
                            <div className="bg-wine/20 border border-wine text-cream-dark p-3 rounded-lg mb-6 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-cream-dark text-sm mb-2" htmlFor="email">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Icon name="mail" className="h-5 w-5 text-gold/60" />
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 bg-midnight-light border-gold/30 text-cream focus:border-gold focus:ring-1 focus:ring-gold"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-cream-dark text-sm" htmlFor="password">Password</label>
                                    <button 
                                        type="button"
                                        onClick={() => setShowResetModal(true)}
                                        className="text-xs text-gold hover:text-gold-light transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Icon name="lock" className="h-5 w-5 text-gold/60" />
                                    </div>
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 bg-midnight-light border-gold/30 text-cream focus:border-gold focus:ring-1 focus:ring-gold"
                                        placeholder="Enter your password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gold/60 hover:text-gold"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        <Icon name={showPassword ? "eye-off" : "eye"} className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-gold hover:bg-gold-light text-midnight font-medium py-3 rounded-lg transition-colors flex justify-center items-center"
                            >
                                {loading ? <LoadingSpinner className="h-5 w-5 text-midnight" /> : "Sign In"}
                            </Button>
                        </form>

                        <p className="mt-8 text-center text-cream-dark/70 text-sm">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-gold hover:text-gold-light font-medium transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Password Reset Modal */}
            <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="Reset Password">
                <div className="p-6 bg-midnight-light">
                    <p className="text-cream-dark mb-4 text-sm">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                    
                    {resetMessage && (
                        <div className="bg-green-900/30 border border-green-500/50 text-green-200 p-3 rounded-lg mb-4 text-sm">
                            {resetMessage}
                        </div>
                    )}
                    
                    <form onSubmit={handleResetPassword}>
                        <div className="mb-4">
                            <Input
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="w-full bg-midnight border-gold/30 text-cream focus:border-gold"
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <Button 
                                type="button" 
                                onClick={() => setShowResetModal(false)}
                                className="px-4 py-2 text-cream-dark hover:text-cream"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit"
                                className="px-6 py-2 bg-gold hover:bg-gold-light text-midnight rounded-lg font-medium"
                            >
                                Send Link
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}
