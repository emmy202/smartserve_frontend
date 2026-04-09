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
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconClockHour4,
  IconCoin,
  IconFileDollar,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrendingUp,
  IconX,
  IconRotate2,
  IconPencil,
} from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

interface Expense {
  id: number;
  title: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  user: { name: string; role: string };
  createdAt: string;
  reviewedAt?: string | null;
  decisionNote?: string | null;
  category?: string | null;
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type SortMode = 'NEWEST' | 'OLDEST' | 'HIGHEST';

const statusColor: Record<string, string> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
};

function formatCurrency(amount: number) {
  return `RWF ${new Intl.NumberFormat('en-US').format(amount || 0)}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAgeHours(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(diff / 3600000));
}

function getAgeMeta(hours: number) {
  if (hours >= 24) return { label: 'Aging', color: 'red' };
  if (hours >= 6) return { label: 'Attention', color: 'orange' };
  return { label: 'Fresh', color: 'green' };
}

function StatCard({
  label,
  value,
  helper,
  color,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  color: string;
  icon: React.ReactNode;
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

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [category, setCategory] = useState<string | null>('OPERATIONS');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('NEWEST');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    opened: boolean;
    expense: Expense | null;
    status: 'APPROVED' | 'REJECTED' | '';
  }>({ opened: false, expense: null, status: '' });
  const [decisionNote, setDecisionNote] = useState('');

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchExpenses = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/expenses');
      setExpenses(res.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchExpenses, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchExpenses]);

  const submitExpense = async () => {
    if (!title.trim() || !amount) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/expenses', {
        title: title.trim(),
        amount: Number(amount),
        category,
        note: note.trim(),
      });
      setTitle('');
      setAmount('');
      setCategory('OPERATIONS');
      setNote('');
      await fetchExpenses();
    } catch {
      setError('Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  };

  const openDecisionModal = (expense: Expense, status: 'APPROVED' | 'REJECTED') => {
    setDecisionModal({ opened: true, expense, status });
    setDecisionNote('');
  };

  const closeDecisionModal = () => {
    if (updating) return;
    setDecisionModal({ opened: false, expense: null, status: '' });
    setDecisionNote('');
  };

  const updateStatus = async () => {
    if (!decisionModal.expense || !decisionModal.status) return;
    setUpdating(decisionModal.expense.id);
    try {
      await api.put(`/expenses/${decisionModal.expense.id}/status`, {
        status: decisionModal.status,
        decisionNote: decisionNote.trim(),
      });
      closeDecisionModal();
      await fetchExpenses();
    } catch (err) {
      console.error(err);
      setError('Failed to update expense status');
    } finally {
      setUpdating(null);
    }
  };

  const stats = useMemo(() => {
    return expenses.reduce(
      (acc, exp) => {
        acc.total += 1;
        acc.totalValue += Number(exp.amount || 0);
        if (exp.status === 'PENDING') {
          acc.pending += 1;
          acc.pendingValue += Number(exp.amount || 0);
        }
        if (exp.status === 'APPROVED') acc.approved += 1;
        if (exp.status === 'REJECTED') acc.rejected += 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0, totalValue: 0, pendingValue: 0 }
    );
  }, [expenses]);

  const approvalRate = useMemo(() => {
    const reviewed = stats.approved + stats.rejected;
    if (!reviewed) return 0;
    return Math.round((stats.approved / reviewed) * 100);
  }, [stats]);

  const agingCount = useMemo(() => {
    return expenses.filter((exp) => exp.status === 'PENDING' && getAgeHours(exp.createdAt) >= 6).length;
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...expenses]
      .filter((exp) => (statusFilter === 'ALL' ? true : exp.status === statusFilter))
      .filter((exp) => {
        if (!term) return true;
        return (
          String(exp.id).includes(term) ||
          exp.title.toLowerCase().includes(term) ||
          exp.user?.name?.toLowerCase().includes(term) ||
          exp.user?.role?.toLowerCase().includes(term) ||
          exp.category?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        if (sortMode === 'HIGHEST') return b.amount - a.amount;
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return sortMode === 'NEWEST' ? bTime - aTime : aTime - bTime;
      });
  }, [expenses, search, statusFilter, sortMode]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>Expenses Center</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Submit, review, and approve operational spending with clearer financial visibility.
          </Text>
        </div>

        <Group gap="sm">
          <Switch
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.currentTarget.checked)}
            label="Auto refresh"
          />
          <Tooltip label="Refresh expenses now">
            <ActionIcon variant="light" size="lg" onClick={fetchExpenses} loading={loading}>
              <IconRefresh size="1rem" />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard
          label="Total Expenses"
          value={String(stats.total)}
          helper="All expense records in scope"
          color="blue"
          icon={<IconFileDollar size={20} />}
        />
        <StatCard
          label="Pending Value"
          value={formatCurrency(stats.pendingValue)}
          helper="Awaiting review or approval"
          color="yellow"
          icon={<IconClockHour4 size={20} />}
        />
        <StatCard
          label="Approval Rate"
          value={`${approvalRate}%`}
          helper="Approved among reviewed expenses"
          color="green"
          icon={<IconTrendingUp size={20} />}
        />
        <StatCard
          label="Recorded Spend"
          value={formatCurrency(stats.totalValue)}
          helper="Total value of submitted expenses"
          color="violet"
          icon={<IconCoin size={20} />}
        />
      </SimpleGrid>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md" withCloseButton onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg" verticalSpacing="lg">
        <Card withBorder radius="lg" p="md" shadow="xs" style={{ gridColumn: 'span 1' }}>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={4}>Submit New Expense</Title>
              <Text size="sm" c="dimmed" mt={4}>
                Capture a new operational expense for approval and tracking.
              </Text>
            </div>
            <ThemeIcon size={42} radius="xl" color="blue" variant="light">
              <IconPlus size={20} />
            </ThemeIcon>
          </Group>

          <Stack gap="sm">
            <TextInput
              label="Description"
              placeholder="e.g. Cleaning supplies, fuel, urgent repair"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Select
              label="Category"
              value={category}
              onChange={setCategory}
              data={[
                { value: 'OPERATIONS', label: 'Operations' },
                { value: 'MAINTENANCE', label: 'Maintenance' },
                { value: 'SUPPLIES', label: 'Supplies' },
                { value: 'UTILITIES', label: 'Utilities' },
                { value: 'OTHER', label: 'Other' },
              ]}
              allowDeselect={false}
            />
            <NumberInput
              label="Amount"
              placeholder="0.00"
              min={0}
              decimalScale={2}
              prefix="RWF "
              value={amount}
              onChange={setAmount}
            />
            <Textarea
              label="Note"
              placeholder="Optional context for approvers..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              minRows={4}
            />
            <Button loading={submitting} onClick={submitExpense} disabled={!title.trim() || !amount} leftSection={<IconPlus size={16} />}>
              Submit Expense
            </Button>
          </Stack>
        </Card>

        <Card withBorder radius="lg" p="md" shadow="xs" style={{ gridColumn: 'span 2' }}>
          <Group justify="space-between" align="end" wrap="wrap">
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder="Search by ID, title, requester, role, or category"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              style={{ flex: 1, minWidth: 260 }}
            />

            <Group>
              <SegmentedControl
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
                data={[
                  { label: 'All', value: 'ALL' },
                  { label: 'Pending', value: 'PENDING' },
                  { label: 'Approved', value: 'APPROVED' },
                  { label: 'Rejected', value: 'REJECTED' },
                ]}
              />
              <Select
                value={sortMode}
                onChange={(value) => setSortMode((value as SortMode) || 'NEWEST')}
                data={[
                  { value: 'NEWEST', label: 'Newest First' },
                  { value: 'OLDEST', label: 'Oldest First' },
                  { value: 'HIGHEST', label: 'Highest Amount' },
                ]}
                w={160}
              />
            </Group>
          </Group>

          <Divider my="md" />

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Showing {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} · {agingCount} aging
            </Text>
            <Text size="sm" c="dimmed">
              {lastUpdated
                ? `Last updated at ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Loading...'}
            </Text>
          </Group>
        </Card>
      </SimpleGrid>

      <Paper withBorder radius="lg" shadow="sm" p="xs">
        <Table.ScrollContainer minWidth={1000}>
          <Table highlightOnHover verticalSpacing="md" horizontalSpacing="md" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Requested By</Table.Th>
                <Table.Th>Age</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                <Table.Th>Status</Table.Th>
                {isAdmin && <Table.Th style={{ textAlign: 'center' }}>Decision</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <Table.Tr key={i}>
                    {[...Array(isAdmin ? 8 : 7)].map((__, j) => (
                      <Table.Td key={j}>
                        <Skeleton height={18} radius="xl" />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))
              ) : filteredExpenses.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={isAdmin ? 8 : 7}>
                    <Group justify="center" py="xl">
                      <Text c="dimmed">No expenses found for the current filters.</Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const ageHours = getAgeHours(exp.createdAt);
                  const ageMeta = getAgeMeta(ageHours);

                  return (
                    <Table.Tr key={exp.id}>
                      <Table.Td fw={700}>#{exp.id}</Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {exp.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {exp.category || 'Uncategorized'}
                        </Text>
                        {exp.decisionNote && (
                          <Text size="xs" c="dimmed" mt={4}>
                            Note: {exp.decisionNote}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {exp.user?.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {exp.user?.role}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={ageMeta.color} variant="light">
                          {ageHours}h · {ageMeta.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDateTime(exp.createdAt)}</Text>
                        {exp.reviewedAt && (
                          <Text size="xs" c="dimmed" mt={4}>
                            Reviewed: {formatDateTime(exp.reviewedAt)}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(exp.amount)}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={statusColor[exp.status] || 'gray'} variant="light">
                          {exp.status}
                        </Badge>
                      </Table.Td>
                      {isAdmin && (
                        <Table.Td style={{ textAlign: 'center' }}>
                          {exp.status === 'PENDING' ? (
                            <Group gap="xs" justify="center">
                              <Tooltip label="Approve expense">
                                <ActionIcon
                                  color="green"
                                  variant="light"
                                  size="sm"
                                  loading={updating === exp.id}
                                  onClick={() => openDecisionModal(exp, 'APPROVED')}
                                >
                                  <IconCheck size="0.9rem" />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Reject expense">
                                <ActionIcon
                                  color="red"
                                  variant="light"
                                  size="sm"
                                  loading={updating === exp.id}
                                  onClick={() => openDecisionModal(exp, 'REJECTED')}
                                >
                                  <IconX size="0.9rem" />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          ) : (
                            <Group gap="xs" justify="center">
                               <Badge color={statusColor[exp.status] || 'gray'} variant="light">
                                 {exp.status}
                               </Badge>
                               <Tooltip label="Edit Decision/Note">
                                 <ActionIcon
                                   color="blue"
                                   variant="subtle"
                                   size="sm"
                                   onClick={() => openDecisionModal(exp, exp.status as any)}
                                 >
                                   <IconPencil size="0.9rem" />
                                 </ActionIcon>
                               </Tooltip>
                               <Tooltip label="Reset to Pending">
                                 <ActionIcon
                                   color="gray"
                                   variant="subtle"
                                   size="sm"
                                   loading={updating === exp.id}
                                   onClick={() => {
                                     modals.openConfirmModal({
                                       title: 'Reset Expense Status',
                                       children: <Text size="sm">Are you sure you want to move this expense back to <b>PENDING</b>? Any previous decision will be cleared.</Text>,
                                       labels: { confirm: 'Reset Status', cancel: 'Cancel' },
                                       confirmProps: { color: 'blue' },
                                       onConfirm: async () => {
                                         setUpdating(exp.id);
                                         try {
                                           await api.put(`/expenses/${exp.id}/status`, { status: 'PENDING', decisionNote: '' });
                                           await fetchExpenses();
                                         } catch (err) {
                                           console.error(err);
                                         } finally {
                                           setUpdating(null);
                                         }
                                       }
                                     });
                                   }}
                                 >
                                   <IconRotate2 size="0.9rem" />
                                 </ActionIcon>
                               </Tooltip>
                             </Group>
                          )}
                        </Table.Td>
                      )}
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Modal
        opened={decisionModal.opened}
        onClose={closeDecisionModal}
        title={decisionModal.status === 'APPROVED' ? 'Approve Expense' : 'Reject Expense'}
        centered
        radius="lg"
      >
        {decisionModal.expense && (
          <Stack gap="md">
            <Paper withBorder radius="md" p="md">
              <Group justify="space-between" mb={8}>
                <Text fw={700}>Expense #{decisionModal.expense.id}</Text>
                <Badge color={statusColor[decisionModal.expense.status] || 'gray'} variant="light">
                  {decisionModal.expense.status}
                </Badge>
              </Group>
              <Text size="sm" fw={600}>{decisionModal.expense.title}</Text>
              <Text size="sm" c="dimmed" mt={4}>
                {decisionModal.expense.user?.name} · {decisionModal.expense.user?.role}
              </Text>
              <Text size="lg" fw={800} c="blue" mt={8}>
                {formatCurrency(decisionModal.expense.amount)}
              </Text>
            </Paper>

            <Textarea
              label="Decision Note"
              placeholder="Add a short justification or follow-up instruction..."
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.currentTarget.value)}
              minRows={4}
            />

            <Group justify="flex-end">
              <Button variant="default" onClick={closeDecisionModal} disabled={!!updating}>
                Cancel
              </Button>
              <Button
                color={decisionModal.status === 'APPROVED' ? 'green' : 'red'}
                loading={updating === decisionModal.expense.id}
                onClick={updateStatus}
              >
                {decisionModal.status === 'APPROVED' ? 'Approve Expense' : 'Reject Expense'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Text size="xs" c="dimmed" ta="right">
        {autoRefresh ? 'Auto-refreshing every 20 seconds' : 'Auto-refresh is paused'}
      </Text>
    </Stack>
  );
}
