
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Modal,
  Notification,
  NumberInput,
  Pagination,
  Paper,
  Progress,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconAlertCircle,
  IconCheck,
  IconHistory,
  IconList,
  IconMinus,
  IconPlus,
  IconReceipt2,
  IconRefresh,
  IconSearch,
  IconShoppingCart,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  type: string;
  category: { name: string };
  available: boolean;
  stockQuantity: number;
  trackStock: boolean;
}

interface TicketItem {
  item: MenuItem;
  qty: number;
  note?: string;
}

interface Room {
  id: number;
  number: string;
  type: string;
  status: string;
}

interface OrderItemHistory {
  id: number;
  quantity: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  preparingAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  preparedBy?: { name: string } | null;
  menuItem: { name: string };
}

interface HistoryOrder {
  id: number;
  tableNumber: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItemHistory[];
  user?: { name: string };
  cashier?: { name: string } | null;
}

type ViewMode = 'create' | 'history';
type SortMode = 'NAME' | 'PRICE_ASC' | 'PRICE_DESC';

const ITEMS_PER_PAGE = 10;
const TABLE_OPTIONS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'Bar', 'Takeaway'];
const typeColor: Record<string, string> = { FOOD: 'orange', DRINK: 'cyan', ROOM_SERVICE: 'violet' };
const statusColor: Record<string, string> = {
  PENDING: 'red',
  PREPARING: 'yellow',
  IN_PROGRESS: 'yellow',
  READY: 'green',
  DELIVERED: 'gray',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

function formatCurrency(amount: number) {
  return `RWF ${new Intl.NumberFormat('en-US').format(amount || 0)}`;
}

function formatTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getMinutesSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 60000));
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
        <ThemeIcon size={42} radius="xl" color={color} variant="light">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

