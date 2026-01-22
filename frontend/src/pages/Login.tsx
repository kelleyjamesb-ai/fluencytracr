import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function Login() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === "admin") {
            localStorage.setItem("isAuthenticated", "true");
            navigate("/");
        } else {
            setError("Invalid password");
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Left: Brand Side */}
            <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
                <div className="sidebar-brand">
                    <div className="eyebrow font-mono text-primary">Executive Dashboard v1</div>
                    <h1 className="font-sans text-4xl font-bold tracking-tight">FluencyTracr</h1>
                </div>

                <div className="max-w-md">
                    <blockquote className="space-y-6 text-xl font-medium leading-relaxed font-sans">
                        "Signals, not facts. Executive-first and non-punitive by design."
                    </blockquote>
                    <div className="mt-8 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">AI</div>
                        <div>
                            <div className="font-semibold">LearnAIR Intelligence</div>
                            <div className="text-sm text-slate-400">Automated Insights</div>
                        </div>
                    </div>
                </div>

                <div className="text-sm text-slate-500 font-sans">
                    &copy; 2026 LearnAIR. All rights reserved.
                </div>
            </div>

            {/* Right: Login Form */}
            <div className="flex w-full flex-col justify-center bg-slate-50 p-12 lg:w-1/2">
                <div className="mx-auto w-full max-w-sm space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">Welcome back</h2>
                        <p className="mt-2 text-slate-600 font-sans">
                            Enter your password to access the dashboard.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 font-sans">
                                Password
                            </label>
                            <div className="mt-2">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="block w-full rounded-md border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 font-sans"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-red-600 font-medium font-sans">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                className="flex w-full justify-center rounded-md bg-primary px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200 cursor-pointer font-sans"
                            >
                                Sign in
                            </button>
                        </div>
                    </form>

                    <div className="lg:hidden text-center mt-8">
                        <div className="text-xl font-bold text-slate-900">FluencyTracr</div>
                        <p className="text-xs text-slate-500">Signals, not facts.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
