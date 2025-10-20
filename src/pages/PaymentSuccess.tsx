import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for subscribing! Your subscription is now active.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800">
            You will receive a confirmation email with your subscription details shortly.
          </p>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Session ID: <span className="font-mono">{sessionId}</span>
        </p>
        <Link
          to="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  );
}