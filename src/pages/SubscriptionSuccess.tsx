import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Subscription Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for subscribing. Your subscription is now active.
        </p>
        {sessionId && (
          <p className="text-xs text-gray-400 mb-6 font-mono">
            Session: {sessionId.substring(0, 20)}...
          </p>
        )}
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}