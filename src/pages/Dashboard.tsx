// Dashboard.tsx – Cleaned and error‑free implementation
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Card,
  Group,
  Paper,
  Progress,
  RingProgress,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconBed,
  IconChecklist,
  IconClipboardList,
  IconCurrencyDollar,
  IconRefresh,
  IconShoppingCart,
  IconTrendingDown,
  IconTrendingUp,
  IconBuilding,
} from '@tabler/icons-react';
import api from '../lib/api';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Types & default data
// ---------------------------------------------------------------------------
interface Stats {
  todaySales: number;
  actualSales?: number;
  pendingSales?: number;
  roomServiceSales?: number;
  revenueByTable?: { table: string; revenue: number; count: number }[];
  topStaff?: { name: string; count: number }[];
  todayExpenses: number;
  todayRecipeCost?: number;
  realProfit?: number;
  pendingRequests: number;
  roomStatus: Record<string, number>;
}

const defaultStats: Stats = {
  todaySales: 0,
  todayExpenses: 0,
  pendingRequests: 0,
  roomStatus: {},
};

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------
function formatCurrency(amount: number) {
  return `RWF ${new Intl.NumberFormat('en-US').format(amount || 0)}`;
}

function getOccupancyColor(rate: number) {
  if (rate >= 80) return 'green';
  if (rate >= 50) return 'yellow';
  return 'blue';
}

function getOccupancyLabel(rate: number) {
  if (rate >= 80) return 'Strong';
  if (rate >= 50) return 'Moderate';
  return 'Low';
}

function statusColor(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return 'green';
    case 'OCCUPIED':
      return 'red';
    case 'RESERVED':
      return 'blue';
    case 'CLEANING':
      return 'yellow';
    default:
      return 'gray';
  }
}

