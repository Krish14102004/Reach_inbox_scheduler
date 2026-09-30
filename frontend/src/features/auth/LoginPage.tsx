/**
 * FILE: frontend/src/features/auth/LoginPage.tsx
 * PHASE: 8 - Frontend Features
 * PURPOSE: Login screen per Figma with 'Continue with Google' -> backend OAuth start URL.
 */

import { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { loginUrl } from '../../api/auth.api.js';

export default function LoginPage(): JSX.Element {
	const [redirecting, setRedirecting] = useState(false);

	return (
		<main className="login-page">
			<section className="login-panel" aria-labelledby="login-title">
				<div className="brand-lockup brand-lockup-centered">
					<span className="brand-mark"><Mail size={17} strokeWidth={2.5} /></span>
					<span>reachinbox</span>
				</div>
				<h1 id="login-title">Login</h1>
				<p className="login-intro">Continue to your scheduled inbox</p>
				<button
					className="google-login"
					disabled={redirecting}
					onClick={() => {
						setRedirecting(true);
						window.location.assign(loginUrl());
					}}
				>
					<span className="google-g" aria-hidden="true">G</span>
					{redirecting ? 'Connecting to Google…' : 'Login with Google'}
					{!redirecting && <ArrowRight size={16} />}
				</button>
				<p className="login-note">Secure sign-in with your Google account</p>
			</section>
			<div className="login-footnote">ReachInbox Scheduler <span>•</span> Reliable outreach, on your time</div>
		</main>
	);
}
