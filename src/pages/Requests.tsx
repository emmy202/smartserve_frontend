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
  Select,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
  Switch,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconClipboardList,
  IconClockHour4,
  IconFilter,
  IconMessageCircle,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrendingUp,
  IconX,
  IconTools,
  IconCash,
  IconPackage,
  IconRotate2,
  IconPencil,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

interface RequestItem {
  id: number;
  type: 'STOCK' | 'CASH' | 'MAINTENANCE' | string;
  title: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  user: { name: string; role: string };
  createdAt: string;
  reviewedAt?: string | null;
  decisionNote?: string | null;
}

type RequestType = 'ALL' | 'STOCK' | 'CASH' | 'MAINTENANCE';
type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type SortMode = 'NEWEST' | 'OLDEST';

const requestTypeMeta: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  STOCK: { color: 'blue', icon: <IconPackage size={16} />, label: 'Stock Request' },
  CASH: { color: 'green', icon: <IconCash size={16} />, label: 'Cash Request' },
  MAINTENANCE: { color: 'orange', icon: <IconTools size={16} />, label: 'Maintenance Request' },
};

const statusColor: Record<string, string> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAgeMinutes(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

function getAgeMeta(minutes: number) {
  if (minutes >= 1440) return { label: 'Aging', color: 'red' };
  if (minutes >= 240) return { label: 'Delayed', color: 'orange' };
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

export default function Requests() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string | null>('STOCK');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RequestType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('NEWEST');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    opened: boolean;
    request: RequestItem | null;
    status: 'APPROVED' | 'REJECTED' | '';
  }>({ opened: false, request: null, status: '' });
  const [decisionNote, setDecisionNote] = useState('');

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get('/requests');
      setRequests(res.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Sync Failed',
        message: 'Could not fetch requests from the server.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchRequests, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRequests]);

  const submitRequest = async () => {
    if (!type || !title.trim() || !reason.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/requests', { 
        type, 
        title: title.trim(), 
        reason: reason.trim() 
      });
      notifications.show({
        title: 'Request Submitted',
        message: 'Your request has been filed and is awaiting review.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      setTitle('');
      setReason('');
      setType('STOCK');
      await fetchRequests();
    } catch {
      notifications.show({
        title: 'Submission Error',
        message: 'Failed to record your request. Please try again.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openDecisionModal = (request: RequestItem, status: 'APPROVED' | 'REJECTED') => {
    setDecisionModal({ opened: true, request, status });
    setDecisionNote('');
  };

  const closeDecisionModal = () => {
    if (updating) return;
    setDecisionModal({ opened: false, request: null, status: '' });
    setDecisionNote('');
  };

  const updateStatus = async () => {
    if (!decisionModal.request || !decisionModal.status) return;
    setUpdating(decisionModal.request.id);
    try {
      await api.put(`/requests/${decisionModal.request.id}/status`, {
        status: decisionModal.status,
        decisionNote: decisionNote.trim(),
      });
      notifications.show({
        title: decisionModal.status === 'APPROVED' ? 'Request Approved' : 'Request Rejected',
        message: `Decision recorded for request #${decisionModal.request.id}.`,
        color: decisionModal.status === 'APPROVED' ? 'teal' : 'red',
        icon: decisionModal.status === 'APPROVED' ? <IconCheck size={16} /> : <IconX size={16} />,
      });
      closeDecisionModal();
      await fetchRequests();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Action Failed',
        message: 'Could not record your decision. Please try again.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setUpdating(null);
    }
  };

  const stats = useMemo(() => {
    return requests.reduce(
      (acc, req) => {
        acc.total += 1;
        if (req.status === 'PENDING') acc.pending += 1;
        if (req.status === 'APPROVED') acc.approved += 1;
        if (req.status === 'REJECTED') acc.rejected += 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 }
    );
  }, [requests]);

  const agingCount = useMemo(() => {
    return requests.filter((req) => req.status === 'PENDING' && getAgeMinutes(req.createdAt) >= 240).length;
  }, [requests]);

  const approvalRate = useMemo(() => {
    const reviewed = stats.approved + stats.rejected;
    if (!reviewed) return 0;
    return Math.round((stats.approved / reviewed) * 100);
  }, [stats]);

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...requests]
      .filter((req) => (typeFilter === 'ALL' ? true : req.type === typeFilter))
      .filter((req) => (statusFilter === 'ALL' ? true : req.status === statusFilter))
      .filter((req) => {
        if (!term) return true;
        return (
          String(req.id).includes(term) ||
          req.type.toLowerCase().includes(term) ||
          req.status.toLowerCase().includes(term) ||
          req.title.toLowerCase().includes(term) ||
          req.reason.toLowerCase().includes(term) ||
          req.user?.name?.toLowerCase().includes(term) ||
          req.user?.role?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return sortMode === 'NEWEST' ? bTime - aTime : aTime - bTime;
      });
  }, [requests, typeFilter, statusFilter, search, sortMode]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>Requests Center</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Submit internal requests, monitor approval workflow, and keep operational decisions traceable.
          </Text>
        </div>

        <Group gap="sm">
          <Switch
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.currentTarget.checked)}
            label="Auto refresh"
          />
          <Tooltip label="Refresh requests now">
            <ActionIcon variant="light" size="lg" onClick={fetchRequests} loading={loading}>
              <IconRefresh size="1rem" />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard
          label="Total Requests"
          value={String(stats.total)}
          helper="All requests in current scope"
          color="blue"
          icon={<IconClipboardList size={20} />}
        />
        <StatCard
          label="Pending Approval"
          value={String(stats.pending)}
          helper="Awaiting management action"
          color="yellow"
          icon={<IconClockHour4 size={20} />}
        />
        <StatCard
          label="Approval Rate"
          value={`${approvalRate}%`}
          helper="Approved among reviewed requests"
          color="green"
          icon={<IconTrendingUp size={20} />}
        />
        <StatCard
          label="Aging Requests"
          value={String(agingCount)}
          helper="Pending for more than 4 hours"
          color="red"
          icon={<IconAlertCircle size={20} />}
        />
      </SimpleGrid>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          radius="md"
          withCloseButton
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg" verticalSpacing="lg">
        <Card withBorder radius="lg" p="md" shadow="xs" style={{ gridColumn: 'span 1' }}>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={4}>Submit New Request</Title>
              <Text size="sm" c="dimmed" mt={4}>
                Create a request for stock, cash, or maintenance needs.
              </Text>
            </div>
            <ThemeIcon size={42} radius="xl" color="blue" variant="light">
              <IconPlus size={20} />
            </ThemeIcon>
          </Group>

          <Stack gap="sm">
            <Select
              label="Request Type"
              value={type}
              onChange={setType}
              data={[
                { value: 'STOCK', label: 'Stock Request' },
                { value: 'CASH', label: 'Cash Request' },
                { value: 'MAINTENANCE', label: 'Maintenance Request' },
              ]}
              allowDeselect={false}
            />
            <TextInput
              label="Request Title"
              placeholder="E.g. Monthly Stationery, Plumbing Issue, etc."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              label="Reason / Details"
              placeholder="Describe what you need, why it is needed, and any urgency details..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minRows={6}
              autosize
              required
            />
            <Button
              loading={submitting}
              onClick={submitRequest}
              disabled={!title.trim() || !reason.trim()}
              leftSection={<IconMessageCircle size={16} />}
            >
              Submit Request
            </Button>
          </Stack>
        </Card>

        <Card withBorder radius="lg" p="md" shadow="xs" style={{ gridColumn: 'span 2' }}>
          <Group justify="space-between" align="end" wrap="wrap">
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder="Search by ID, requester, role, type, status, or description"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              style={{ flex: 1, minWidth: 260 }}
            />

            <Group>
              <Select
                leftSection={<IconFilter size={14} />}
                value={typeFilter}
                onChange={(value) => setTypeFilter((value as RequestType) || 'ALL')}
                data={[
                  { value: 'ALL', label: 'All Types' },
                  { value: 'STOCK', label: 'Stock' },
                  { value: 'CASH', label: 'Cash' },
                  { value: 'MAINTENANCE', label: 'Maintenance' },
                ]}
                w={150}
              />
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
                ]}
                w={150}
              />
            </Group>
          </Group>

          <Divider my="md" />

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Showing {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
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
                <Table.Th>Type</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Requested By</Table.Th>
                <Table.Th>Age</Table.Th>
                <Table.Th>Date</Table.Th>
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
              ) : filteredRequests.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={isAdmin ? 8 : 7}>
                    <Text ta="center" c="dimmed" py="xl">
                      No requests match the current filters.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredRequests.map((req) => {
                  const ageMinutes = getAgeMinutes(req.createdAt);
                  const ageMeta = getAgeMeta(ageMinutes);
                  const typeMeta = requestTypeMeta[req.type] || {
                    color: 'gray',
                    icon: <IconClipboardList size={16} />,
                    label: req.type,
                  };

                  return (
                    <Table.Tr key={req.id}>
                      <Table.Td fw={700}>#{req.id}</Table.Td>
                      <Table.Td>
                        <Badge color={typeMeta.color} variant="light" leftSection={typeMeta.icon}>
                          {typeMeta.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ minWidth: 300 }}>
                        <Stack gap={4}>
                          <Text fw={800} size="sm" c="blue.9">{req.title}</Text>
                          <Text size="xs" lineClamp={2} c="dimmed" style={{ lineHeight: 1.4 }}>
                            {req.reason}
                          </Text>
                          {req.decisionNote && (
                            <Paper withBorder p={6} radius="sm" bg="yellow.0" style={{ borderLeft: '3px solid var(--mantine-color-yellow-5)' }} mt={4}>
                              <Text size="xs" fw={700} c="yellow.9">Management Feedback:</Text>
                              <Text size="xs" c="yellow.9" fs="italic">{req.decisionNote}</Text>
                            </Paper>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {req.user?.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {req.user?.role}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={ageMeta.color} variant="light">
                          {ageMinutes >= 1440 ? `${Math.floor(ageMinutes / 1440)} day(s)` : `${ageMinutes} min`} · {ageMeta.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDateTime(req.createdAt)}</Text>
                        {req.reviewedAt && (
                          <Text size="xs" c="dimmed" mt={4}>
                            Reviewed: {formatDateTime(req.reviewedAt)}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={statusColor[req.status] || 'gray'} variant="light">
                          {req.status}
                        </Badge>
                      </Table.Td>
                      {isAdmin && (
                        <Table.Td style={{ textAlign: 'center' }}>
                          {req.status === 'PENDING' ? (
                            <Group gap="xs" justify="center">
                              <Tooltip label="Approve request">
                                <ActionIcon
                                  color="green"
                                  variant="light"
                                  size="sm"
                                  loading={updating === req.id}
                                  onClick={() => openDecisionModal(req, 'APPROVED')}
                                >
                                  <IconCheck size="0.9rem" />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Reject request">
                                <ActionIcon
                                  color="red"
                                  variant="light"
                                  size="sm"
                                  loading={updating === req.id}
                                  onClick={() => openDecisionModal(req, 'REJECTED')}
                                >
                                  <IconX size="0.9rem" />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          ) : (
                            <Group gap="xs" justify="center">
                              <Badge color={statusColor[req.status] || 'gray'} variant="light">
                                {req.status}
                              </Badge>
                              <Tooltip label="Edit Decision/Note">
                                <ActionIcon
                                  color="blue"
                                  variant="subtle"
                                  size="sm"
                                  onClick={() => openDecisionModal(req, req.status as any)}
                                >
                                  <IconPencil size="0.9rem" />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Reset to Pending">
                                <ActionIcon
                                  color="gray"
                                  variant="subtle"
                                  size="sm"
                                  loading={updating === req.id}
                                  onClick={() => {
                                    modals.openConfirmModal({
                                      title: 'Reset Request Status',
                                      children: <Text size="sm">Are you sure you want to move this request back to <b>PENDING</b>? Any previous decision will be cleared.</Text>,
                                      labels: { confirm: 'Reset Status', cancel: 'Cancel' },
                                      confirmProps: { color: 'blue' },
                                      onConfirm: async () => {
                                        setUpdating(req.id);
                                        try {
                                          await api.put(`/requests/${req.id}/status`, { status: 'PENDING', decisionNote: '' });
                                          await fetchRequests();
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
        title={decisionModal.status === 'APPROVED' ? 'Approve Request' : 'Reject Request'}
        centered
        radius="lg"
      >
        {decisionModal.request && (
          <Stack gap="md">
            <Paper withBorder radius="md" p="md">
              <Group justify="space-between" mb={8}>
                <Text fw={700}>Request #{decisionModal.request.id}</Text>
                <Badge color={statusColor[decisionModal.request.status] || 'gray'} variant="light">
                  {decisionModal.request.status}
                </Badge>
              </Group>
              <Text fw={700}>{decisionModal.request.title}</Text>
              <Text size="sm" c="dimmed" mb={4}>
                {decisionModal.request.user?.name} · {decisionModal.request.user?.role}
              </Text>
              <Text size="sm">{decisionModal.request.reason}</Text>
            </Paper>

            <Textarea
              label="Decision Note"
              placeholder="Add a brief justification or instruction for this decision..."
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
                loading={updating === decisionModal.request.id}
                onClick={updateStatus}
              >
                {decisionModal.status === 'APPROVED' ? 'Approve Request' : 'Reject Request'}
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
