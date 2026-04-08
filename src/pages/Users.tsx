import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconMail,
  IconRefresh,
  IconSearch,
  IconShieldLock,
  IconUserPlus,
  IconUsers,
  IconUserStar,
  IconTrash,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import api from '../lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  active?: boolean;
}

type RoleFilter = 'ALL' | 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN_STAFF' | 'BAR_STAFF' | 'CASHIER' | 'RECEPTIONIST';
type SortMode = 'NEWEST' | 'OLDEST' | 'NAME';

const roleColor: Record<string, string> = {
  ADMIN: 'red',
  MANAGER: 'orange',
  WAITER: 'blue',
  KITCHEN_STAFF: 'green',
  BAR_STAFF: 'cyan',
  CASHIER: 'violet',
  RECEPTIONIST: 'pink',
};

const roleOptions = ['ADMIN', 'MANAGER', 'WAITER', 'KITCHEN_STAFF', 'BAR_STAFF', 'CASHIER', 'RECEPTIONIST'];

function StatCard({
  label,
  value,
  helper,
  icon,
  color,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Paper withBorder radius="lg" p="md" shadow="xs">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
          <Text size="xl" fw={800} mt={4}>
            {value}
          </Text>
          <Text size="xs" c="dimmed" mt={6}>
            {helper}
          </Text>
        </div>
        <ThemeIcon size={44} radius="xl" color={color} variant="light">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

import { useSearchParams } from 'react-router-dom';

export default function Users() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('NEWEST');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const s = searchParams.get('search');
    if (s) setSearch(s);
  }, [searchParams]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'WAITER',
  });

  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const fetchUsers = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/users');
      setUsers(res.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchUsers, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchUsers]);

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'WAITER' });
    setFormErrors({});
  };

  const closeModal = () => {
    if (creating) return;
    setModalOpen(false);
    resetForm();
  };

  const validateForm = () => {
    const nextErrors: { name?: string; email?: string; password?: string } = {};

    if (!form.name.trim()) nextErrors.name = 'Full name is required';
    if (!form.email.trim()) nextErrors.email = 'Email is required';
    else if (!validateEmail(form.email)) nextErrors.email = 'Enter a valid email address';
    if (!form.password) nextErrors.password = 'Password is required';
    else if (form.password.length < 6) nextErrors.password = 'Password must be at least 6 characters';

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createUser = async () => {
    if (!validateForm()) return;

    setCreating(true);
    try {
      await api.post('/users', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      notifications.show({
        title: 'Staff Added',
        message: `${form.name} has been successfully registered.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      setModalOpen(false);
      resetForm();
      await fetchUsers();
    } catch (err: any) {
      console.error(err);
      notifications.show({
        title: 'Registration Failed',
        message: err.response?.data?.message || 'Could not create user account. Please try again.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setCreating(false);
    }
  };

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'ADMIN' || u.role === 'MANAGER').length;
    const operations = users.filter((u) => ['WAITER', 'KITCHEN_STAFF', 'BAR_STAFF', 'CASHIER', 'RECEPTIONIST'].includes(u.role)).length;
    const recent = users.filter((u) => Date.now() - new Date(u.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000).length;
    return { total, admins, operations, recent };
  }, [users]);

  const deleteUser = (user: User) => {
    modals.openConfirmModal({
      title: 'Delete Staff Member',
      children: (
        <Text size="sm">
          Are you sure you want to delete <b>{user.name}</b>? This action is permanent and will remove all access for this user.
        </Text>
      ),
      labels: { confirm: 'Delete User', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/users/${user.id}`);
          notifications.show({
            title: 'Account Deleted',
            message: `Staff member ${user.name} has been removed.`,
            color: 'blue',
            icon: <IconTrash size={16} />,
          });
          await fetchUsers();
        } catch (err: any) {
          console.error(err);
          notifications.show({
            title: 'Deletion Blocked',
            message: 'Cannot delete accounts with active transaction history.',
            color: 'red',
            icon: <IconX size={16} />,
          });
        }
      },
    });
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...users]
      .filter((user) => (roleFilter === 'ALL' ? true : user.role === roleFilter))
      .filter((user) => {
        if (!term) return true;
        return (
          String(user.id).includes(term) ||
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.role.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        if (sortMode === 'NAME') return a.name.localeCompare(b.name);
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return sortMode === 'NEWEST' ? bTime - aTime : aTime - bTime;
      });
  }, [users, search, roleFilter, sortMode]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>Users Management</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Manage staff accounts, assign operational roles, and keep access organized across SmartServe HMS.
          </Text>
        </div>

        <Group gap="sm">
          <Switch
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.currentTarget.checked)}
            label="Auto refresh"
          />
          <Tooltip label="Refresh users now">
            <ActionIcon variant="light" size="lg" onClick={fetchUsers} loading={loading}>
              <IconRefresh size="1rem" />
            </ActionIcon>
          </Tooltip>
          <Button leftSection={<IconUserPlus size="1rem" />} onClick={() => setModalOpen(true)}>
            Add User
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard
          label="Total Staff"
          value={String(stats.total)}
          helper="All user accounts in the system"
          color="blue"
          icon={<IconUsers size={20} />}
        />
        <StatCard
          label="Leadership"
          value={String(stats.admins)}
          helper="Admins and managers"
          color="red"
          icon={<IconShieldLock size={20} />}
        />
        <StatCard
          label="Operations Team"
          value={String(stats.operations)}
          helper="Frontline and service staff"
          color="green"
          icon={<IconUserStar size={20} />}
        />
        <StatCard
          label="Recent Adds"
          value={String(stats.recent)}
          helper="Joined in the last 7 days"
          color="violet"
          icon={<IconMail size={20} />}
        />
      </SimpleGrid>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md" withCloseButton onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card withBorder radius="lg" p="md" shadow="xs">
        <Group justify="space-between" align="end" wrap="wrap">
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder="Search by ID, name, email, or role"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            style={{ flex: 1, minWidth: 260 }}
          />

          <Group>
            <Select
              value={roleFilter}
              onChange={(value) => setRoleFilter((value as RoleFilter) || 'ALL')}
              data={[
                { value: 'ALL', label: 'All Roles' },
                ...roleOptions.map((role) => ({ value: role, label: role })),
              ]}
              w={180}
            />
            <Select
              value={sortMode}
              onChange={(value) => setSortMode((value as SortMode) || 'NEWEST')}
              data={[
                { value: 'NEWEST', label: 'Newest First' },
                { value: 'OLDEST', label: 'Oldest First' },
                { value: 'NAME', label: 'Name A–Z' },
              ]}
              w={170}
            />
          </Group>
        </Group>

        <Divider my="md" />

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </Text>
          <Text size="sm" c="dimmed">
            {lastUpdated
              ? `Last updated at ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Loading...'}
          </Text>
        </Group>
      </Card>

      <Paper withBorder radius="lg" shadow="sm" p="xs">
        <Table highlightOnHover verticalSpacing="md" horizontalSpacing="md" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Joined</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <Table.Tr key={i}>
                  {[...Array(6)].map((__, j) => (
                    <Table.Td key={j}>
                      <Skeleton height={18} radius="xl" />
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text ta="center" c="dimmed" py="xl">
                    No users match the current filters.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredUsers.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td fw={700}>#{user.id}</Table.Td>
                  <Table.Td>
                    <Text fw={600}>{user.name}</Text>
                  </Table.Td>
                  <Table.Td c="dimmed">{user.email}</Table.Td>
                  <Table.Td>
                    <Badge color={roleColor[user.role] ?? 'gray'} variant="light">
                      {user.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{new Date(user.createdAt).toLocaleDateString()}</Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Tooltip label="Delete User">
                      <ActionIcon color="red" variant="light" onClick={() => deleteUser(user)}>
                        <IconTrash size="1rem" />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={modalOpen} onClose={closeModal} title="Add New User" centered radius="lg">
        <Stack gap="md">
          <TextInput
            label="Full Name"
            placeholder="Enter staff full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            error={formErrors.name}
          />
          <TextInput
            label="Email"
            type="email"
            placeholder="staff@smartserve.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={formErrors.email}
          />
          <PasswordInput
            label="Password"
            placeholder="Enter temporary password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={formErrors.password}
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(v) => setForm((f) => ({ ...f, role: v ?? 'WAITER' }))}
            data={roleOptions}
            allowDeselect={false}
          />
          <Button fullWidth loading={creating} onClick={createUser} leftSection={<IconUserPlus size={16} />}>
            Create User
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
