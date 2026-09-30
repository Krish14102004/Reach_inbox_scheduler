/**
 * FILE: frontend/src/features/slack/ConnectSlackButton.tsx
 * PHASE: 8 - Frontend Features
 * PURPOSE: Shows Connect / Connected(disconnect) state; starts backend Slack OAuth.
 */

import { Check, Link2, LoaderCircle } from 'lucide-react';
import { slackConnectUrl } from '../../api/slack.api.js';
import { useDisconnectSlack, useSlackStatus } from './useSlackStatus.js';

export function ConnectSlackButton(): JSX.Element {
	const status = useSlackStatus();
	const disconnect = useDisconnectSlack();

	if (status.isLoading) return <button className="secondary-button" disabled><LoaderCircle size={14} className="ui-spin" /> Checking…</button>;
	if (status.data?.connected) {
		return <button className="secondary-button" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}><Check size={15} /> Slack connected · Disconnect</button>;
	}
	return <a className="secondary-button" href={slackConnectUrl()}><Link2 size={15} /> Connect Slack</a>;
}

export default ConnectSlackButton;
