import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            FinanceFlow
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Take control of your finances with intelligent tracking and insights
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" variant="outline">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg">
                Get Started Free
              </Button>
            </Link>
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-lg shadow-lg">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Smart Analytics</h3>
              <p className="text-gray-600">
                Get insights into your spending patterns with AI-powered analytics
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-lg">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Budget Tracking</h3>
              <p className="text-gray-600">
                Set budgets and track your progress with real-time alerts
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-lg">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">Bank-Level Security</h3>
              <p className="text-gray-600">
                Your data is encrypted and secure with industry-standard protection
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
