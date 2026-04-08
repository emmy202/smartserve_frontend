import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateInput } from '@mantine/dates';
import dayjs from 'dayjs';
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
  Select,
  SegmentedControl,
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
  ScrollArea,
  Tabs,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCash,
  IconClock,
  IconCreditCard,
  IconCurrencyDollar,
  IconReceipt2,
  IconRefresh,
  IconSearch,
  IconPlus,
  IconTrash,
  IconHistory,
  IconListCheck,
} from '@tabler/icons-react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

interface Order {
  id: number;
  tableNumber: string | null;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string | null;
  createdAt: string;
  user: { name: string };
  cashier?: { name: string } | null;
  items: { menuItem: { name: string; price: number }; quantity: number }[];
  payments: { method: string; amount: number }[];
}

type SortMode = 'OLDEST' | 'NEWEST' | 'HIGHEST';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

function formatCurrency(amount: number) {
  return `RWF ${new Intl.NumberFormat('en-US').format(amount || 0)}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getWaitingMinutes(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

function getWaitingMeta(minutes: number) {
  if (minutes >= 30) return { label: 'Urgent', color: 'red' };
  if (minutes >= 15) return { label: 'Attention', color: 'orange' };
  return { label: 'Normal', color: 'green' };
}

function StatCard({
  label,
  value,
  icon,
  color,
  helper,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  helper?: string;
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
          {helper && (
            <Text size="xs" c="dimmed" mt={6}>
              {helper}
            </Text>
          )}
        </div>
        <ThemeIcon size={42} radius="xl" color={color} variant="light">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

export default function Cashier() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [history, setHistory] = useState<Order[]>([]);
  const [summary, setSummary] = useState<{ paidToday: number, unpaidTotal: number, paymentMethodBreakdown: { method: string, amount: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('OLDEST');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterMethod, setFilterMethod] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | null>(new Date());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [useSplitPayment, setUseSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ id: string, method: string, amount: number }[]>([]);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  const { user } = useAuthStore();
  const isCashier = user?.role === 'CASHIER';
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchOrders = useCallback(async () => {
    try {
      setError('');
      const [ordersRes, summaryRes] = await Promise.all([
        api.get('/orders'),
        api.get('/orders/daily-summary')
      ]);
      const all: Order[] = ordersRes.data || [];
      setOrders(all.filter(o => o.paymentStatus === 'UNPAID'));
      setHistory(all.filter(o => o.paymentStatus === 'PAID').slice(0, 50));
      setSummary(summaryRes.data);
      setLastUpdated(new Date());
    } catch {
      setError('Failed to load data from server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...orders]
      .filter((order: Order) => {
        if (!term) return true;

        const waiter = order.user?.name?.toLowerCase() ?? '';
        const table = order.tableNumber?.toLowerCase() ?? '';
        const items = order.items.map((i) => i.menuItem.name.toLowerCase()).join(' ');
        return (
          String(order.id).includes(term) ||
          waiter.includes(term) ||
          table.includes(term) ||
          items.includes(term)
        );
      })
      .sort((a: Order, b: Order) => {
        if (sortMode === 'HIGHEST') return b.totalAmount - a.totalAmount;
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return sortMode === 'OLDEST' ? aTime - bTime : bTime - aTime;
      });
  }, [orders, search, sortMode]);

  const totalDue = useMemo(() => {
    return orders.reduce((sum: number, order: Order) => sum + Number(order.totalAmount || 0), 0);
  }, [orders]);

  const urgentCount = useMemo(() => {
    return orders.filter((order: Order) => getWaitingMinutes(order.createdAt) >= 15).length;
  }, [orders]);

  const filteredHistory = useMemo(() => {
    let result = [...history];
    const term = search.trim().toLowerCase();

    if (term) {
      result = result.filter(o => 
        String(o.id).includes(term) ||
        o.user?.name?.toLowerCase().includes(term) ||
        o.cashier?.name?.toLowerCase().includes(term)
      );
    }

    if (filterMethod && filterMethod !== 'null') {
      result = result.filter(o => 
        o.paymentMethod === filterMethod || 
        (o.payments && o.payments.some(p => p.method === filterMethod))
      );
    }

    if (dateFilter) {
      const d = dayjs(dateFilter).format('YYYY-MM-DD');
      result = result.filter(o => dayjs(o.createdAt).format('YYYY-MM-DD') === d);
    }

    return result;
  }, [history, search, filterMethod, dateFilter]);

  const averageTicket = useMemo(() => {
    if (!orders.length) return 0;
    return totalDue / orders.length;
  }, [orders, totalDue]);

  const openPaymentModal = (order: Order) => {
    setSelectedOrder(order);
    setPaymentMethod('CASH');
    setUseSplitPayment(false);
    setSplitPayments([{ id: '1', method: 'CASH', amount: order.totalAmount }]);
  };

  const closePaymentModal = () => {
    if (paying) return;
    setSelectedOrder(null);
  };

  const receivePayment = async () => {
    if (!selectedOrder) return;

    setPaying(selectedOrder.id);
    try {
      await api.put(`/orders/${selectedOrder.id}/payment`, {
        paymentStatus: 'PAID',
        paymentMethod: useSplitPayment ? 'SPLIT' : paymentMethod,
        splitPayments: useSplitPayment ? splitPayments.map(({ method, amount }) => ({ method, amount })) : undefined
      });
      setSelectedOrder(null);
      await fetchOrders();
    } catch {
      setError('Failed to process payment');
    } finally {
      setPaying(null);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" wrap="wrap">
        <div>
          <Title order={2} fw={800} c="blue.9" style={{ letterSpacing: '-0.5px' }}>
            Cashier Dashboard
          </Title>
          <Text c="dimmed" size="sm" fw={500}>
            Daily closing overview and terminal point of sale
          </Text>
        </div>

        <Group gap="sm">
          <Button 
            leftSection={<IconReceipt2 size={18} />} 
            variant="filled" 
            color="blue"
            radius="md"
            onClick={() => navigate('/orders')}
          >
            New Order
          </Button>
          <Divider orientation="vertical" mx="xs" visibleFrom="xs" />
          <Switch
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.currentTarget.checked)}
            label="Auto refresh"
            size="xs"
          />
          <Tooltip label="Refresh now">
            <ActionIcon variant="light" size="lg" radius="md" onClick={fetchOrders} loading={loading}>
              <IconRefresh size="1rem" />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: isAdminOrManager ? 4 : 2 }}>
        <StatCard
          label="Unpaid Orders"
          value={String(orders.length)}
          helper={`${formatCurrency(summary?.unpaidTotal || 0)} outstanding`}
          color="green"
          icon={<IconReceipt2 size={20} />}
        />
        <StatCard
          label="Urgent Queue"
          value={String(urgentCount)}
          helper="Orders waiting more than 15 minutes"
          color="orange"
          icon={<IconClock size={20} />}
        />
        {isAdminOrManager && (
          <>
            <StatCard
              label="Collected Today"
              value={formatCurrency(summary?.paidToday || 0)}
              helper="Total received payments today"
              color="blue"
              icon={<IconCash size={20} />}
            />
            <StatCard
              label="Average Ticket"
              value={formatCurrency(averageTicket)}
              helper="Avg. unpaid order amount"
              color="violet"
              icon={<IconCreditCard size={20} />}
            />
          </>
        )}
      </SimpleGrid>

      {isAdminOrManager && summary && summary.paymentMethodBreakdown.length > 0 && (
        <Paper withBorder radius="lg" p="md" shadow="xs">
          <Group justify="space-between" mb="xs">
            <Text fw={700} size="sm">Today's Payment Breakdown</Text>
            <Badge variant="dot">Daily Closing Data</Badge>
          </Group>
          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            {summary.paymentMethodBreakdown.map((item, idx) => (
              <div key={idx}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{item.method.replace('_', ' ')}</Text>
                <Text fw={800} size="lg">{formatCurrency(item.amount)}</Text>
              </div>
            ))}
          </SimpleGrid>
        </Paper>
      )}

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

      <Card withBorder radius="lg" p="md" shadow="xs">
        <Group justify="space-between" align="end" wrap="wrap">
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder="Search by order, waiter, table, or item"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            style={{ flex: 1, minWidth: 260 }}
          />

          <Group gap="xs">
            <DateInput 
              placeholder="Date"
              value={dateFilter}
              onChange={(val) => setDateFilter(val as Date | null)}
              style={{ width: 140 }}
              maxDate={new Date()}
              clearable
            />
            <Select 
              placeholder="Method"
              data={[{ value: 'null', label: 'All Methods' }, ...PAYMENT_METHODS]}
              value={filterMethod}
              onChange={setFilterMethod}
              style={{ width: 150 }}
              clearable
            />
            <SegmentedControl
              value={sortMode}
              onChange={(value) => setSortMode(value as SortMode)}
              data={[
                { label: 'Oldest', value: 'OLDEST' },
                { label: 'Newest', value: 'NEWEST' },
                { label: 'Highest', value: 'HIGHEST' },
              ]}
            />
          </Group>
        </Group>

        <Divider my="md" />

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </Text>
          <Text size="sm" c="dimmed">
            {lastUpdated
              ? `Last updated at ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Loading...'}
          </Text>
        </Group>
      </Card>

      <Tabs defaultValue="pending" variant="pills" radius="md">
        <Tabs.List mb="md">
          <Tabs.Tab value="pending" leftSection={<IconListCheck size={16} />}>
            Pending Orders ({orders.length})
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
            Payment History {isCashier && <Badge size="xs" color="violet" ml={4}>My Shift Only</Badge>}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pending">
          <Paper withBorder radius="lg" shadow="sm" p="xs">
            <ScrollArea>
              <Table highlightOnHover verticalSpacing="md" horizontalSpacing="md" striped style={{ minWidth: 800 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Order #</Table.Th>
                    <Table.Th>Table</Table.Th>
                    <Table.Th>Waiter</Table.Th>
                    <Table.Th>Items Summary</Table.Th>
                    <Table.Th>Time</Table.Th>
                    <Table.Th>Wait</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <Table.Tr key={i}>
                        {[...Array(8)].map((__, j) => (
                          <Table.Td key={j}>
                            <Skeleton height={18} radius="xl" />
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))
                  ) : filteredOrders.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={8}>
                        <Text ta="center" c="dimmed" py="xl">
                          No pending payments found.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const waitingMinutes = getWaitingMinutes(order.createdAt);
                      const waitingMeta = getWaitingMeta(waitingMinutes);
      
                      return (
                        <Table.Tr key={order.id}>
                          <Table.Td fw={700}>#{order.id}</Table.Td>
                          <Table.Td>{order.tableNumber ? `Table ${order.tableNumber}` : '—'}</Table.Td>
                          <Table.Td>{order.user?.name ?? '—'}</Table.Td>
                          <Table.Td>
                            <Tooltip label={order.items.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', ')}>
                              <Text size="sm" truncate maw={200}>
                                {order.items.map(i => i.menuItem.name).join(', ')}
                              </Text>
                            </Tooltip>
                          </Table.Td>
                          <Table.Td>{formatTime(order.createdAt)}</Table.Td>
                          <Table.Td>
                            <Badge color={waitingMeta.color} variant="light">
                              {waitingMinutes} min · {waitingMeta.label}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--mantine-color-blue-6)' }}>
                            {formatCurrency(order.totalAmount)}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Button size="xs" color="green" onClick={() => openPaymentModal(order)}>
                              Receive Payment
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <Paper withBorder radius="lg" shadow="sm" p="xs">
            <ScrollArea>
              <Table highlightOnHover verticalSpacing="md" horizontalSpacing="md" striped style={{ minWidth: 800 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Order #</Table.Th>
                    <Table.Th>Time Paid</Table.Th>
                    <Table.Th>Total Collected</Table.Th>
                    <Table.Th>Payment Methodology (Splits)</Table.Th>
                    <Table.Th>Waiter</Table.Th>
                    <Table.Th ta="right">Approved By</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredHistory.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={6}>
                        <Stack align="center" py={40} gap="xs">
                          <IconHistory size={24} color="gray" />
                          <Text c="dimmed" size="sm">No matching history records</Text>
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    filteredHistory.map((order) => (
                      <Table.Tr 
                        key={order.id} 
                        onClick={() => setViewingOrder(order)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Table.Td fw={700}>#{order.id}</Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </Text>
                        </Table.Td>
                        <Table.Td fw={800} c="green.7">{formatCurrency(order.totalAmount)}</Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            {order.payments && order.payments.length > 0 ? (
                              <>
                                {order.payments.length > 1 && (
                                  <Badge variant="filled" color="orange" size="xs" radius="sm">SPLIT</Badge>
                                )}
                                {order.payments.map((p, i) => (
                                  <Tooltip key={i} label={`Detailed tracking for ${p.method}`}>
                                    <Badge variant="light" size="sm" radius="md" color={p.method === 'CASH' ? 'green' : 'blue'}>
                                      <Group gap={2}>
                                        <Text size="xs" fw={700}>{p.method.replace('_', ' ')}: </Text>
                                        <Text size="xs">{formatCurrency(p.amount)}</Text>
                                      </Group>
                                    </Badge>
                                  </Tooltip>
                                ))}
                              </>
                            ) : (
                              <Badge variant="outline" size="sm" color="gray">
                                {order.paymentMethod || 'Direct Payment'}
                              </Badge>
                            )}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{order.user?.name}</Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Badge variant="light" color="violet" size="sm">
                            {order.cashier?.name || 'System'}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={!!selectedOrder}
        onClose={closePaymentModal}
        title={<Text fw={900} size="lg">Official Receipt / Bill</Text>}
        centered
        radius="lg"
        size="md"
        shadow="xl"
      >
        {selectedOrder && (
          <Stack gap="xl">
            {/* Receipt Header */}
            <Paper p="md" radius="md" style={{ background: 'var(--mantine-color-gray-0)', border: '1px dashed var(--mantine-color-gray-4)' }}>
              <Stack gap={4} align="center">
                <Text fw={800} size="xl" tt="uppercase" lts={1}>SmartServe HMS</Text>
                <Text size="xs" c="dimmed">Quality Hospitality Solutions</Text>
              </Stack>
              
              <Divider my="md" label="Order Details" labelPosition="center" />
              
              <SimpleGrid cols={2} spacing="xs">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Order Number</Text>
                  <Text fw={700}>#{selectedOrder.id}</Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Time Issued</Text>
                  <Text fw={700}>{formatTime(selectedOrder.createdAt)}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Location</Text>
                  <Text fw={700}>{selectedOrder.tableNumber ? `Room/Table ${selectedOrder.tableNumber}` : 'General'}</Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Staff</Text>
                  <Text fw={700}>{selectedOrder.user?.name ?? 'System'}</Text>
                </div>
              </SimpleGrid>
            </Paper>

            {/* Bill Table */}
            <div>
              <Group justify="space-between" mb="xs">
                <Text fw={800} size="sm" tt="uppercase">Description</Text>
                <Text fw={800} size="sm" tt="uppercase">Subtotal</Text>
              </Group>
              <Divider mb="sm" />
              
              <Stack gap="sm">
                {selectedOrder.items.map((item, index) => (
                  <Group key={index} justify="space-between" align="flex-start" wrap="nowrap">
                    <div>
                      <Text size="sm" fw={600}>{item.menuItem.name}</Text>
                      <Text size="xs" c="dimmed">
                        {item.quantity} x {formatCurrency(item.menuItem.price)}
                      </Text>
                    </div>
                    <Text size="sm" fw={700}>
                      {formatCurrency(item.menuItem.price * item.quantity)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </div>

            <Paper p="md" radius="md" bg="blue.0">
              <Group justify="space-between">
                <Title order={3} fw={900}>Grand Total</Title>
                <Title order={3} fw={900} c="blue.7">
                  {formatCurrency(selectedOrder.totalAmount)}
                </Title>
              </Group>
            </Paper>

            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" fw={700}>Payment Mode</Text>
                <Switch 
                  label="Split Payment" 
                  checked={useSplitPayment} 
                  onChange={(e) => setUseSplitPayment(e.currentTarget.checked)}
                />
              </Group>

              {!useSplitPayment ? (
                <Select
                  label="Select Method"
                  placeholder="Choose how guest is paying"
                  data={PAYMENT_METHODS}
                  value={paymentMethod}
                  onChange={(value) => setPaymentMethod(value || 'CASH')}
                  allowDeselect={false}
                  size="md"
                  radius="md"
                  leftSection={<IconCash size={18} />}
                />
              ) : (
                <Stack gap="xs">
                  {splitPayments.map((p, idx) => (
                    <Group key={p.id} gap="xs" grow>
                      <Select 
                        data={PAYMENT_METHODS} 
                        value={p.method} 
                        onChange={(val) => {
                          const newSplits = [...splitPayments];
                          newSplits[idx].method = val || 'CASH';
                          setSplitPayments(newSplits);
                        }}
                      />
                      <NumberInput 
                        prefix="RWF "
                        value={p.amount} 
                        onChange={(val) => {
                          const newSplits = [...splitPayments];
                          newSplits[idx].amount = Number(val);
                          setSplitPayments(newSplits);
                        }}
                      />
                      <ActionIcon 
                         color="red" 
                         variant="light" 
                         onClick={() => setSplitPayments(splitPayments.filter(s => s.id !== p.id))}
                         disabled={splitPayments.length <= 1}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  ))}
                  <Button 
                    variant="light" 
                    size="compact-xs" 
                    leftSection={<IconPlus size={14} />}
                    onClick={() => setSplitPayments([...splitPayments, { id: Date.now().toString(), method: 'MOMO', amount: 0 }])}
                  >
                    Add Payment Option
                  </Button>
                  
                  {(() => {
                    const allocated = splitPayments.reduce((sum, p) => sum + p.amount, 0);
                    const diff = selectedOrder.totalAmount - allocated;
                    return (
                      <Paper p="xs" radius="sm" bg={diff === 0 ? 'green.0' : 'red.0'} withBorder>
                        <Group justify="space-between">
                          <Text size="xs" fw={700}>{diff === 0 ? 'Fully Allocated' : 'Balance Remaining'}</Text>
                          <Text size="xs" fw={700} c={diff === 0 ? 'green.8' : 'red.8'}>{formatCurrency(diff)}</Text>
                        </Group>
                      </Paper>
                    );
                  })()}
                </Stack>
              )}

              <Group grow mt="lg">
                <Button variant="subtle" color="gray" onClick={closePaymentModal} disabled={!!paying}>
                  Close
                </Button>
                <Button 
                  size="md" 
                  color="green" 
                  radius="md"
                  loading={paying === selectedOrder.id} 
                  disabled={useSplitPayment && splitPayments.reduce((sum, p) => sum + p.amount, 0) !== selectedOrder.totalAmount}
                  onClick={receivePayment}
                  leftSection={<IconCurrencyDollar size={18} />}
                >
                  Finalize Payment
                </Button>
              </Group>
            </Stack>
          </Stack>
        )}
      </Modal>

      {/* History Detail Modal */}
      <Modal
        opened={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        title={<Text fw={900}>Payment Audit Details</Text>}
        size="lg"
        radius="lg"
      >
        {viewingOrder && (
          <Stack gap="md">
            <Paper withBorder p="md" radius="md" bg="gray.0">
              <Group justify="space-between" mb="xs">
                <Text fw={700} size="lg">Order #{viewingOrder.id}</Text>
                <Badge size="lg" variant="filled" color="green">PAID</Badge>
              </Group>
              <SimpleGrid cols={2} spacing="xs">
                <Text size="sm"><b>Time:</b> {new Date(viewingOrder.createdAt).toLocaleString()}</Text>
                <Text size="sm" ta="right"><b>Table:</b> {viewingOrder.tableNumber || 'N/A'}</Text>
                <Text size="sm"><b>Waiter:</b> {viewingOrder.user?.name}</Text>
                <Text size="sm" ta="right"><b>Cashier:</b> {viewingOrder.cashier?.name || 'System'}</Text>
              </SimpleGrid>
            </Paper>

            <Text fw={700} size="sm">Original Items</Text>
            <Paper withBorder p="xs" radius="md">
              <Table variant="unstyled" verticalSpacing="xs">
                <Table.Tbody>
                  {viewingOrder.items.map((item, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{item.quantity}x {item.menuItem.name}</Table.Td>
                      <Table.Td ta="right">{formatCurrency(item.menuItem.price * item.quantity)}</Table.Td>
                    </Table.Tr>
                  ))}
                  <Table.Tr fw={800}>
                    <Table.Td>TOTAL AMOUNT</Table.Td>
                    <Table.Td ta="right">{formatCurrency(viewingOrder.totalAmount)}</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Paper>

            <Divider label="Payment Breakdown" labelPosition="center" />
            
            <Stack gap="xs">
              {viewingOrder.payments && viewingOrder.payments.length > 0 ? (
                viewingOrder.payments.map((p, i) => (
                  <Paper key={i} withBorder p="sm" radius="md" bg={p.method === 'CASH' ? 'green.0' : 'blue.0'}>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <ThemeIcon color={p.method === 'CASH' ? 'green' : 'blue'} variant="light" size="sm">
                          {p.method === 'CASH' ? <IconCash size={12} /> : <IconCreditCard size={12} />}
                        </ThemeIcon>
                        <Text fw={700} size="sm">{p.method.replace('_', ' ')}</Text>
                      </Group>
                      <Text fw={800}>{formatCurrency(p.amount)}</Text>
                    </Group>
                  </Paper>
                ))
              ) : (
                <Paper withBorder p="sm" radius="md" bg="gray.0">
                  <Group justify="space-between">
                    <Text fw={700} size="sm">{viewingOrder.paymentMethod || 'UNKNOWN'}</Text>
                    <Text fw={800}>{formatCurrency(viewingOrder.totalAmount)}</Text>
                  </Group>
                </Paper>
              )}
            </Stack>

            <Button fullWidth variant="light" color="blue" mt="md" onClick={() => setViewingOrder(null)}>
              Close Audit View
            </Button>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