// ---------------------------------------------------------------------------
// Reusable KPI card component
// ---------------------------------------------------------------------------
function KpiCard({
  title,
  value,
  helper,
  icon,
  color,
  trend,
  onClick,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  color: string;
  trend?: { label: string; direction: 'up' | 'down' | 'neutral' };
  onClick?: () => void;
}) {
  return (
    <Paper 
      withBorder 
      radius="lg" 
      p="md" 
      shadow="xs" 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s ease' }}
      className="dashboard-card"
    >
      <Group gap="sm" mb="sm" wrap="nowrap" align="center">
        <ThemeIcon size={38} radius="md" color={color} variant="light">
          {icon}
        </ThemeIcon>
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          {title}
        </Text>
      </Group>
      
      <div>
        <Text size="xl" fw={800}>
          {value}
        </Text>
        <Text size="xs" c="dimmed" mt={4}>
          {helper}
        </Text>
        {trend && (
          <Group gap={6} mt={8}>
            {trend.direction === 'up' && (
              <IconTrendingUp size={14} color="var(--mantine-color-green-6)" />
            )}
            {trend.direction === 'down' && (
              <IconTrendingDown size={14} color="var(--mantine-color-red-6)" />
            )}
            <Text
              size="xs"
              c={trend.direction === 'up' ? 'green' : trend.direction === 'down' ? 'red' : 'dimmed'}
              fw={600}
            >
              {trend.label}
            </Text>
          </Group>
        )}
      </div>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard component
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError('');
      const start = dayjs().startOf('day').toISOString();
      const end = dayjs().endOf('day').toISOString();
      const [dashRes, kitchenRes] = await Promise.all([
        api.get(`/reports/dashboard?start=${start}&end=${end}`),
        api.get(`/reports/kitchen-sales?start=${start}&end=${end}`)
      ]);
      setStats({ ...dashRes.data, topStaff: kitchenRes.data?.topStaff });
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto‑refresh every 20 s when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchDashboard, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboard]);

  const roomStatus = stats.roomStatus ?? {};

  // Compute aggregated room metrics
  const roomMetrics = useMemo(() => {
    const totalRooms = Object.values(roomStatus).reduce((a, b) => a + b, 0);
    const occupiedRooms = roomStatus['OCCUPIED'] ?? 0;
    const reservedRooms = roomStatus['RESERVED'] ?? 0;
    const availableRooms = roomStatus['AVAILABLE'] ?? 0;
    const cleaningRooms = roomStatus['CLEANING'] ?? 0;
    const activeRooms = occupiedRooms + reservedRooms;
    const occupancyRate = totalRooms ? Math.round((activeRooms / totalRooms) * 100) : 0;
    return {
      totalRooms,
      occupiedRooms,
      reservedRooms,
      availableRooms,
      cleaningRooms,
      activeRooms,
      occupancyRate,
    };
  }, [roomStatus]);


  // Operational alerts based on current data
  const operationalAlerts = useMemo(() => {
    const alerts: { title: string; description: string; color: string; path: string }[] = [];
    if ((stats.pendingRequests ?? 0) > 0) {
      alerts.push({
        title: 'Pending approvals',
        description: `${stats.pendingRequests} request(s) still need action.`,
        color: 'yellow',
        path: '/requests'
      });
    }
    if (roomMetrics.cleaningRooms > 0) {
      alerts.push({
        title: 'Rooms under cleaning',
        description: `${roomMetrics.cleaningRooms} room(s) are unavailable while cleaning is in progress.`,
        color: 'blue',
        path: '/rooms'
      });
    }
    if (roomMetrics.availableRooms <= 2 && roomMetrics.totalRooms > 0) {
      alerts.push({
        title: 'Low room availability',
        description: `Only ${roomMetrics.availableRooms} room(s) remain available.`,
        color: 'red',
        path: '/rooms'
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        title: 'Operations stable',
        description: 'No critical alerts at the moment.',
        color: 'green',
        path: '/dashboard'
      });
    }
    return alerts;
  }, [stats.pendingRequests, roomMetrics]);

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2} className="text-gradient" fw={900}>
            Operations Dashboard
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            A live overview of sales, expenses, requests, and room activity across SmartServe HMS.
          </Text>
        </div>
        <Group gap="sm">
          <Switch checked={autoRefresh} onChange={e => setAutoRefresh(e.currentTarget?.checked ?? false)} label="Auto refresh" />
          <Tooltip label="Refresh dashboard now">
            <ActionIcon variant="light" size="lg" onClick={fetchDashboard} loading={loading}>
              <IconRefresh size="1rem" />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Global error alert */}
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md" withCloseButton onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* KPI cards */}
      {loading ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={110} radius="lg" />
            ))}
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, lg: 3 }}>
            <Skeleton height={320} radius="lg" />
            <Skeleton height={320} radius="lg" />
            <Skeleton height={320} radius="lg" />
          </SimpleGrid>
        </>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            <KpiCard
              title="Today's Potential"
              value={formatCurrency(stats.todaySales)}
              helper="Total expected revenue"
              color="green"
              icon={<IconCurrencyDollar size={20} />}
              trend={{ label: 'Income stream active', direction: 'up' }}
              onClick={() => navigate('/orders')}
            />
            <KpiCard
              title="Today's Expenses"
              value={formatCurrency(stats.todayExpenses)}
              helper="Operational spend recorded today"
              color="orange"
              icon={<IconShoppingCart size={20} />}
              trend={{ label: 'Watch spend levels', direction: 'down' }}
              onClick={() => navigate('/expenses')}
            />
            <KpiCard
              title="Pending Requests"
              value={String(stats.pendingRequests)}
              helper="Requests waiting for approval"
              color="blue"
              icon={<IconClipboardList size={20} />}
              trend={{
                label: stats.pendingRequests > 0 ? 'Needs attention' : 'All clear',
                direction: stats.pendingRequests > 0 ? 'down' : 'up',
              }}
              onClick={() => navigate('/requests')}
            />
            <KpiCard
              title="Real Daily Profit"
              value={formatCurrency(stats.realProfit || 0)}
              helper="Sales minus (Recipe Costs + Expenses)"
              color={(stats.realProfit || 0) >= 0 ? 'teal' : 'red'}
              icon={<IconTrendingUp size={20} />}
              trend={{ 
                label: (stats.realProfit || 0) >= 0 ? 'Profit margin safe' : 'Low margin alert', 
                direction: (stats.realProfit || 0) >= 0 ? 'up' : 'down' 
              }}
              onClick={() => navigate('/reports')}
            />
          </SimpleGrid>

          {/* Room occupancy visualisation */}
          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
            {/* Occupancy ring */}
            <Card withBorder radius="lg" p="md" shadow="xs">
              <Group mb="md" gap="md" align="flex-start" wrap="nowrap">
                <ThemeIcon size={44} radius="md" color="violet" variant="light">
                  <IconBed size={24} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Title order={4}>Room Occupancy</Title>
                  <Text size="sm" c="dimmed" mt={2}>
                    Live room utilization.
                  </Text>
                </div>
              </Group>

              <Stack align="center" gap="md" mt="sm">
                <RingProgress
                  size={160}
                  thickness={16}
                  roundCaps
                  sections={[
                    { value: roomMetrics.totalRooms ? (roomMetrics.occupiedRooms / roomMetrics.totalRooms) * 100 : 0, color: 'red', tooltip: 'Occupied' },
                    { value: roomMetrics.totalRooms ? (roomMetrics.reservedRooms / roomMetrics.totalRooms) * 100 : 0, color: 'blue', tooltip: 'Reserved' },
                    { value: roomMetrics.totalRooms ? (roomMetrics.cleaningRooms / roomMetrics.totalRooms) * 100 : 0, color: 'yellow', tooltip: 'Cleaning' },
                  ]}
                  label={
                    <Stack gap={0} align="center">
                      <Text size="xl" fw={800}>
                        {roomMetrics.occupancyRate}%
                      </Text>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        Active
                      </Text>
                    </Stack>
                  }
                />

                <Group justify="center" gap="xl" w="100%">
                  <Stack gap={0} align="center">
                    <Text size="sm" c="dimmed">Total</Text>
                    <Text fw={700} size="lg">{roomMetrics.totalRooms}</Text>
                  </Stack>
                  <Stack gap={0} align="center">
                    <Text size="sm" c="dimmed">Active</Text>
                    <Text fw={700} size="lg">{roomMetrics.activeRooms}</Text>
                  </Stack>
                  <Stack gap={0} align="center">
                    <Text size="sm" c="dimmed">Health</Text>
                    <Badge color={getOccupancyColor(roomMetrics.occupancyRate)} variant="light" mt={4}>
                      {getOccupancyLabel(roomMetrics.occupancyRate)}
                    </Badge>
                  </Stack>
                </Group>
              </Stack>
            </Card>

            {/* Room status breakdown */}
            <Card withBorder radius="lg" p="md" shadow="xs">
              <Group mb="md" gap="md" align="flex-start" wrap="nowrap">
                <ThemeIcon size={44} radius="md" color="blue" variant="light">
                  <IconBuilding size={24} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Title order={4}>Room Status</Title>
                  <Text size="sm" c="dimmed" mt={2}>
                    Distribution by state.
                  </Text>
                </div>
              </Group>
              <Stack gap="md" onClick={() => navigate('/rooms')} style={{ cursor: 'pointer' }}>
                {Object.entries(roomStatus).length === 0 ? (
                  <Text c="dimmed" size="sm">
                    No data.
                  </Text>
                ) : (
                  Object.entries(roomStatus).map(([status, count]) => {
                    const percent = roomMetrics.totalRooms ? Math.round((count / roomMetrics.totalRooms) * 100) : 0;
                    return (
                      <div key={status}>
                        <Group justify="space-between" mb={6}>
                          <Group gap={8}>
                            <Badge color={statusColor(status)} variant="light">
                              {status}
                            </Badge>
                            <Text size="sm" c="dimmed">
                              {count}
                            </Text>
                          </Group>
                          <Text size="sm" fw={700}>
                            {percent}%
                          </Text>
                        </Group>
                        <Progress value={percent} color={statusColor(status)} radius="xl" />
                      </div>
                    );
                  })
                )}
              </Stack>
            </Card>

            {/* Room/Table Performance Leaderboard */}
            <Card withBorder radius="lg" p="md" shadow="xs">
              <Group mb="md" gap="md" align="flex-start" wrap="nowrap">
                <ThemeIcon size={44} radius="md" color="indigo" variant="light">
                  <IconTrendingUp size={24} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Title order={4}>Location Insights</Title>
                  <Text size="sm" c="dimmed" mt={2}>
                    Top performers today.
                  </Text>
                </div>
              </Group>

              {!stats.revenueByTable || stats.revenueByTable.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                  No billing records.
                </Text>
              ) : (
                <Table striped verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Location</Table.Th>
                      <Table.Th ta="center">Orders</Table.Th>
                      <Table.Th ta="right">Revenue</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {stats.revenueByTable.slice(0, 10).map((row) => (
                      <Table.Tr key={row.table}>
                        <Table.Td fw={600}>
                          {row.table.toLowerCase().includes('room') ? '🏨 ' : '🍽️ '}
                          {row.table}
                        </Table.Td>
                        <Table.Td ta="center">
                          <Badge size="sm" variant="outline" color="gray">
                            {row.count} orders
                          </Badge>
                        </Table.Td>
                        <Table.Td ta="right" fw={700}>
                          {formatCurrency(row.revenue)}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>

            {/* Top Performing Staff Leaderboard */}
            <Card withBorder radius="lg" p="md" shadow="xs">
              <Group mb="md" gap="md" align="flex-start" wrap="nowrap">
                <ThemeIcon size={44} radius="md" color="orange" variant="light">
                  <IconChecklist size={24} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Title order={4}>Team Performance</Title>
                  <Text size="sm" c="dimmed" mt={2}>
                    Most active staff today.
                  </Text>
                </div>
              </Group>

              {!stats.topStaff || stats.topStaff.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                  No staff activity recorded.
                </Text>
              ) : (
                <Table striped verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Staff Name</Table.Th>
                      <Table.Th ta="right">Activities/Orders</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {stats.topStaff.slice(0, 8).map((staff) => (
                      <Table.Tr key={staff.name}>
                        <Table.Td>
                          <Text 
                            fw={700} 
                            c="blue" 
                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => navigate(`/users?search=${staff.name}`)}
                          >
                            {staff.name}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Badge size="md" variant="light" color="blue">
                            {staff.count} items
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            {/* Operational alerts */}
            <Card withBorder radius="lg" p="md" shadow="xs">
              <Group mb="md" gap="md" align="flex-start" wrap="nowrap">
                <ThemeIcon size={44} radius="md" color="red" variant="light">
                  <IconChecklist size={24} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Title order={4}>Operational Alerts</Title>
                  <Text size="sm" c="dimmed" mt={2}>
                    Requiring attention.
                  </Text>
                </div>
              </Group>
              <Stack gap="sm">
                {operationalAlerts.map((alert, index) => (
                  <Paper 
                    key={index} 
                    withBorder 
                    radius="md" 
                    p="sm"
                    onClick={() => navigate(alert.path)}
                    style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
                    className="alert-paper"
                  >
                    <Group justify="space-between" mb={6}>
                      <Text fw={700} size="sm">
                        {alert.title}
                      </Text>
                      <Badge color={alert.color} variant="light">
                        {alert.color === 'green' ? 'Stable' : 'Attention'}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {alert.description}
                    </Text>
                  </Paper>
                ))}
              </Stack>
            </Card>

            <Paper withBorder radius="lg" p="md" shadow="xs">
              <Group justify="space-between" mb="md" align="flex-start">
                <Group gap="md" wrap="nowrap">
                  <ThemeIcon size={44} radius="md" color="teal" variant="light">
                    <IconClipboardList size={24} />
                  </ThemeIcon>
                  <div>
                    <Title order={4}>Operations Snapshot</Title>
                    <Text size="sm" c="dimmed" mt={2}>
                      Core operating values.
                    </Text>
                  </div>
                </Group>
                <Text size="sm" c="dimmed" mt={4}>
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : ''}
                </Text>
              </Group>
              <Table verticalSpacing="md" horizontalSpacing="md" striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Metric</Table.Th>
                    <Table.Th>Value</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>Actual Collected</Table.Td>
                    <Table.Td fw={700} c="green">{formatCurrency(stats.actualSales || 0)}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Expected (Pending)</Table.Td>
                    <Table.Td fw={700} c="orange">{formatCurrency(stats.pendingSales || 0)}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Room Service Total</Table.Td>
                    <Table.Td fw={700} c="cyan">{formatCurrency(stats.roomServiceSales || 0)}</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Paper>
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
}
