import { useState } from 'react';
import {
  TextInput, PasswordInput, Paper, Title, Text, Container, Button, Alert, Group, Anchor
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../lib/api';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        setAuth({ token: res.data.access_token, user: res.data.user });
        navigate('/dashboard');
      } else if (mode === 'register') {
        const res = await api.post('/auth/register', { name, email, password, role: 'WAITER' });
        setAuth({ token: res.data.access_token, user: res.data.user });
        navigate('/dashboard');
      } else if (mode === 'reset') {
        await api.post('/auth/reset-password', { email, newPassword: password });
        setSuccess('Password updated successfully. Please log in.');
        setMode('login');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    login: 'Sign in to SmartServe',
    register: 'Create an Account',
    reset: 'Reset Password',
  };

  return (
    <Container size={420} my={100}>
      <Title ta="center" fw={900}>
        SmartServe HMS
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        {titles[mode]}
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} color="red" mb="md">
            {error}
          </Alert>
        )}
        {success && (
          <Alert icon={<IconAlertCircle size="1rem" />} color="green" mb="md">
            {success}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <TextInput
              label="Full Name"
              placeholder="Your name"
              required
              mb="md"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <TextInput
            label="Email"
            placeholder="you@smartserve.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordInput
            label={mode === 'reset' ? "New Password" : "Password"}
            placeholder="Your password"
            required
            mt="md"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button fullWidth mt="xl" type="submit" loading={loading} color={mode === 'reset' ? 'red' : 'blue'}>
            {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Register' : 'Reset Password'}
          </Button>
        </form>

        <Group justify="center" mt="md">
          {mode === 'login' ? (
            <>
              <Anchor size="xs" onClick={() => setMode('register')}>
                Create account
              </Anchor>
              <Text size="xs" c="dimmed">•</Text>
              <Anchor size="xs" onClick={() => setMode('reset')}>
                Forgot password?
              </Anchor>
            </>
          ) : (
            <Anchor size="xs" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
              Back to Sign in
            </Anchor>
          )}
        </Group>

        {mode === 'login' && (
          <Text size="xs" c="dimmed" ta="center" mt="md">
            Default Admin: admin@smartserve.com / admin123
          </Text>
        )}
      </Paper>
    </Container>
  );
}
