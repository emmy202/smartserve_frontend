import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Title,
  Card,
  Text,
  Badge,
  Group,
  Button,
  SimpleGrid,
  Skeleton,
  ActionIcon,
  Tooltip,
  Avatar,
  Pagination,
  TextInput,
  SegmentedControl,
  Switch,
  Alert,
  Stack,
  ThemeIcon,
  Paper,
  Divider,
  RingProgress,
  Table,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import {
  IconRefresh,
  IconUser,
  IconHash,
  IconArmchair,
  IconSearch,
  IconClock,
  IconAlertCircle,
  IconChefHat,
  IconFlame,
  IconCircleCheck,
  IconTruckDelivery,
  IconChartBar,
} from '@tabler/icons-react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

function formatCurrency(amount: number) {
  return `RWF ${new Intl.NumberFormat('en-US').format(amount || 0)}`;
}

interface OrderItem {
  id: number;
  quantity: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | string;
  menuItem: { name: string; type: string };
  order: { tableNumber: string | null; id: number; user: { name: string } };
  preparedBy: { name: string } | null;
  createdAt: string;
  preparingAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
}

type QueueFilter = 'ALL' | 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED';
type SortMode = 'OLDEST' | 'NEWEST';

const statusColor: Record<string, string> = {
  PENDING: 'orange',
  PREPARING: 'indigo',
  READY: 'teal',
  DELIVERED: 'gray',
};

const nextStatus: Record<string, string> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'DELIVERED',
};

const nextLabel: Record<string, string> = {
  PENDING: 'Start Preparing',
  PREPARING: 'Mark Ready',
  READY: 'Mark Delivered',
};

function getMinutesSince(date: string) {
  const now = Date.now();
  const then = new Date(date).getTime();
  return Math.max(0, Math.floor((now - then) / 60000));
}

function getUrgency(minutes: number) {
  if (minutes >= 30) return { label: 'Critical', color: 'red', progress: 100 };
  if (minutes >= 20) return { label: 'High', color: 'orange', progress: 75 };
  if (minutes >= 10) return { label: 'Medium', color: 'yellow', progress: 45 };
  return { label: 'Normal', color: 'teal', progress: 20 };
}

