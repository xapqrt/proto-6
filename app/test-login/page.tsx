// Simple test login page
"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestLoginPage() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTestLogin = async () => {
    setLoading(true);
    try {
      console.log('Testing login with:', { email, password });
      const response = await fetch('/api/test/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const text = await response.text();
      console.log('Raw response:', text);
      
      try {
        const data = JSON.parse(text);
        setResult({
          status: response.status,
          statusText: response.statusText,
          data
        });
      } catch (e) {
        setResult({
          status: response.status,
          statusText: response.statusText,
          rawText: text
        });
      }
    } catch (error) {
      console.error('Test login error:', error);
      setResult({
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegularLogin = async () => {
    setLoading(true);
    try {
      console.log('Testing regular login with:', { email, password });
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const text = await response.text();
      console.log('Raw response:', text);
      
      try {
        const data = JSON.parse(text);
        setResult({
          status: response.status,
          statusText: response.statusText,
          data
        });
      } catch (e) {
        setResult({
          status: response.status,
          statusText: response.statusText,
          rawText: text
        });
      }
    } catch (error) {
      console.error('Regular login error:', error);
      setResult({
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md pt-10">
      <Card>
        <CardHeader>
          <CardTitle>Login Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block mb-1">Email</label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">Password</label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleTestLogin} disabled={loading}>
              {loading ? 'Loading...' : 'Test Login API'}
            </Button>
            <Button onClick={handleRegularLogin} disabled={loading} variant="outline">
              {loading ? 'Loading...' : 'Try Regular Login'}
            </Button>
          </div>
          
          {result && (
            <div className="mt-4 border rounded p-4 bg-slate-50">
              <h3 className="text-lg font-medium">Response:</h3>
              <pre className="mt-2 text-sm overflow-auto max-h-60">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}