export default function Orders() {
  const [view, setView] = useState<ViewMode>('create');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ticket, setTicket] = useState<TicketItem[]>([]);
  const [historyOrders, setHistoryOrders] = useState<HistoryOrder[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string | null>(null);
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState<string | null>(null);
  const [historyDateRange, setHistoryDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [historyUserFilter, setHistoryUserFilter] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [addToOrderId, setAddToOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('NAME');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quickQty, setQuickQty] = useState(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomNumber, setRoomNumber] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setHistoryOrders(res.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Network Error',
        message: 'Could not sync order history with the server.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data || []);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  }, []);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/menu/item');
      setMenuItems(res.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Menu Sync Failed',
        message: 'Could not load current offerings from the database.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'create') {
      fetchMenu();
      fetchRooms();
    } else {
      fetchHistory();
    }
  }, [view, fetchHistory, fetchMenu, fetchRooms]);

  const addToTicket = useCallback((item: MenuItem, qty = 1) => {
    setTicket((curr) => [...curr, { item, qty, note: '' }]);
  }, []);

  const updateQty = (index: number, qty: number) => {
    setTicket((curr) =>
      curr
        .map((x, i) => (i === index ? { ...x, qty } : x))
        .filter((x) => x.qty > 0)
    );
  };

  const updateNote = (index: number, note: string) => {
    setTicket((curr) =>
      curr.map((x, i) => (i === index ? { ...x, note } : x))
    );
  };

  const duplicateItem = (index: number) => {
    setTicket((curr) => {
      const item = curr[index];
      const newItems = [...curr];
      newItems.splice(index + 1, 0, { ...item, qty: 1 });
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setTicket((curr) => curr.filter((_, i) => i !== index));
  };

  const clearTicket = () => {
    if (ticket.length === 0) return;
    modals.openConfirmModal({
      title: 'Clear Current Ticket',
      children: (
        <Text size="sm">
          Are you sure you want to discard all items currently in the ticket? This cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Discard Ticket', cancel: 'Keep Items' },
      confirmProps: { color: 'red' },
      onConfirm: () => setTicket([]),
    });
  };

  const subtotal = useMemo(() => ticket.reduce((sum, x) => sum + x.item.price * x.qty, 0), [ticket]);
  const itemCount = useMemo(() => ticket.reduce((sum, x) => sum + x.qty, 0), [ticket]);

  const submitOrder = async () => {
    if (!ticket.length) return;

    modals.openConfirmModal({
      title: addToOrderId ? 'Confirm Addition' : 'Confirm Order',
      children: (
        <Stack gap="xs">
          <Text size="sm">
            {addToOrderId 
              ? `Add these items to Order #${addToOrderId}?` 
              : `Submit this order for ${roomNumber ? `Room ${roomNumber}` : (tableNumber || 'Takeaway')}?`}
          </Text>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">{itemCount} items</Text>
            <Text fw={700} c="blue">{formatCurrency(subtotal)}</Text>
          </Group>
        </Stack>
      ),
      labels: { confirm: addToOrderId ? 'Add Items' : 'Submit Order', cancel: 'Wait' },
      confirmProps: { color: 'green' },
      onConfirm: async () => {
        setSubmitting(true);
        try {
          if (addToOrderId) {
            await api.post(`/orders/${addToOrderId}/items`, {
              items: ticket.map((x) => ({ menuItemId: x.item.id, quantity: x.qty, notes: x.note })),
            });
            notifications.show({
              title: 'Items Added',
              message: `Order #${addToOrderId} has been updated.`,
              color: 'teal',
              icon: <IconCheck size={16} />,
            });
            setTicket([]);
            setTableNumber(null);
            setAddToOrderId(null);
            setView('history');
          } else {
            await api.post('/orders', {
              tableNumber: roomNumber ? `Room ${roomNumber}` : (tableNumber || null),
              items: ticket.map((x) => ({ menuItemId: x.item.id, quantity: x.qty, notes: x.note })),
            });
            notifications.show({
              title: 'Order Sent',
              message: `New order for ${tableNumber || 'Takeaway'} dispatched to kitchen.`,
              color: 'teal',
              icon: <IconCheck size={16} />,
            });
            setTicket([]);
            setTableNumber(null);
            setRoomNumber(null);
          }
        } catch (err: any) {
          console.error(err);
          notifications.show({
            title: 'Submission Failed',
            message: err.response?.data?.message || 'The kitchen is not responding. Please try again.',
            color: 'red',
            icon: <IconX size={16} />,
          });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const cancelOrder = async (id: number) => {
    modals.openConfirmModal({
      title: 'Cancel Order',
      children: (
        <Text size="sm">
          Are you sure you want to cancel Order #{id}? All recorded stock for this order will be returned to inventory. This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Yes, Cancel Order', cancel: 'No, Keep It' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/orders/${id}`);
          notifications.show({
            title: 'Order Cancelled',
            message: `Order #${id} has been voided. Stock levels updated.`,
            color: 'gray',
          });
          fetchHistory();
        } catch (err: any) {
          notifications.show({
            title: 'Error',
            message: err.response?.data?.message || 'Failed to cancel order.',
            color: 'red',
          });
        }
      },
    });
  };

  const types = useMemo(() => ['ALL', ...Array.from(new Set(menuItems.map((m) => m.type)))], [menuItems]);

  const filteredMenu = useMemo(() => {
    return [...menuItems]
      .filter((m) => {
        const matchesTab = activeTab === 'ALL' || m.type === activeTab;
        const search = searchQuery.toLowerCase();
        const matchesSearch =
          m.name.toLowerCase().includes(search) ||
          m.category?.name?.toLowerCase().includes(search) ||
          m.type.toLowerCase().includes(search);
        return matchesTab && matchesSearch;
      })
      .sort((a, b) => {
        if (sortMode === 'PRICE_ASC') return a.price - b.price;
        if (sortMode === 'PRICE_DESC') return b.price - a.price;
        return a.name.localeCompare(b.name);
      });
  }, [menuItems, activeTab, searchQuery, sortMode]);

  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    historyOrders.forEach((o) => {
      if (o.user?.name) users.add(o.user.name);
    });
    return Array.from(users).sort();
  }, [historyOrders]);

  const filteredHistory = useMemo(() => {
    return historyOrders.filter((o) => {
      const statusMatch = historyStatusFilter ? o.status === historyStatusFilter : true;
      const paymentMatch = historyPaymentFilter ? o.paymentStatus === historyPaymentFilter : true;
      const userMatch = historyUserFilter ? o.user?.name === historyUserFilter : true;

      let dateMatch = true;
      if (historyDateRange[0] || historyDateRange[1]) {
        const oDate = new Date(o.createdAt);
        // Reset time for start/end boundaries
        if (historyDateRange[0]) {
          const start = new Date(historyDateRange[0]);
          start.setHours(0, 0, 0, 0);
          if (oDate < start) dateMatch = false;
        }
        if (historyDateRange[1]) {
          const end = new Date(historyDateRange[1]);
          end.setHours(23, 59, 59, 999);
          if (oDate > end) dateMatch = false;
        }
      }

      const searchLower = historySearch.toLowerCase();
      const searchMatch = historySearch
        ? ((o.tableNumber && o.tableNumber.toLowerCase().includes(searchLower)) ||
          o.id.toString().includes(searchLower))
        : true;
      return statusMatch && searchMatch && paymentMatch && dateMatch && userMatch;
    });
  }, [historyOrders, historyStatusFilter, historySearch, historyPaymentFilter, historyDateRange, historyUserFilter]);

  const paginatedHistory = useMemo(
    () => filteredHistory.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE),
    [filteredHistory, historyPage]
  );

  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);

  const historyStats = useMemo(() => {
    const pending = filteredHistory.filter((o) => o.paymentStatus !== 'PAID').length;
    const paid = filteredHistory.filter((o) => o.paymentStatus === 'PAID').length;
    const sales = filteredHistory.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    return { total: filteredHistory.length, pending, paid, sales };
  }, [filteredHistory]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>{view === 'create' ? 'Order Desk' : 'Order History'}</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {view === 'create'
              ? 'Create new orders quickly, manage a live ticket, and keep waiter workflow efficient.'
              : 'Review previously submitted orders, item-level progress, and payment state.'}
          </Text>
        </div>

        <Group>
          <Button
            variant={view === 'create' ? 'filled' : 'light'}
            leftSection={<IconShoppingCart size="1rem" />}
            onClick={() => { setView('create'); setAddToOrderId(null); setTicket([]); }}
          >
            New Order
          </Button>
          <Button
            variant={view === 'history' ? 'filled' : 'light'}
            leftSection={<IconHistory size="1rem" />}
            onClick={() => setView('history')}
            color="indigo"
          >
            History
          </Button>
          <Tooltip label="Refresh current view">
            <ActionIcon variant="light" size="lg" onClick={() => (view === 'create' ? fetchMenu() : fetchHistory())}>
              <IconRefresh size="1rem" />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {success && (
        <Notification icon={<IconCheck size={18} />} color="green" radius="md" onClose={() => setSuccess(false)}>
          Order submitted successfully.
        </Notification>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md" withCloseButton onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {view === 'create' ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            <StatCard
              label="Menu Items"
              value={String(menuItems.length)}
              helper="Available products to order"
              color="blue"
              icon={<IconList size={20} />}
            />
            <StatCard
              label="Ticket Items"
              value={String(itemCount)}
              helper="Total quantity in current ticket"
              color="green"
              icon={<IconShoppingCart size={20} />}
            />
            <StatCard
              label="Subtotal"
              value={formatCurrency(subtotal)}
              helper="Live total before submission"
              color="violet"
              icon={<IconReceipt2 size={20} />}
            />
            <StatCard
              label="Last Updated"
              value={lastUpdated ? formatTime(lastUpdated.toISOString()) : '—'}
              helper="Latest menu sync time"
              color="cyan"
              icon={<IconRefresh size={20} />}
            />
          </SimpleGrid>

          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card withBorder radius="lg" p="md" shadow="xs">
                <Group justify="space-between" mb="md" wrap="wrap">
                  <Tabs value={activeTab} onChange={setActiveTab} style={{ flex: 1, minWidth: 280 }}>
                    <Tabs.List>
                      {types.map((t) => (
                        <Tabs.Tab key={t} value={t}>
                          {t.replace('_', ' ')}
                        </Tabs.Tab>
                      ))}
                    </Tabs.List>
                  </Tabs>

                  <Group>
                    <TextInput
                      placeholder="Search menu, category, type..."
                      leftSection={<IconSearch size="0.9rem" />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      miw={220}
                    />
                    <SegmentedControl
                      value={sortMode}
                      onChange={(value) => setSortMode(value as SortMode)}
                      data={[
                        { label: 'Name', value: 'NAME' },
                        { label: 'Low Price', value: 'PRICE_ASC' },
                        { label: 'High Price', value: 'PRICE_DESC' },
                      ]}
                    />
                  </Group>
                </Group>

                {loading ? (
                  <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }}>
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} height={180} radius="lg" />
                    ))}
                  </SimpleGrid>
                ) : filteredMenu.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    No items found for the current filters.
                  </Text>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }}>
                    {filteredMenu.map((item) => (
                      <Card key={item.id} shadow="sm" padding="lg" radius="lg" withBorder>
                        <Group justify="space-between" mb="xs" align="flex-start">
                          <div style={{ flex: 1 }}>
                            <Text fw={700} size="md" lineClamp={1}>
                              {item.name}
                            </Text>
                            <Text size="xs" c="dimmed" mt={4}>
                              {item.category?.name || 'Uncategorized'}
                            </Text>
                          </div>
                          <Badge size="sm" color={typeColor[item.type] ?? 'gray'} variant="light">
                            {item.type}
                          </Badge>
                        </Group>

                        <Group justify="space-between" mb="sm">
                          <Text size="xl" fw={800} c="blue">
                            {formatCurrency(item.price)}
                          </Text>
                          {item.trackStock && (
                            <Badge
                              variant="dot"
                              color={item.stockQuantity === 0 ? 'red' : item.stockQuantity < 5 ? 'orange' : 'teal'}
                            >
                              {item.stockQuantity === 0 ? 'Out of Stock' : `${item.stockQuantity} in Stock`}
                            </Badge>
                          )}
                        </Group>

                        {!item.available || (item.trackStock && item.stockQuantity === 0) ? (
                          <Button color="gray" fullWidth mt="sm" disabled>
                            Out of Stock
                          </Button>
                        ) : (
                          <Button
                            color="blue"
                            fullWidth
                            mt="sm"
                            leftSection={<IconPlus size="0.8rem" />}
                            onClick={() => addToTicket(item)}
                          >
                            Add to Ticket
                          </Button>
                        )}
                      </Card>
                    ))}
                  </SimpleGrid>
                )}
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper withBorder p="md" radius="lg" shadow="sm" pos="sticky" style={{ top: 16 }}>
                <Group justify="space-between" mb="md">
                  <Title order={4}>{addToOrderId ? `Adding to Order #${addToOrderId}` : 'Current Ticket'}</Title>
                  {ticket.length > 0 && (
                    <Button variant="subtle" color="red" size="xs" leftSection={<IconTrash size={14} />} onClick={clearTicket}>
                      Clear
                    </Button>
                  )}
                </Group>

                <Select
                  label="Table Number"
                  placeholder="Select table..."
                  data={TABLE_OPTIONS}
                  value={tableNumber}
                  onChange={(val) => {
                    setTableNumber(val);
                    if (val) setRoomNumber(null);
                  }}
                  mb="xs"
                  clearable
                  disabled={!!addToOrderId}
                  description={addToOrderId ? "Table is locked" : undefined}
                />

                <Select
                  label="Room Order (Room Service)"
                  placeholder="Select a room..."
                  data={rooms
                    .filter(r => r.status === 'OCCUPIED' || r.status === 'RESERVED')
                    .map(r => ({ value: r.number, label: `Room ${r.number} (${r.type})` }))}
                  value={roomNumber}
                  onChange={(val) => {
                    setRoomNumber(val);
                    if (val) setTableNumber(null);
                  }}
                  mb="md"
                  clearable
                  disabled={!!addToOrderId}
                />

                {ticket.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl" size="sm">
                    Select menu items to build a ticket.
                  </Text>
                ) : (
                  <Stack gap="sm">
                    {ticket.map((x, index) => (
                      <Paper key={`${x.item.id}-${index}`} withBorder radius="md" p="sm">
                        <Group justify="space-between" mb={6} align="flex-start">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={700} lineClamp={1}>
                              {x.item.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {formatCurrency(x.item.price)} each
                            </Text>
                          </div>
                          <Group gap="xs">
                            <Tooltip label="Duplicate row (e.g. to split cold/normal)">
                              <ActionIcon size="sm" color="blue" variant="subtle" onClick={() => duplicateItem(index)}>
                                <IconPlus size="0.8rem" />
                              </ActionIcon>
                            </Tooltip>
                            <Text fw={700} c="blue">
                              {formatCurrency(x.item.price * x.qty)}
                            </Text>
                          </Group>
                        </Group>

                        <Group justify="space-between">
                          <Group gap="xs">
                            <ActionIcon size="sm" variant="light" onClick={() => updateQty(index, x.qty - 1)}>
                              <IconMinus size="0.8rem" />
                            </ActionIcon>
                            <NumberInput
                              value={x.qty}
                              onChange={(value) => updateQty(index, Number(value) || 1)}
                              min={1}
                              hideControls
                              styles={{ input: { width: 44, textAlign: 'center', paddingLeft: 4, paddingRight: 4 } }}
                            />
                            <ActionIcon size="sm" variant="light" onClick={() => updateQty(index, x.qty + 1)}>
                              <IconPlus size="0.8rem" />
                            </ActionIcon>
                          </Group>

                          <TextInput
                            placeholder="Instruction (e.g. Cold)"
                            size="xs"
                            variant="filled"
                            style={{ flex: 1, margin: '0 8px' }}
                            value={x.note || ''}
                            onChange={(e) => updateNote(index, e.target.value)}
                          />

                          <ActionIcon size="sm" color="red" variant="subtle" onClick={() => removeItem(index)}>
                            <IconTrash size="0.8rem" />
                          </ActionIcon>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                )}

                <Divider my="md" />

                <Group justify="space-between" mb={8}>
                  <Text size="sm" c="dimmed">
                    Item count
                  </Text>
                  <Text fw={700}>{itemCount}</Text>
                </Group>
                <Group justify="space-between" mb="md">
                  <Title order={3}>Total</Title>
                  <Title order={3} c="blue">
                    {formatCurrency(subtotal)}
                  </Title>
                </Group>

                <Button fullWidth size="lg" disabled={ticket.length === 0} color="green" loading={submitting} onClick={submitOrder}>
                  Submit Order
                </Button>
              </Paper>
            </Grid.Col>
          </Grid>
        </>
      ) : (
        <>
          {isAdmin && (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
              <StatCard
                label="Orders"
                value={String(historyStats.total)}
                helper="All tracked orders"
                color="blue"
                icon={<IconHistory size={20} />}
              />
              <StatCard
                label="Paid Orders"
                value={String(historyStats.paid)}
                helper="Orders already settled"
                color="teal"
                icon={<IconCheck size={20} />}
              />
              <StatCard
                label="Unpaid Orders"
                value={String(historyStats.pending)}
                helper="Awaiting cashier completion"
                color="orange"
                icon={<IconAlertCircle size={20} />}
              />
              <StatCard
                label="Recorded Value"
                value={formatCurrency(historyStats.sales)}
                helper="Total order value in history"
                color="violet"
                icon={<IconReceipt2 size={20} />}
              />
            </SimpleGrid>
          )}

          <Paper withBorder radius="lg" p="md" shadow="sm">
            <Group justify="space-between" mb="md" wrap="wrap">
              <Group>
                <TextInput
                  placeholder="Search ID or table..."
                  leftSection={<IconSearch size="0.9rem" />}
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  miw={180}
                />
                <DatePickerInput
                  type="range"
                  placeholder="Pick dates range"
                  value={historyDateRange}
                  onChange={(val) => {
                    setHistoryDateRange(val as [Date | null, Date | null]);
                    setHistoryPage(1);
                  }}
                  clearable
                  miw={220}
                />
                <Select
                  placeholder="Waitstaff"
                  data={uniqueUsers}
                  value={historyUserFilter}
                  onChange={(val) => {
                    setHistoryUserFilter(val);
                    setHistoryPage(1);
                  }}
                  clearable
                  miw={140}
                />
                <Select
                  placeholder="Payment"
                  data={['PAID', 'UNPAID']}
                  value={historyPaymentFilter}
                  onChange={(val) => {
                    setHistoryPaymentFilter(val);
                    setHistoryPage(1);
                  }}
                  clearable
                  miw={120}
                />
                <Select
                  placeholder="Status"
                  data={['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']}
                  value={historyStatusFilter}
                  onChange={(val) => {
                    setHistoryStatusFilter(val);
                    setHistoryPage(1);
                  }}
                  clearable
                  miw={140}
                />
              </Group>
              <Group>
                <Text size="sm" c="dimmed">
                  {lastUpdated ? `Last updated ${formatTime(lastUpdated.toISOString())}` : ''}
                </Text>
                {totalPages > 1 && <Pagination value={historyPage} onChange={setHistoryPage} total={totalPages} />}
              </Group>
            </Group>

            {loading ? (
              <Skeleton height={260} radius="lg" />
            ) : historyOrders.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                You have no active or past orders.
              </Text>
            ) : (
              <ScrollArea>
                <Table striped highlightOnHover verticalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>ID</Table.Th>
                      <Table.Th>Table & Waiter</Table.Th>
                      <Table.Th>Items & Timeline</Table.Th>
                      <Table.Th>Age</Table.Th>
                      {isAdmin && <Table.Th>Total</Table.Th>}
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {paginatedHistory.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={6} ta="center" py="xl" c="dimmed">
                          No orders match your filters.
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      paginatedHistory.map((order) => (
                        <Table.Tr key={order.id}>
                          <Table.Td fw={700}>#{order.id}</Table.Td>
                          <Table.Td>
                            <Text fw={600}>{order.tableNumber || 'N/A'}</Text>
                            {order.user && (
                              <Text size="xs" c="dimmed" mt={2}>
                                Waiter: {order.user.name}
                              </Text>
                            )}
                            {order.cashier && (
                              <Badge size="xs" color="violet" variant="light" mt={4}>
                                Paid to: {order.cashier.name}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Stack gap="xs">
                              {order.items.map((i) => (
                                <Paper key={i.id} p="xs" radius="md" withBorder bg="gray.0">
                                  <Group justify="space-between" mb={2}>
                                    <Text size="sm" fw={600}>
                                      {i.quantity}x {i.menuItem.name}
                                    </Text>
                                    <Badge size="xs" color={statusColor[i.status] ?? 'gray'} variant="light">
                                      {i.status}
                                    </Badge>
                                  </Group>
                                  <Text size="xs" c="dimmed">
                                    Ordered: {formatTime(i.createdAt)}
                                    {i.preparingAt && ` · Prep: ${formatTime(i.preparingAt)}`}
                                    {i.readyAt && ` · Ready: ${formatTime(i.readyAt)}`}
                                    {i.deliveredAt && ` · Delivered: ${formatTime(i.deliveredAt)}`}
                                  </Text>
                                  {i.preparedBy && (
                                    <Text size="xs" c="green" fw={600} mt={2}>
                                      Prepared by: {i.preparedBy.name}
                                    </Text>
                                  )}
                                  {i.notes && (
                                    <Text size="xs" c="orange.8" fw={700} mt={2}>
                                      Note: {i.notes}
                                    </Text>
                                  )}
                                </Paper>
                              ))}
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light" color={getMinutesSince(order.createdAt) > 60 ? 'orange' : 'blue'}>
                              {getMinutesSince(order.createdAt)} min
                            </Badge>
                          </Table.Td>
                          {isAdmin && <Table.Td fw={700}>{formatCurrency(order.totalAmount)}</Table.Td>}
                          <Table.Td>
                            <Stack gap={4}>
                              <Badge color={statusColor[order.status] ?? 'orange'} variant="light">
                                {order.status}
                              </Badge>
                              <Badge color={order.paymentStatus === 'PAID' ? 'teal' : 'red'} variant="light">
                                {order.paymentStatus}
                              </Badge>
                              {order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED' && (
                                <Group gap={4}>
                                  <Button
                                    variant="light"
                                    color="indigo"
                                    size="xs"
                                    leftSection={<IconPlus size={12} />}
                                    onClick={() => {
                                      setAddToOrderId(order.id);
                                      setTableNumber(order.tableNumber);
                                      setView('create');
                                    }}
                                  >
                                    Add Items
                                  </Button>
                                  <Button
                                    variant="subtle"
                                    color="red"
                                    size="xs"
                                    leftSection={<IconTrash size={12} />}
                                    onClick={() => cancelOrder(order.id)}
                                  >
                                    Cancel
                                  </Button>
                                </Group>
                              )}
                            </Stack>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Paper>
        </>
      )}

      <Modal opened={!!selectedItem} onClose={() => setSelectedItem(null)} title="Menu Item Details" centered radius="lg">
        {selectedItem && (
          <Stack gap="md">
            <Paper withBorder radius="md" p="md">
              <Group justify="space-between" mb={8}>
                <div>
                  <Text fw={700} size="lg">
                    {selectedItem.name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {selectedItem.category?.name || 'Uncategorized'}
                  </Text>
                </div>
                <Badge color={typeColor[selectedItem.type] ?? 'gray'} variant="light">
                  {selectedItem.type}
                </Badge>
              </Group>
              <Text size="xl" fw={800} c="blue">
                {formatCurrency(selectedItem.price)}
              </Text>
            </Paper>

            <NumberInput
              label="Quantity"
              min={1}
              value={quickQty}
              onChange={(value) => setQuickQty(Number(value) || 1)}
            />

            <Progress value={Math.min((quickQty / 10) * 100, 100)} radius="xl" />

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setSelectedItem(null)}>
                Close
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  addToTicket(selectedItem, quickQty);
                  setSelectedItem(null);
                  setQuickQty(1);
                }}
              >
                Add to Ticket
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