function StatCard({
  title,
  value,
  color,
  icon,
}: {
  title: string;
  value: number | string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="lg" p="md">
      <Group justify="space-between" align="center">
        <div>
          <Text size="sm" c="dimmed">
            {title}
          </Text>
          <Text size="xl" fw={800}>
            {value}
          </Text>
        </div>
        <ThemeIcon size={44} radius="xl" color={color} variant="light">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

export default function KitchenQueue() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [viewMode, setViewMode] = useState<'QUEUE' | 'PERFORMANCE'>('QUEUE');
  const [perfDateRange, setPerfDateRange] = useState<[Date | null, Date | null]>([
    dayjs().startOf('week').toDate(),
    new Date()
  ]);
  const [perfData, setPerfData] = useState<any>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QueueFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('OLDEST');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, forceTicker] = useState(0);

  const fetchPerformance = useCallback(async () => {
    if (!perfDateRange[0] || !perfDateRange[1]) return;
    try {
      setPerfLoading(true);
      const start = dayjs(perfDateRange[0]).startOf('day').toISOString();
      const end = dayjs(perfDateRange[1]).endOf('day').toISOString();
      
      const res = await api.get(`/reports/kitchen-sales?start=${start}&end=${end}`);
      setPerfData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setPerfLoading(false);
    }
  }, [perfDateRange]);

  useEffect(() => {
    if (viewMode === 'PERFORMANCE' && perfDateRange[0] && perfDateRange[1]) {
      fetchPerformance();
    }
  }, [viewMode, perfDateRange, fetchPerformance]);

  const fetchQueue = useCallback(async () => {
    try {
      if (viewMode !== 'QUEUE') return;
      setError(null);
      if (!items.length) setLoading(true);

      // Determine item type based on role
      let itemType = 'FOOD';
      if (user?.role === 'BAR_STAFF') itemType = 'DRINK';
      // Admin/Managers see FOOD by default in this queue but can potentially toggle later

      const res = await api.get(`/orders/queue?page=${activePage}&limit=20&type=${itemType}`);
      setItems(res.data.data ?? []);
      setTotalPages(res.data.meta?.totalPages ?? 1);
      setPendingTotal(res.data.meta?.pendingTotal ?? 0);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError('Failed to load kitchen queue. Please try refreshing again.');
    } finally {
      setLoading(false);
    }
  }, [activePage, items.length]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    if (!autoRefresh || viewMode !== 'QUEUE') return;
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchQueue, viewMode]);

  useEffect(() => {
    const clock = setInterval(() => forceTicker((v) => v + 1), 30000);
    return () => clearInterval(clock);
  }, []);

  const advanceStatus = async (item: OrderItem) => {
    const next = nextStatus[item.status];
    if (!next) return;

    setUpdating(item.id);
    try {
      await api.put(`/orders/item/${item.id}/status`, { status: next });
      await fetchQueue();
    } catch (err) {
      console.error(err);
      setError('Unable to update item status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status as keyof typeof acc] = (acc[item.status as keyof typeof acc] || 0) + 1;
        return acc;
      },
      {
        total: 0,
        PENDING: 0,
        PREPARING: 0,
        READY: 0,
        DELIVERED: 0,
      }
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...items]
      .filter((item) => (statusFilter === 'ALL' ? true : item.status === statusFilter))
      .filter((item) => {
        if (!term) return true;

        const waiter = item.order.user?.name?.toLowerCase() ?? '';
        const table = item.order.tableNumber?.toLowerCase() ?? '';
        const itemName = item.menuItem.name?.toLowerCase() ?? '';
        const orderId = String(item.order.id);

        return (
          waiter.includes(term) ||
          table.includes(term) ||
          itemName.includes(term) ||
          orderId.includes(term)
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortMode === 'OLDEST' ? timeA - timeB : timeB - timeA;
      });
  }, [items, search, statusFilter, sortMode]);

  const criticalCount = useMemo(
    () => items.filter((item) => getMinutesSince(item.createdAt) >= 20 && item.status !== 'DELIVERED').length,
    [items]
  );

  const queueTitle = user?.role === 'BAR_STAFF' ? 'Bar Prep Terminal' : 'Kitchen Operations';
  const queueDescription = user?.role === 'BAR_STAFF' 
    ? 'Track drink preparation, manage cocktail orders, and confirm beverage readiness.'
    : 'Track food preparation, reduce wait time, and keep service moving.';

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>{queueTitle}</Title>
          <Text c="dimmed" size="sm" mt={4}>
            {viewMode === 'QUEUE' 
              ? queueDescription
              : 'Analyze preparation revenue and staff performance.'}
          </Text>
        </div>

        <Group gap="sm" align="center">
          {isAdmin && (
            <SegmentedControl
              data={[
                { label: 'Live Queue', value: 'QUEUE' },
                { label: 'Performance', value: 'PERFORMANCE' },
              ]}
              value={viewMode}
              onChange={(val) => setViewMode(val as any)}
            />
          )}

          {viewMode === 'QUEUE' && (
            <>
              <Badge size="lg" color="orange" variant="light">
                {pendingTotal} Pending Total
              </Badge>
              <Switch
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.currentTarget.checked)}
                label="Auto refresh"
              />
              <Tooltip label="Refresh queue now">
                <ActionIcon variant="light" size="lg" onClick={fetchQueue} loading={loading}>
                  <IconRefresh size="1rem" />
                </ActionIcon>
              </Tooltip>
            </>
          )}
        </Group>
      </Group>

      {viewMode === 'PERFORMANCE' ? (
        <Stack gap="lg">
          <Group justify="space-between" align="flex-end">
            <DatePickerInput
              type="range"
              label="Select Date Range"
              placeholder="Pick performance range"
              value={perfDateRange}
              onChange={(val: any) => setPerfDateRange(val)}
              miw={300}
            />
            <Button leftSection={<IconRefresh size="1rem" />} onClick={fetchPerformance} loading={perfLoading} variant="light">
              Refresh Report
            </Button>
          </Group>

          {perfLoading ? (
            <Skeleton height={200} />
          ) : perfData ? (
             <Stack gap="lg">
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <StatCard title="Food Revenue" value={formatCurrency(perfData.totalRevenue)} color="green" icon={<IconChartBar size={20} />} />
                <StatCard title="Food Items Sold" value={perfData.totalItemsSold} color="orange" icon={<IconFlame size={20} />} />
                <StatCard title="Avg. Prep Time" value={perfData.avgPrepTime ? `${perfData.avgPrepTime} min` : 'N/A'} color="indigo" icon={<IconClock size={20} />} />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, lg: 2 }}>
                <Paper withBorder radius="md" p="md">
                  <Title order={4} mb="md">Top Selling Food Items</Title>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Menu Item</Table.Th>
                        <Table.Th ta="center">Quantity Sold</Table.Th>
                        <Table.Th ta="right">Revenue Generated</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {perfData.topItems.slice(0, 10).map((i: any) => (
                        <Table.Tr key={i.name}>
                          <Table.Td fw={600}>{i.name}</Table.Td>
                          <Table.Td ta="center"><Badge variant="light">{i.count}</Badge></Table.Td>
                          <Table.Td ta="right">{formatCurrency(i.revenue)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Paper>
                
                <Paper withBorder radius="md" p="md">
                  <Title order={4} mb="md">Top Kitchen Preparers</Title>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Staff Name</Table.Th>
                        <Table.Th ta="right">Items Prepared</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {perfData.topStaff.map((s: any) => (
                        <Table.Tr key={s.name}>
                          <Table.Td fw={600}>
                            <Group gap="sm">
                              <Avatar size="sm" color="indigo" radius="xl">{s.name.substring(0, 2).toUpperCase()}</Avatar>
                              {s.name}
                            </Group>
                          </Table.Td>
                          <Table.Td ta="right"><Badge color="indigo" variant="light">{s.count}</Badge></Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Paper>
              </SimpleGrid>
            </Stack>
          ) : (
            <Text c="dimmed">No performance data found. Select a date to view sales run.</Text>
          )}
        </Stack>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
            <StatCard title="Visible Items" value={stats.total} color="grape" icon={<IconHash size={20} />} />
        <StatCard title="Pending" value={stats.PENDING} color="orange" icon={<IconClock size={20} />} />
        <StatCard title="Preparing" value={stats.PREPARING} color="indigo" icon={<IconChefHat size={20} />} />
        <StatCard title="Ready" value={stats.READY} color="teal" icon={<IconCircleCheck size={20} />} />
        <StatCard title="Critical Wait" value={criticalCount} color="red" icon={<IconFlame size={20} />} />
      </SimpleGrid>

      <Card withBorder radius="lg" p="md">
        <Group justify="space-between" align="end" wrap="wrap">
          <Group grow style={{ flex: 1 }}>
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder="Search by item, waiter, table, or order ID"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </Group>

          <Group>
            <SegmentedControl
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as QueueFilter)}
              data={[
                { label: 'All', value: 'ALL' },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Preparing', value: 'PREPARING' },
                { label: 'Ready', value: 'READY' },
                { label: 'Delivered', value: 'DELIVERED' },
              ]}
            />
            <SegmentedControl
              value={sortMode}
              onChange={(value) => setSortMode(value as SortMode)}
              data={[
                { label: 'Oldest First', value: 'OLDEST' },
                { label: 'Newest First', value: 'NEWEST' },
              ]}
            />
          </Group>
        </Group>

        <Divider my="md" />

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'} on this page
          </Text>
          <Text size="sm" c="dimmed">
            {lastUpdated ? `Last updated at ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Loading...'}
          </Text>
        </Group>
      </Card>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} radius="md">
          {error}
        </Alert>
      )}

      {loading ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} height={280} radius="lg" />
          ))}
        </SimpleGrid>
      ) : filteredItems.length === 0 ? (
        <Card withBorder radius="lg" p="xl">
          <Text c="dimmed" ta="center">
            No kitchen items match the current filters.
          </Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }}>
          {filteredItems.map((item) => {
            const waitingMinutes = getMinutesSince(item.createdAt);
            const urgency = getUrgency(waitingMinutes);
            const isDelivered = item.status === 'DELIVERED';

            return (
              <Card
                key={item.id}
                shadow="sm"
                padding="lg"
                radius="lg"
                withBorder
                style={{
                  borderLeft: `6px solid var(--mantine-color-${statusColor[item.status] || 'gray'}-6)`,
                  opacity: isDelivered ? 0.65 : 1,
                }}
              >
                <Group justify="space-between" align="flex-start" mb="md">
                  <div>
                    <Group gap="xs" mb={6}>
                      {item.order.tableNumber ? (
                        <Badge size="lg" color="dark" leftSection={<IconArmchair size="0.8rem" />}>
                          Table {item.order.tableNumber}
                        </Badge>
                      ) : (
                        <Badge size="lg" color="gray" leftSection={<IconHash size="0.8rem" />}>
                          Order #{item.order.id}
                        </Badge>
                      )}
                      <Badge size="md" variant="dot" color={statusColor[item.status] || 'gray'}>
                        {item.status}
                      </Badge>
                    </Group>

                    <Group gap={6} c="dimmed">
                      <IconUser size="0.9rem" />
                      <Text size="sm" fw={500}>
                        {item.order.user?.name || 'Unknown waiter'}
                      </Text>
                    </Group>
                  </div>

                  <RingProgress
                    size={68}
                    thickness={7}
                    roundCaps
                    sections={[{ value: urgency.progress, color: urgency.color }]}
                    label={
                      <Stack gap={0} align="center" justify="center" h="100%">
                        <Text fw={900} size="lg" c={urgency.color} lh={1}>
                          {waitingMinutes >= 60 ? `${Math.floor(waitingMinutes / 60)}h` : waitingMinutes}
                        </Text>
                        <Text fw={800} size="9px" tt="uppercase" c="dimmed" lh={1} mt={4}>
                          {waitingMinutes >= 60 ? `${waitingMinutes % 60}m` : 'MIN'}
                        </Text>
                      </Stack>
                    }
                  />
                </Group>

                <Group wrap="nowrap" align="center" mb="md">
                  <Avatar size="lg" radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }} fw={700}>
                    {item.quantity}x
                  </Avatar>

                  <div style={{ flex: 1 }}>
                    <Text size="lg" fw={700} lh={1.2}>
                      {item.menuItem.name}
                    </Text>
                    <Group gap="xs" mt={6}>
                      <Badge color={item.menuItem.type === 'FOOD' ? 'orange' : 'cyan'} size="xs" variant="light">
                        {item.menuItem.type}
                      </Badge>
                      <Badge color={urgency.color} size="xs" variant="light" leftSection={<IconClock size={12} />}>
                        {urgency.label}
                      </Badge>
                    </Group>
                    {item.preparedBy && (
                      <Text size="xs" c="green" fw={600} mt={6}>
                        Prep by: {item.preparedBy.name}
                      </Text>
                    )}
                  </div>
                </Group>

                <div style={{ flex: 1, minHeight: 12 }}></div>

                <Group justify="space-between" mt="auto" align="center">
                  <Group gap="xs">
                    {item.status === 'PENDING' && <ThemeIcon color="orange" variant="light"><IconClock size={16} /></ThemeIcon>}
                    {item.status === 'PREPARING' && <ThemeIcon color="indigo" variant="light"><IconChefHat size={16} /></ThemeIcon>}
                    {item.status === 'READY' && <ThemeIcon color="teal" variant="light"><IconCircleCheck size={16} /></ThemeIcon>}
                    {item.status === 'DELIVERED' && <ThemeIcon color="gray" variant="light"><IconTruckDelivery size={16} /></ThemeIcon>}
                    <Text size="sm" fw={600}>
                      {item.status}
                    </Text>
                  </Group>

                  {nextStatus[item.status] && (
                    <Button
                      size="sm"
                      radius="md"
                      variant="gradient"
                      gradient={
                        item.status === 'PENDING'
                          ? { from: 'indigo', to: 'cyan', deg: 90 }
                          : item.status === 'PREPARING'
                          ? { from: 'teal', to: 'green', deg: 90 }
                          : { from: 'gray', to: 'dark', deg: 90 }
                      }
                      loading={updating === item.id}
                      onClick={() => advanceStatus(item)}
                    >
                      {nextLabel[item.status]}
                    </Button>
                  )}
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {viewMode === 'QUEUE' && totalPages > 1 && (
        <Group justify="center">
          <Pagination value={activePage} onChange={setActivePage} total={totalPages} radius="xl" />
        </Group>
      )}

      {viewMode === 'QUEUE' && (
        <Text c="dimmed" size="xs" ta="right">
          {autoRefresh ? 'Auto-refreshing every 10 seconds' : 'Auto-refresh is paused'}
        </Text>
      )}
      
        </>
      )}
    </Stack>
  );
}
