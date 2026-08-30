import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function SignupPage() {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { signUp } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }
        
        if (password.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        try {
            setError('');
            setLoading(true);
            await signUp(email, password, displayName);
            navigate('/');
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please sign in instead.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Please use at least 6 characters.');
            } else if (err.code === 'auth/operation-not-allowed') {
                setError('Email/Password sign-in is not enabled in your Firebase Console.');
            } else {
                setError('Failed to create account. ' + (err.message ? err.message.replace(/^Firebase:\s*/, '') : ''));
            }
        } finally {
            setLoading(false);
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
                        Begin Your<br />Story Today.
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
                <div className="w-full max-w-xl">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex justify-center items-center space-x-2 mb-8">
                        <Icon name="book" className="w-8 h-8 text-gold" />
                        <span className="text-gold font-serif text-3xl">Antarang</span>
                    </div>

                    <div className="bg-midnight border border-gold/20 rounded-xl p-8 shadow-2xl">
                        <h2 className="text-3xl font-serif text-gold mb-2 text-center">Create Your Diary</h2>
                        <p className="text-cream-dark/70 text-center mb-8">Join us to start writing your thoughts</p>

                        {error && (
                            <div className="bg-wine/20 border border-wine text-cream-dark p-3 rounded-lg mb-6 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Horizontal 2-Column Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-cream-dark text-sm mb-1" htmlFor="displayName">Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Icon name="user" className="h-5 w-5 text-gold/60" />
                                        </div>
                                        <Input
                                            id="displayName"
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="w-full pl-10 bg-midnight-light border-gold/30 text-cream focus:border-gold focus:ring-1 focus:ring-gold"
                                            placeholder="How should we call you?"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-cream-dark text-sm mb-1" htmlFor="email">Email</label>
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
                                    <label className="block text-cream-dark text-sm mb-1" htmlFor="password">Password</label>
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
                                            placeholder="Create a password"
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
                                    <p className="text-xs text-cream-dark/50 mt-1">Must be at least 6 characters</p>
                                </div>

                                <div>
                                    <label className="block text-cream-dark text-sm mb-1" htmlFor="confirmPassword">Confirm Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Icon name="lock" className="h-5 w-5 text-gold/60" />
                                        </div>
                                        <Input
                                            id="confirmPassword"
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full pl-10 bg-midnight-light border-gold/30 text-cream focus:border-gold focus:ring-1 focus:ring-gold"
                                            placeholder="Confirm password"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={loading}
                                className="w-full mt-4 bg-gold hover:bg-gold-light text-midnight font-medium py-3 rounded-lg transition-colors flex justify-center items-center"
                            >
                                {loading ? <LoadingSpinner className="h-5 w-5 text-midnight" /> : "Create Account"}
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-cream-dark/70 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-gold hover:text-gold-light font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
